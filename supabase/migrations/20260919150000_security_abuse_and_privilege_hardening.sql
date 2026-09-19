-- Public abuse controls, engagement integrity, explicit deny policies.
-- Designed to preserve the existing public API while wrapping anonymous write paths.

create schema if not exists private;

create table if not exists private.security_runtime_secrets (
  key text primary key,
  secret bytea not null,
  created_at timestamptz not null default now()
);
alter table private.security_runtime_secrets enable row level security;
revoke all on table private.security_runtime_secrets from public, anon, authenticated;

insert into private.security_runtime_secrets(key, secret)
values ('public_abuse_hmac', extensions.gen_random_bytes(32))
on conflict (key) do nothing;

create table if not exists private.public_api_rate_events (
  id bigint generated always as identity primary key,
  action text not null,
  ip_fingerprint bytea not null,
  subject_fingerprint bytea,
  created_at timestamptz not null default now()
);
alter table private.public_api_rate_events enable row level security;
revoke all on table private.public_api_rate_events from public, anon, authenticated;
revoke all on sequence private.public_api_rate_events_id_seq from public, anon, authenticated;
create index if not exists public_api_rate_events_ip_idx
  on private.public_api_rate_events(action, ip_fingerprint, created_at desc);
create index if not exists public_api_rate_events_subject_idx
  on private.public_api_rate_events(action, subject_fingerprint, created_at desc)
  where subject_fingerprint is not null;

create table if not exists private.public_engagement_dedupe (
  action text not null,
  report_id text not null,
  actor_fingerprint bytea not null,
  bucket_start timestamptz not null,
  created_at timestamptz not null default now(),
  primary key(action, report_id, actor_fingerprint, bucket_start)
);
alter table private.public_engagement_dedupe enable row level security;
revoke all on table private.public_engagement_dedupe from public, anon, authenticated;
create index if not exists public_engagement_dedupe_created_idx
  on private.public_engagement_dedupe(created_at desc);

create or replace function private.public_abuse_hmac(p_material text)
returns bytea
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'private', 'extensions'
as $function$
declare
  v_secret bytea;
begin
  select s.secret into v_secret
  from private.security_runtime_secrets s
  where s.key = 'public_abuse_hmac';

  if v_secret is null then
    raise exception 'SECURITY_CONFIGURATION_ERROR';
  end if;

  return extensions.hmac(
    pg_catalog.convert_to(coalesce(p_material, ''), 'UTF8'),
    v_secret,
    'sha256'
  );
end;
$function$;
revoke all on function private.public_abuse_hmac(text) from public, anon, authenticated;

create or replace function private.public_request_ip_fingerprint()
returns bytea
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'private'
as $function$
declare
  v_headers jsonb := '{}'::jsonb;
  v_raw text;
  v_ip text;
begin
  begin
    v_raw := current_setting('request.headers', true);
    if v_raw is not null and btrim(v_raw) <> '' then
      v_headers := v_raw::jsonb;
    end if;
  exception when others then
    v_headers := '{}'::jsonb;
  end;

  v_ip := nullif(
    btrim(
      split_part(
        coalesce(
          v_headers->>'x-forwarded-for',
          v_headers->>'cf-connecting-ip',
          v_headers->>'x-real-ip',
          ''
        ),
        ',',
        1
      )
    ),
    ''
  );

  return private.public_abuse_hmac('ip:' || coalesce(v_ip, 'unavailable'));
end;
$function$;
revoke all on function private.public_request_ip_fingerprint() from public, anon, authenticated;

create or replace function private.public_subject_fingerprint(p_subject text)
returns bytea
language sql
stable
security definer
set search_path to 'pg_catalog', 'private'
as $function$
  select case
    when nullif(btrim(coalesce(p_subject, '')), '') is null then null
    else private.public_abuse_hmac('subject:' || btrim(p_subject))
  end;
$function$;
revoke all on function private.public_subject_fingerprint(text) from public, anon, authenticated;

create or replace function private.public_actor_fingerprint(p_subject text)
returns bytea
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'private'
as $function$
declare
  v_ip bytea;
  v_subject bytea;
