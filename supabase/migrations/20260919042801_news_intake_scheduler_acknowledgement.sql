create or replace function public.service_begin_scheduled_news_intake_run(
  p_scheduled_slot timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public'
as $function$
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
$function$;

revoke all on function public.service_begin_scheduled_news_intake_run(timestamptz)
  from public,anon,authenticated;
grant execute on function public.service_begin_scheduled_news_intake_run(timestamptz)
  to service_role;

create or replace function private.dispatch_news_intake_auto_scan()
returns bigint
language plpgsql
security definer
set search_path to 'pg_catalog','public','vault','net','private'
as $function$
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
$function$;

revoke all on function private.dispatch_news_intake_auto_scan()
  from public,anon,authenticated,service_role;
grant execute on function private.dispatch_news_intake_auto_scan() to postgres;

update public.news_intake_automation_settings
set next_auto_due_at=
  case
    when enabled=true and next_auto_due_at is not null
      then date_trunc('minute',next_auto_due_at)+interval '1 minute'
    else next_auto_due_at
  end,
  updated_at=now()
where singleton=true
  and next_auto_due_at is not null
  and date_trunc('minute',next_auto_due_at) <> next_auto_due_at;

select cron.schedule(
  'sobaike-janao-news-intake-auto-dispatch',
  '* * * * *',
  $$select private.dispatch_news_intake_auto_scan();$$
);
