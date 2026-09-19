-- Security hardening: anonymous abuse controls and trustworthy engagement counters.
-- Applied to production as migration 20260919150808.

create table if not exists public.public_engagement_events (
  report_id text not null references public.complaints(id) on delete cascade,
  visitor_id text not null,
  session_id text not null,
  event_type text not null check (event_type in ('view','share')),
  event_day date not null default (now() at time zone 'utc')::date,
  created_at timestamptz not null default now(),
  primary key (report_id, visitor_id, event_type, event_day)
);
alter table public.public_engagement_events enable row level security;
revoke all on table public.public_engagement_events from anon, authenticated;
create index if not exists public_engagement_events_visitor_created_idx
  on public.public_engagement_events(visitor_id, created_at desc);
create index if not exists public_engagement_events_report_created_idx
  on public.public_engagement_events(report_id, event_type, created_at desc);

create table if not exists public.public_response_rate_events (
  id bigint generated always as identity primary key,
  report_id text not null references public.complaints(id) on delete cascade,
  visitor_id text not null,
  session_id text not null,
  response_type text not null check (response_type in ('citizen_information','subject_response')),
  created_at timestamptz not null default now()
);
alter table public.public_response_rate_events enable row level security;
revoke all on table public.public_response_rate_events from anon, authenticated;
create index if not exists public_response_rate_visitor_created_idx
  on public.public_response_rate_events(visitor_id, created_at desc);
create index if not exists public_response_rate_session_created_idx
  on public.public_response_rate_events(session_id, created_at desc);

create or replace function public.track_public_report_engagement(
  p_report_id text,
  p_event_type text,
  p_visitor_id text,
  p_session_id text
) returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public','pg_temp'
as $function$
declare
  v_report_id text := upper(nullif(btrim(p_report_id),''));
  v_event_type text := lower(nullif(btrim(p_event_type),''));
  v_visitor_id text := lower(nullif(btrim(p_visitor_id),''));
  v_session_id text := lower(nullif(btrim(p_session_id),''));
  v_inserted integer := 0;
  v_view_count bigint;
  v_share_count bigint;
  v_recent_visitor integer;
  v_recent_report integer;
begin
  if v_report_id is null or not exists (
    select 1 from public.complaints c
    where upper(c.id)=v_report_id and c.status='published'
  ) then return null; end if;

  if v_event_type not in ('view','share') then
    raise exception 'INVALID_ENGAGEMENT_EVENT';
  end if;

  if v_visitor_id is null
     or v_visitor_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
     or v_session_id is null
     or v_session_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  then raise exception 'INVALID_ENGAGEMENT_CONTEXT'; end if;

  select count(*) into v_recent_visitor
  from public.public_engagement_events e
  where e.visitor_id=v_visitor_id
    and e.created_at > now() - interval '1 minute';
  if v_recent_visitor >= 20 then raise exception 'RATE_LIMITED'; end if;

  select count(*) into v_recent_report
  from public.public_engagement_events e
  where e.report_id=v_report_id
    and e.event_type=v_event_type
    and e.created_at > now() - interval '1 minute';
  if v_recent_report >= 300 then raise exception 'RATE_LIMITED'; end if;

  insert into public.public_engagement_events(report_id,visitor_id,session_id,event_type)
  values(v_report_id,v_visitor_id,v_session_id,v_event_type)
  on conflict do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 1 then
    if v_event_type='view' then
      update public.complaints c
      set public_view_count=coalesce(c.public_view_count,0)+1
      where upper(c.id)=v_report_id and c.status='published'
      returning c.public_view_count,c.public_share_count
      into v_view_count,v_share_count;
    else
      update public.complaints c
      set public_share_count=coalesce(c.public_share_count,0)+1
      where upper(c.id)=v_report_id and c.status='published'
      returning c.public_view_count,c.public_share_count
      into v_view_count,v_share_count;
    end if;
  else
    select c.public_view_count,c.public_share_count
    into v_view_count,v_share_count
    from public.complaints c
    where upper(c.id)=v_report_id and c.status='published';
  end if;

  return jsonb_build_object(
    'viewCount',coalesce(v_view_count,0),
    'shareCount',coalesce(v_share_count,0),
    'counted',v_inserted=1
  );
end;
$function$;

revoke all on function public.track_public_report_engagement(text,text,text,text) from public;
grant execute on function public.track_public_report_engagement(text,text,text,text) to anon, authenticated;
revoke execute on function public.track_public_report_view(text) from anon, authenticated;
revoke execute on function public.track_public_report_share(text) from anon, authenticated;