begin
  v_ip := private.public_request_ip_fingerprint();
  v_subject := private.public_subject_fingerprint(p_subject);

  if v_subject is null then
    return private.public_abuse_hmac('actor:' || encode(v_ip, 'hex'));
  end if;

  return private.public_abuse_hmac(
    'actor:' || encode(v_ip, 'hex') || ':' || encode(v_subject, 'hex')
  );
end;
$function$;
revoke all on function private.public_actor_fingerprint(text) from public, anon, authenticated;

create or replace function private.enforce_public_rate_limit(
  p_action text,
  p_subject text,
  p_ip_limit integer,
  p_subject_limit integer,
  p_window interval
)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog', 'private'
as $function$
declare
  v_action text := left(btrim(coalesce(p_action, '')), 120);
  v_ip bytea;
  v_subject bytea;
  v_count integer;
  v_retry_seconds integer;
begin
  if v_action = '' or p_ip_limit is null or p_ip_limit < 1 or p_window is null or p_window <= interval '0 seconds' then
    raise exception 'SECURITY_CONFIGURATION_ERROR: invalid public rate limit configuration.';
  end if;

  v_ip := private.public_request_ip_fingerprint();
  v_subject := private.public_subject_fingerprint(p_subject);
  v_retry_seconds := greatest(1, ceil(extract(epoch from p_window))::integer);

  perform pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_action || ':ip:' || encode(v_ip, 'hex'), 0)
  );

  select count(*)::integer into v_count
  from private.public_api_rate_events e
  where e.action = v_action
    and e.ip_fingerprint = v_ip
    and e.created_at >= now() - p_window;

  if v_count >= p_ip_limit then
    raise sqlstate 'PGRST' using
      message = jsonb_build_object(
        'code', 'RATE_LIMITED',
        'message', 'Too many requests. Please try again later.',
        'details', null,
        'hint', 'Wait before retrying this action.'
      )::text,
      detail = jsonb_build_object(
        'status', 429,
        'headers', jsonb_build_object('Retry-After', v_retry_seconds::text)
      )::text;
  end if;

  if v_subject is not null and p_subject_limit is not null and p_subject_limit > 0 then
    perform pg_advisory_xact_lock(
      pg_catalog.hashtextextended(v_action || ':subject:' || encode(v_subject, 'hex'), 0)
    );

    select count(*)::integer into v_count
    from private.public_api_rate_events e
    where e.action = v_action
      and e.subject_fingerprint = v_subject
      and e.created_at >= now() - p_window;

    if v_count >= p_subject_limit then
      raise sqlstate 'PGRST' using
        message = jsonb_build_object(
          'code', 'RATE_LIMITED',
          'message', 'Too many requests. Please try again later.',
          'details', null,
          'hint', 'Wait before retrying this action.'
        )::text,
        detail = jsonb_build_object(
          'status', 429,
          'headers', jsonb_build_object('Retry-After', v_retry_seconds::text)
        )::text;
    end if;
  end if;

  insert into private.public_api_rate_events(
    action, ip_fingerprint, subject_fingerprint, created_at
  ) values (
    v_action, v_ip, v_subject, now()
  );
end;
$function$;
revoke all on function private.enforce_public_rate_limit(text, text, integer, integer, interval)
  from public, anon, authenticated;

create or replace function private.claim_public_engagement_slot(
  p_action text,
  p_report_id text,
  p_subject text,
  p_interval interval
)
returns boolean
language plpgsql
security definer
set search_path to 'pg_catalog', 'private'
as $function$
declare
  v_actor bytea;
  v_bucket timestamptz;
  v_rows integer := 0;
