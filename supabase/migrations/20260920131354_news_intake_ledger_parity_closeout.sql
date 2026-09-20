-- News Intake migration-ledger parity closeout.
-- Captures current production scheduler acknowledgement, source-language
-- normalization, Admin location RPC hardening, and UNB manual-only behavior.

CREATE OR REPLACE FUNCTION private.dispatch_news_intake_auto_scan()
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'vault', 'net', 'private'
AS $function$
declare
  v_settings public.news_intake_automation_settings%rowtype;
  v_secret text;
  v_request_id bigint;
  v_slot timestamptz;
begin
  v_slot := date_trunc('minute',clock_timestamp());

  select * into v_settings
  from public.news_intake_automation_settings
  where singleton=true;

  if v_settings.enabled is not true
     or v_settings.next_auto_due_at is null
     or v_settings.next_auto_due_at > v_slot then
    return null;
  end if;

  if exists(
    select 1
    from public.news_intake_runs
    where status='running'
      and started_at >= now()-interval '20 minutes'
  ) then
    return null;
  end if;

  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name='news_intake_scheduler_secret'
  order by created_at desc
  limit 1;

  if v_secret is null then
    raise exception 'News Intake scheduler secret is missing.';
  end if;

  select net.http_post(
    url:='https://ahiaymyqfmyyrjkwgvhi.supabase.co/functions/v1/news-intake-scan',
    headers:=jsonb_build_object(
      'Content-Type','application/json',
      'x-news-intake-scheduler',v_secret
    ),
    body:=jsonb_build_object(
      'trigger','automatic',
      'scheduledSlot',v_slot
    ),
    timeout_milliseconds:=10000
  ) into v_request_id;

  insert into public.admin_audit_logs(
    actor_id,action,target_type,target_id,details
  )
  values(
    null,
    'news_intake.scheduler_dispatch',
    'news_intake_automation',
    'singleton',
    jsonb_build_object(
      'request_id',v_request_id,
      'scheduled_slot',v_slot,
      'due_at',v_settings.next_auto_due_at,
      'timestamp',clock_timestamp()
    )
  );

  return v_request_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.normalize_sourced_report_public_language()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_lang text;
  v_prefs jsonb;
  v_title text;
  v_summary text;