create or replace function public.submit_public_response_v2(
  p_report_id text,
  p_response_type text,
  p_payload jsonb,
  p_visitor_id text,
  p_session_id text
) returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public','pg_temp'
as $function$
declare
  v_visitor_id text := lower(nullif(btrim(p_visitor_id),''));
  v_session_id text := lower(nullif(btrim(p_session_id),''));
  v_type text := lower(nullif(btrim(p_response_type),''));
  v_hour_visitor integer;
  v_hour_session integer;
  v_day_visitor integer;
  v_result jsonb;
begin
  if v_visitor_id is null
     or v_visitor_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
     or v_session_id is null
     or v_session_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  then raise exception 'INVALID_RESPONSE_CONTEXT'; end if;

  if v_type not in ('citizen_information','subject_response') then
    raise exception 'INVALID_RESPONSE_TYPE';
  end if;

  select count(*) into v_hour_visitor
  from public.public_response_rate_events
  where visitor_id=v_visitor_id
    and created_at > now() - interval '1 hour';

  select count(*) into v_hour_session
  from public.public_response_rate_events
  where session_id=v_session_id
    and created_at > now() - interval '1 hour';

  select count(*) into v_day_visitor
  from public.public_response_rate_events
  where visitor_id=v_visitor_id
    and created_at > now() - interval '24 hours';

  if v_hour_visitor >= 10
     or v_hour_session >= 6
     or v_day_visitor >= 30 then
    raise exception 'RATE_LIMITED';
  end if;

  v_result := public.submit_public_response(p_report_id,v_type,p_payload);

  insert into public.public_response_rate_events(
    report_id,visitor_id,session_id,response_type
  ) values(
    upper(btrim(p_report_id)),v_visitor_id,v_session_id,v_type
  );

  return v_result;
end;
$function$;

revoke all on function public.submit_public_response_v2(text,text,jsonb,text,text) from public;
grant execute on function public.submit_public_response_v2(text,text,jsonb,text,text) to anon, authenticated;
revoke execute on function public.submit_public_response(text,text,jsonb) from anon, authenticated;

create or replace function public.enforce_public_complaint_submission_rate()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog','public','pg_temp'
as $function$
declare
  v_hour_visitor integer;
  v_hour_session integer;
  v_day_visitor integer;
begin
  if new.visitor_id is null or new.session_id is null then
    raise exception 'INVALID_SUBMISSION_CONTEXT';
  end if;

  select count(*) into v_hour_visitor
  from public.complaint_submission_contexts c
  where c.visitor_id=new.visitor_id
    and c.created_at > now() - interval '1 hour';

  select count(*) into v_hour_session
  from public.complaint_submission_contexts c
  where c.session_id=new.session_id
    and c.created_at > now() - interval '1 hour';

  select count(*) into v_day_visitor
  from public.complaint_submission_contexts c
  where c.visitor_id=new.visitor_id
    and c.created_at > now() - interval '24 hours';

  if v_hour_visitor >= 5
     or v_hour_session >= 3
     or v_day_visitor >= 15 then
    raise exception 'RATE_LIMITED';
  end if;
  return new;
end;
$function$;

revoke all on function public.enforce_public_complaint_submission_rate()
  from public, anon, authenticated;
drop trigger if exists trg_public_complaint_submission_rate
  on public.complaint_submission_contexts;
create trigger trg_public_complaint_submission_rate
before insert on public.complaint_submission_contexts
for each row execute function public.enforce_public_complaint_submission_rate();

create or replace function public.enforce_public_visit_session_rate()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog','public','pg_temp'
as $function$
declare
  v_recent integer;
begin
  if exists (
    select 1 from public.public_visit_sessions s
    where s.session_id=new.session_id
  ) then return new; end if;

  select count(*) into v_recent
  from public.public_visit_sessions s
  where s.visitor_id=new.visitor_id
    and s.created_at > now() - interval '1 hour';

  if v_recent >= 30 then
    raise exception 'RATE_LIMITED';
  end if;
  return new;
end;
$function$;

revoke all on function public.enforce_public_visit_session_rate()
  from public, anon, authenticated;
drop trigger if exists trg_public_visit_session_rate
  on public.public_visit_sessions;
create trigger trg_public_visit_session_rate
before insert on public.public_visit_sessions
for each row execute function public.enforce_public_visit_session_rate();