begin
  if p_action not in ('view', 'share') then
    raise exception 'SECURITY_CONFIGURATION_ERROR: invalid engagement action.';
  end if;
  if p_interval is null or p_interval <= interval '0 seconds' then
    raise exception 'SECURITY_CONFIGURATION_ERROR: invalid engagement interval.';
  end if;

  v_actor := private.public_actor_fingerprint(p_subject);
  v_bucket := date_bin(p_interval, now(), timestamptz '2000-01-01 00:00:00+00');

  insert into private.public_engagement_dedupe(
    action, report_id, actor_fingerprint, bucket_start, created_at
  ) values (
    p_action,
    upper(btrim(p_report_id)),
    v_actor,
    v_bucket,
    now()
  )
  on conflict do nothing;

  get diagnostics v_rows = row_count;
  return v_rows = 1;
end;
$function$;
revoke all on function private.claim_public_engagement_slot(text, text, text, interval)
  from public, anon, authenticated;

create or replace function private.prune_public_security_events()
returns void
language plpgsql
security definer
set search_path to 'pg_catalog', 'private'
as $function$
begin
  delete from private.public_api_rate_events
  where created_at < now() - interval '2 days';

  delete from private.public_engagement_dedupe
  where created_at < now() - interval '2 days';
end;
$function$;
revoke all on function private.prune_public_security_events() from public, anon, authenticated;

alter function public.submit_public_complaint(jsonb, text, jsonb)
  rename to submit_public_complaint_internal;
alter function public.submit_public_configured_complaint(jsonb, text, jsonb)
  rename to submit_public_configured_complaint_internal;
alter function public.submit_public_response(text, text, jsonb)
  rename to submit_public_response_internal;
alter function public.record_public_visit_session(
  text, text, text, numeric, numeric, numeric,
  text, text, text, text, text, text, text, integer, integer, text
) rename to record_public_visit_session_internal;
alter function public.track_public_report_view(text)
  rename to track_public_report_view_internal;
alter function public.track_public_report_share(text)
  rename to track_public_report_share_internal;

revoke all on function public.submit_public_complaint_internal(jsonb, text, jsonb) from public, anon, authenticated;
revoke all on function public.submit_public_configured_complaint_internal(jsonb, text, jsonb) from public, anon, authenticated;
revoke all on function public.submit_public_response_internal(text, text, jsonb) from public, anon, authenticated;
revoke all on function public.record_public_visit_session_internal(
  text, text, text, numeric, numeric, numeric,
  text, text, text, text, text, text, text, integer, integer, text
) from public, anon, authenticated;
revoke all on function public.track_public_report_view_internal(text) from public, anon, authenticated;
revoke all on function public.track_public_report_share_internal(text) from public, anon, authenticated;