begin
  if new.origin_type <> 'sourced_report' or new.status <> 'published' then
    return new;
  end if;

  v_lang := lower(coalesce(nullif(btrim(new.custom_field_answers->>'sourceLanguage'),''),'unknown'));
  v_prefs := coalesce(new.publication_preferences,'{}'::jsonb);

  if v_lang = 'bn' then
    v_title := coalesce(
      nullif(btrim(v_prefs->>'publicTitleBn'),''),
      nullif(btrim(new.title),''),
      nullif(btrim(new.title_en),''),
      new.id
    );
    v_summary := coalesce(
      nullif(btrim(v_prefs->>'publicSummaryBn'),''),
      nullif(btrim(new.description),''),
      nullif(btrim(new.description_en),'')
    );

    v_prefs := v_prefs - 'publicTitleEn' - 'publicSummaryEn';
    v_prefs := jsonb_set(v_prefs,'{publicTitleBn}',to_jsonb(v_title),true);
    if coalesce((v_prefs->>'showDescription')::boolean,true) and v_summary is not null then
      v_prefs := jsonb_set(v_prefs,'{publicSummaryBn}',to_jsonb(v_summary),true);
    else
      v_prefs := v_prefs - 'publicSummaryBn';
    end if;
  elsif v_lang = 'en' then
    v_title := coalesce(
      nullif(btrim(v_prefs->>'publicTitleEn'),''),
      nullif(btrim(v_prefs->>'publicTitleBn'),''),
      nullif(btrim(new.title_en),''),
      nullif(btrim(new.title),''),
      new.id
    );
    v_summary := coalesce(
      nullif(btrim(v_prefs->>'publicSummaryEn'),''),
      nullif(btrim(v_prefs->>'publicSummaryBn'),''),
      nullif(btrim(new.description_en),''),
      nullif(btrim(new.description),'')
    );

    v_prefs := v_prefs - 'publicTitleBn' - 'publicSummaryBn';
    v_prefs := jsonb_set(v_prefs,'{publicTitleEn}',to_jsonb(v_title),true);
    if coalesce((v_prefs->>'showDescription')::boolean,true) and v_summary is not null then
      v_prefs := jsonb_set(v_prefs,'{publicSummaryEn}',to_jsonb(v_summary),true);
    else
      v_prefs := v_prefs - 'publicSummaryEn';
    end if;
  end if;

  new.publication_preferences := v_prefs;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.service_begin_scheduled_news_intake_run(p_scheduled_slot timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_id uuid;
  v_source_count integer;
  v_running public.news_intake_runs%rowtype;
  v_settings public.news_intake_automation_settings%rowtype;
  v_slot timestamptz;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then
    raise exception 'Access denied.' using errcode='42501';
  end if;

  if p_scheduled_slot is null then
    raise exception 'Scheduled slot is required.' using errcode='22023';
  end if;

  v_slot := date_trunc('minute',p_scheduled_slot);

  if abs(extract(epoch from (clock_timestamp()-v_slot))) > 300 then
    raise exception 'Scheduled slot is outside the allowed dispatch window.'
      using errcode='22023';
  end if;

  select * into v_settings
  from public.news_intake_automation_settings
  where singleton=true
  for update;

  if v_settings.enabled is not true then
    return jsonb_build_object(
      'accepted',false,
      'disabled',true,
      'triggerType','automatic'
    );
  end if;

  if v_settings.next_auto_due_at is null
     or v_settings.next_auto_due_at > v_slot then
    return jsonb_build_object(
      'accepted',false,
      'notDue',true,
      'nextAutoDueAt',v_settings.next_auto_due_at,
      'triggerType','automatic'
    );
  end if;

  update public.news_intake_runs
  set status='failed',
      completed_at=now(),
      error_summary=coalesce(error_summary,'') ||
        case when coalesce(error_summary,'')='' then '' else ' ' end ||
        'Marked failed automatically because the run exceeded 20 minutes.'
  where status='running'
    and started_at < now()-interval '20 minutes';

  select * into v_running
  from public.news_intake_runs
  where status='running'
  order by started_at desc
  limit 1;

  if v_running.id is not null then
    return jsonb_build_object(
      'accepted',false,
      'deferred',true,
      'runId',v_running.id,
      'status','running',
      'sourceCount',v_running.source_count,
      'startedAt',v_running.started_at,
      'triggerType',v_running.trigger_type,
      'nextAutoDueAt',v_settings.next_auto_due_at
    );
  end if;

  select count(*)::integer into v_source_count
  from public.news_source_domains
  where active=true
    and scan_enabled=true
    and homepage_url is not null;

  begin
    insert into public.news_intake_runs(
      started_by,source_count,trigger_type
    )
    values(null,v_source_count,'automatic')
    returning id into v_id;
  exception when unique_violation then
    select * into v_running
    from public.news_intake_runs
    where status='running'
    order by started_at desc
    limit 1;

    return jsonb_build_object(
      'accepted',false,
      'deferred',true,
      'runId',v_running.id,
      'status','running',
      'sourceCount',v_running.source_count,
      'startedAt',v_running.started_at,
      'triggerType',v_running.trigger_type,
      'nextAutoDueAt',v_settings.next_auto_due_at
    );
  end;

  update public.news_intake_automation_settings
  set last_auto_dispatched_at=v_slot,
      next_auto_due_at=v_slot+interval '36 hours',
      updated_at=now()
  where singleton=true;

  insert into public.admin_audit_logs(
    actor_id,action,target_type,target_id,details
  )
  values(
    null,
    'news_intake.run_start',
    'news_intake_run',
    v_id::text,
    jsonb_build_object(
      'source_count',v_source_count,
      'trigger_type','automatic',
      'scheduled_slot',v_slot,
      'next_auto_due_at',v_slot+interval '36 hours',
      'timestamp',clock_timestamp()
    )
  );

  return jsonb_build_object(
    'accepted',true,
    'runId',v_id,
    'status','running',
    'sourceCount',v_source_count,
    'startedAt',clock_timestamp(),
    'scheduledSlot',v_slot,
    'nextAutoDueAt',v_slot+interval '36 hours',
    'triggerType','automatic',
    'alreadyRunning',false
  );
end;
$function$
;

drop trigger if exists trg_normalize_sourced_report_public_language on public.complaints;
create trigger trg_normalize_sourced_report_public_language
before insert or update of status, publication_preferences on public.complaints
for each row execute function public.normalize_sourced_report_public_language();

revoke execute on function public.admin_get_location_taxonomy() from anon;
revoke execute on function public.admin_resolve_news_intake_location(text,text) from anon;

update public.news_source_domains
set scan_enabled=false,
    automation_note='Manual-only: automated discovery redirects to the UNB homepage and cannot reliably enumerate final article pages.',
    updated_at=now()
where hostname='unb.com.bd' and active=true;

update public.news_intake_automation_settings
set interval_hours=36,
    updated_at=now()
where singleton=true;