create or replace function public.submit_public_complaint(
  p_payload jsonb,
  p_client_submission_id text,
  p_reporter_context jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
declare
  v_subject text;
begin
  v_subject := coalesce(
    nullif(btrim(coalesce(p_reporter_context->>'visitor_id', p_reporter_context->>'visitorId')), ''),
    nullif(btrim(coalesce(p_payload->'reporterContext'->>'visitor_id', p_payload->'reporterContext'->>'visitorId')), ''),
    nullif(btrim(p_client_submission_id), '')
  );

  perform private.enforce_public_rate_limit(
    'public_report_submit', v_subject, 30, 8, interval '1 hour'
  );

  return public.submit_public_complaint_internal(
    p_payload, p_client_submission_id, p_reporter_context
  );
end;
$function$;
revoke all on function public.submit_public_complaint(jsonb, text, jsonb) from public;
revoke execute on function public.submit_public_complaint(jsonb, text, jsonb) from anon, authenticated;

create or replace function public.submit_public_configured_complaint(
  p_payload jsonb,
  p_client_submission_id text,
  p_reporter_context jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
declare
  v_subject text;
begin
  v_subject := coalesce(
    nullif(btrim(coalesce(p_reporter_context->>'visitor_id', p_reporter_context->>'visitorId')), ''),
    nullif(btrim(coalesce(p_payload->'reporterContext'->>'visitor_id', p_payload->'reporterContext'->>'visitorId')), ''),
    nullif(btrim(p_client_submission_id), '')
  );

  perform private.enforce_public_rate_limit(
    'public_report_submit', v_subject, 30, 8, interval '1 hour'
  );

  return public.submit_public_configured_complaint_internal(
    p_payload, p_client_submission_id, p_reporter_context
  );
end;
$function$;
revoke all on function public.submit_public_configured_complaint(jsonb, text, jsonb) from public;
grant execute on function public.submit_public_configured_complaint(jsonb, text, jsonb) to anon, authenticated;

create or replace function public.submit_public_response(
  p_report_id text,
  p_response_type text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
declare
  v_report_id text := upper(btrim(coalesce(p_report_id, '')));
  v_subject text;
begin
  v_subject := nullif(btrim(coalesce(p_payload->>'visitorId', p_payload->>'visitor_id', '')), '');

  perform private.enforce_public_rate_limit(
    'public_response', v_subject, 60, 30, interval '1 hour'
  );
  perform private.enforce_public_rate_limit(
    'public_response:' || left(v_report_id, 64), v_subject, 12, 6, interval '1 hour'
  );

  return public.submit_public_response_internal(
    p_report_id, p_response_type, p_payload
  );
end;
$function$;
revoke all on function public.submit_public_response(text, text, jsonb) from public;
grant execute on function public.submit_public_response(text, text, jsonb) to anon, authenticated;

create or replace function public.record_public_visit_session(
  p_visitor_id text,
  p_session_id text,
  p_permission_status text,
  p_latitude numeric default null,
  p_longitude numeric default null,
  p_accuracy_meters numeric default null,
  p_browser_name text default null,
  p_browser_version text default null,
  p_os_name text default null,
  p_device_category text default null,
  p_platform text default null,
  p_language text default null,
  p_timezone text default null,
  p_screen_width integer default null,
  p_screen_height integer default null,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
begin
  perform private.enforce_public_rate_limit(
    'public_visit_session', p_visitor_id, 240, 60, interval '1 hour'
  );

  return public.record_public_visit_session_internal(
    p_visitor_id, p_session_id, p_permission_status,
    p_latitude, p_longitude, p_accuracy_meters,
    p_browser_name, p_browser_version, p_os_name, p_device_category,
    p_platform, p_language, p_timezone, p_screen_width, p_screen_height, p_user_agent
  );
end;
$function$;
revoke all on function public.record_public_visit_session(
  text, text, text, numeric, numeric, numeric,
  text, text, text, text, text, text, text, integer, integer, text
) from public;
grant execute on function public.record_public_visit_session(
  text, text, text, numeric, numeric, numeric,
  text, text, text, text, text, text, text, integer, integer, text
) to anon, authenticated;

create or replace function public.track_public_report_view(p_report_id text)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
declare
  v_id text := upper(btrim(coalesce(p_report_id, '')));
  v_view_count bigint;
  v_share_count bigint;
begin
  if not exists (
    select 1 from public.complaints c
    where upper(c.id) = v_id and c.status = 'published'
  ) then
    return null;
  end if;

  perform private.enforce_public_rate_limit(
    'engagement_view', null, 300, null, interval '1 hour'
  );

  if private.claim_public_engagement_slot('view', v_id, null, interval '10 minutes') then
    return public.track_public_report_view_internal(v_id);
  end if;

  select c.public_view_count, c.public_share_count
  into v_view_count, v_share_count
  from public.complaints c
  where upper(c.id) = v_id and c.status = 'published';

  return jsonb_build_object(
    'viewCount', coalesce(v_view_count, 0),
    'shareCount', coalesce(v_share_count, 0)
  );
end;
$function$;
revoke all on function public.track_public_report_view(text) from public;
grant execute on function public.track_public_report_view(text) to anon, authenticated;

create or replace function public.track_public_report_share(p_report_id text)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
declare
  v_id text := upper(btrim(coalesce(p_report_id, '')));
  v_view_count bigint;
  v_share_count bigint;
begin
  if not exists (
    select 1 from public.complaints c
    where upper(c.id) = v_id and c.status = 'published'
  ) then
    return null;
  end if;

  perform private.enforce_public_rate_limit(
    'engagement_share', null, 120, null, interval '1 hour'
  );

  if private.claim_public_engagement_slot('share', v_id, null, interval '10 minutes') then
    return public.track_public_report_share_internal(v_id);
  end if;

  select c.public_view_count, c.public_share_count
  into v_view_count, v_share_count
  from public.complaints c
  where upper(c.id) = v_id and c.status = 'published';

  return jsonb_build_object(
    'viewCount', coalesce(v_view_count, 0),
    'shareCount', coalesce(v_share_count, 0)
  );
end;
$function$;
revoke all on function public.track_public_report_share(text) from public;
grant execute on function public.track_public_report_share(text) to anon, authenticated;

create or replace function public.track_public_report_view_v2(
  p_report_id text,
  p_visitor_id text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
declare
  v_id text := upper(btrim(coalesce(p_report_id, '')));
  v_visitor text := nullif(btrim(coalesce(p_visitor_id, '')), '');
  v_view_count bigint;
  v_share_count bigint;
begin
  if not exists (
    select 1 from public.complaints c
    where upper(c.id) = v_id and c.status = 'published'
  ) then
    return null;
  end if;

  perform private.enforce_public_rate_limit(
    'engagement_view', v_visitor, 300, 120, interval '1 hour'
  );

  if private.claim_public_engagement_slot('view', v_id, v_visitor, interval '10 minutes') then
    return public.track_public_report_view_internal(v_id);
  end if;

  select c.public_view_count, c.public_share_count
  into v_view_count, v_share_count
  from public.complaints c
  where upper(c.id) = v_id and c.status = 'published';

  return jsonb_build_object(
    'viewCount', coalesce(v_view_count, 0),
    'shareCount', coalesce(v_share_count, 0)
  );
end;
$function$;
revoke all on function public.track_public_report_view_v2(text, text) from public;
grant execute on function public.track_public_report_view_v2(text, text) to anon, authenticated;

create or replace function public.track_public_report_share_v2(
  p_report_id text,
  p_visitor_id text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
declare
  v_id text := upper(btrim(coalesce(p_report_id, '')));
  v_visitor text := nullif(btrim(coalesce(p_visitor_id, '')), '');
  v_view_count bigint;
  v_share_count bigint;
begin
  if not exists (
    select 1 from public.complaints c
    where upper(c.id) = v_id and c.status = 'published'
  ) then
    return null;
  end if;

  perform private.enforce_public_rate_limit(
    'engagement_share', v_visitor, 120, 40, interval '1 hour'
  );

  if private.claim_public_engagement_slot('share', v_id, v_visitor, interval '10 minutes') then
    return public.track_public_report_share_internal(v_id);
  end if;

  select c.public_view_count, c.public_share_count
  into v_view_count, v_share_count
  from public.complaints c
  where upper(c.id) = v_id and c.status = 'published';

  return jsonb_build_object(
    'viewCount', coalesce(v_view_count, 0),
    'shareCount', coalesce(v_share_count, 0)
  );
end;
$function$;
revoke all on function public.track_public_report_share_v2(text, text) from public;
grant execute on function public.track_public_report_share_v2(text, text) to anon, authenticated;

do $do$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='public_category_popularity_snapshot'
      and policyname='deny direct api access'
  ) then
    create policy "deny direct api access"
      on public.public_category_popularity_snapshot
      for all to anon, authenticated
      using (false) with check (false);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='reporting_form_schemas'
      and policyname='deny direct api access'
  ) then
    create policy "deny direct api access"
      on public.reporting_form_schemas
      for all to anon, authenticated
      using (false) with check (false);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='reporting_form_schema_fields'
      and policyname='deny direct api access'
  ) then
    create policy "deny direct api access"
      on public.reporting_form_schema_fields
      for all to anon, authenticated
      using (false) with check (false);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='site_banners'
      and policyname='deny direct api access'
  ) then
    create policy "deny direct api access"
      on public.site_banners
      for all to anon, authenticated
      using (false) with check (false);
  end if;
end
$do$;

do $do$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id from cron.job where jobname='public-security-event-retention';
  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;
  perform cron.schedule(
    'public-security-event-retention',
    '17 3 * * *',
    'select private.prune_public_security_events();'
  );
end
$do$;
