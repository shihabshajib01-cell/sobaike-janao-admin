create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net;
create schema if not exists private;
revoke all on schema private from public,anon,authenticated;
grant usage on schema private to service_role,postgres;

alter table public.news_intake_runs
  alter column started_by drop not null,
  add column if not exists trigger_type text not null default 'manual';

alter table public.news_intake_runs
  drop constraint if exists news_intake_runs_trigger_type_check,
  add constraint news_intake_runs_trigger_type_check
    check (trigger_type in ('manual','automatic'));

create unique index if not exists ux_news_intake_runs_one_running
  on public.news_intake_runs ((1))
  where status='running';

create table if not exists public.news_intake_automation_settings(
  singleton boolean primary key default true check (singleton=true),
  enabled boolean not null default true,
  interval_hours integer not null default 36 check (interval_hours=36),
  last_auto_dispatched_at timestamptz,
  next_auto_due_at timestamptz,
  updated_at timestamptz not null default now()
);

insert into public.news_intake_automation_settings(
  singleton,enabled,interval_hours,next_auto_due_at
) values (true,true,36,now()+interval '36 hours')
on conflict(singleton) do nothing;

alter table public.news_intake_automation_settings enable row level security;
revoke all on table public.news_intake_automation_settings from public,anon,authenticated;

drop policy if exists news_intake_automation_settings_anon_deny
  on public.news_intake_automation_settings;
create policy news_intake_automation_settings_anon_deny
  on public.news_intake_automation_settings for all to anon
  using(false) with check(false);

drop policy if exists news_intake_automation_settings_authenticated_deny
  on public.news_intake_automation_settings;
create policy news_intake_automation_settings_authenticated_deny
  on public.news_intake_automation_settings for all to authenticated
  using(false) with check(false);

do $$
declare
  v_name text;
  v_oid oid;
  v_def text;
  v_new text;
begin
  foreach v_name in array array[
    'admin_record_news_intake_item',
    'admin_finish_news_intake_run',
    'admin_get_news_intake_scan_sources',
    'admin_check_news_source_domain',
    'admin_preview_sourced_report_intake',
    'admin_create_sourced_report_from_intake',
    'admin_merge_intake_source'
  ]
  loop
    select p.oid into v_oid
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname=v_name
    order by p.oid
    limit 1;

    if v_oid is null then
      raise exception 'Required News Intake function not found: %',v_name;
    end if;

    v_def:=pg_get_functiondef(v_oid);
    v_new:=regexp_replace(
      v_def,
      $re$if\s+not public\.is_active_admin\(\)\s+or\s+not public\.has_permission\('complaints\.publish'\)\s+then$re$,
      $rep$if coalesce(auth.jwt()->>'role','') <> 'service_role'
     and (not public.is_active_admin() or not public.has_permission('complaints.publish')) then$rep$,
      'i'
    );

    if v_new=v_def then
      raise exception 'Authorization patch marker not found in function: %',v_name;
    end if;

    execute v_new;
  end loop;
end $$;

create or replace function public.admin_begin_news_intake_run()
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public'
as $function$
declare
  v_id uuid;
  v_source_count integer;
  v_running public.news_intake_runs%rowtype;
begin
  if not public.is_active_admin() or not public.has_permission('complaints.publish') then
    raise exception 'Access denied.' using errcode='42501';
  end if;

  update public.news_intake_runs
  set status='failed',
      completed_at=now(),
      error_summary=coalesce(error_summary,'') || case when coalesce(error_summary,'')='' then '' else ' ' end ||
        'Marked failed automatically because the run exceeded 20 minutes.'
  where status='running' and started_at < now()-interval '20 minutes';

  select * into v_running
  from public.news_intake_runs
  where status='running'
  order by started_at desc
  limit 1;

  if v_running.id is not null then
    return jsonb_build_object(
      'runId',v_running.id,
      'status','running',
      'sourceCount',v_running.source_count,
      'startedAt',v_running.started_at,
      'triggerType',v_running.trigger_type,
      'alreadyRunning',true
    );
  end if;

  select count(*)::integer into v_source_count
  from public.news_source_domains
  where active=true and scan_enabled=true and homepage_url is not null;

  begin
    insert into public.news_intake_runs(started_by,source_count,trigger_type)
    values(auth.uid(),v_source_count,'manual')
    returning id into v_id;
  exception when unique_violation then
    select * into v_running
    from public.news_intake_runs
    where status='running'
    order by started_at desc limit 1;
    return jsonb_build_object(
      'runId',v_running.id,
      'status','running',
      'sourceCount',v_running.source_count,
      'startedAt',v_running.started_at,
      'triggerType',v_running.trigger_type,
      'alreadyRunning',true
    );
  end;

  insert into public.admin_audit_logs(actor_id,action,target_type,target_id,details)
  values(auth.uid(),'news_intake.run_start','news_intake_run',v_id::text,
    jsonb_build_object('source_count',v_source_count,'trigger_type','manual','timestamp',clock_timestamp()));

  return jsonb_build_object(
    'runId',v_id,
    'status','running',
    'sourceCount',v_source_count,
    'startedAt',clock_timestamp(),
    'triggerType','manual',
    'alreadyRunning',false
  );
end;
$function$;

revoke all on function public.admin_begin_news_intake_run() from public,anon;
grant execute on function public.admin_begin_news_intake_run() to authenticated;

create or replace function public.service_begin_news_intake_run()
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public'
as $function$
declare
  v_id uuid;
  v_source_count integer;
  v_running public.news_intake_runs%rowtype;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then
    raise exception 'Access denied.' using errcode='42501';
  end if;

  update public.news_intake_runs
  set status='failed',
      completed_at=now(),
      error_summary=coalesce(error_summary,'') || case when coalesce(error_summary,'')='' then '' else ' ' end ||
        'Marked failed automatically because the run exceeded 20 minutes.'
  where status='running' and started_at < now()-interval '20 minutes';

  select * into v_running
  from public.news_intake_runs
  where status='running'
  order by started_at desc
  limit 1;

  if v_running.id is not null then
    return jsonb_build_object(
      'runId',v_running.id,
      'status','running',
      'sourceCount',v_running.source_count,
      'startedAt',v_running.started_at,
      'triggerType',v_running.trigger_type,
      'alreadyRunning',true
    );
  end if;

  select count(*)::integer into v_source_count
  from public.news_source_domains
  where active=true and scan_enabled=true and homepage_url is not null;

  begin
    insert into public.news_intake_runs(started_by,source_count,trigger_type)
    values(null,v_source_count,'automatic')
    returning id into v_id;
  exception when unique_violation then
    select * into v_running
    from public.news_intake_runs
    where status='running'
    order by started_at desc limit 1;
    return jsonb_build_object(
      'runId',v_running.id,
      'status','running',
      'sourceCount',v_running.source_count,
      'startedAt',v_running.started_at,
      'triggerType',v_running.trigger_type,
      'alreadyRunning',true
    );
  end;

  insert into public.admin_audit_logs(actor_id,action,target_type,target_id,details)
  values(null,'news_intake.run_start','news_intake_run',v_id::text,
    jsonb_build_object('source_count',v_source_count,'trigger_type','automatic','timestamp',clock_timestamp()));

  return jsonb_build_object(
    'runId',v_id,
    'status','running',
    'sourceCount',v_source_count,
    'startedAt',clock_timestamp(),
    'triggerType','automatic',
    'alreadyRunning',false
  );
end;
$function$;

revoke all on function public.service_begin_news_intake_run() from public,anon,authenticated;
grant execute on function public.service_begin_news_intake_run() to service_role;

grant execute on function public.admin_record_news_intake_item(uuid,jsonb) to service_role;
grant execute on function public.admin_finish_news_intake_run(uuid,text,text) to service_role;
grant execute on function public.admin_get_news_intake_scan_sources() to service_role;
grant execute on function public.admin_check_news_source_domain(text) to service_role;
grant execute on function public.admin_preview_sourced_report_intake(jsonb) to service_role;
grant execute on function public.admin_create_sourced_report_from_intake(jsonb) to service_role;
grant execute on function public.admin_merge_intake_source(text,jsonb) to service_role;

create or replace function public.admin_set_news_intake_auto_update(p_enabled boolean)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public'
as $function$
declare
  v_previous boolean;
  v_row public.news_intake_automation_settings%rowtype;
begin
  if not public.is_active_admin() or not public.has_permission('complaints.publish') then
    raise exception 'Access denied.' using errcode='42501';
  end if;

  select enabled into v_previous
  from public.news_intake_automation_settings
  where singleton=true
  for update;

  update public.news_intake_automation_settings
  set enabled=p_enabled,
      next_auto_due_at=case
        when p_enabled=true and coalesce(v_previous,false)=false then now()+interval '36 hours'
        when p_enabled=true then next_auto_due_at
        else null
      end,
      updated_at=now()
  where singleton=true
  returning * into v_row;

  insert into public.admin_audit_logs(actor_id,action,target_type,target_id,details)
  values(auth.uid(),'news_intake.auto_update_change','news_intake_automation','singleton',
    jsonb_build_object(
      'enabled',p_enabled,
      'interval_hours',36,
      'next_auto_due_at',v_row.next_auto_due_at,
      'timestamp',clock_timestamp()
    ));

  return jsonb_build_object(
    'enabled',v_row.enabled,
    'intervalHours',v_row.interval_hours,
    'lastAutoDispatchedAt',v_row.last_auto_dispatched_at,
    'nextAutoDueAt',v_row.next_auto_due_at
  );
end;
$function$;

revoke all on function public.admin_set_news_intake_auto_update(boolean) from public,anon;
grant execute on function public.admin_set_news_intake_auto_update(boolean) to authenticated;

create or replace function public.admin_get_news_intake_automation_dashboard()
returns jsonb
language plpgsql
stable security definer
set search_path to 'pg_catalog','public'
as $function$
declare
  v_sources jsonb;
  v_runs jsonb;
  v_automation jsonb;
begin
  if not public.is_active_admin() or not public.has_permission('complaints.publish') then
    raise exception 'Access denied.' using errcode='42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'hostname',d.hostname,
    'publisherName',d.publisher_name,
    'homepageUrl',d.homepage_url,
    'languageHint',d.language_hint,
    'priority',d.scan_priority,
    'scanEnabled',d.scan_enabled,
    'automationNote',d.automation_note,
    'lastScannedAt',d.last_scanned_at
  ) order by case when d.scan_enabled then 0 else 1 end,d.scan_priority,d.publisher_name),'[]'::jsonb)
  into v_sources
  from public.news_source_domains d
  where d.active=true and d.homepage_url is not null;

  select jsonb_build_object(
    'enabled',s.enabled,
    'intervalHours',s.interval_hours,
    'lastAutoDispatchedAt',s.last_auto_dispatched_at,
    'nextAutoDueAt',s.next_auto_due_at,
    'running',exists(select 1 from public.news_intake_runs r where r.status='running')
  )
  into v_automation
  from public.news_intake_automation_settings s
  where s.singleton=true;

  select coalesce(jsonb_agg(run_payload order by started_at desc),'[]'::jsonb)
  into v_runs
  from (
    select r.started_at,
      jsonb_build_object(
        'runId',r.id,
        'status',r.status,
        'triggerType',r.trigger_type,
        'sourceCount',r.source_count,
        'discoveredCount',r.discovered_count,
        'classifiedCount',r.classified_count,
        'duplicateCount',r.duplicate_count,
        'createdCount',r.created_count,
        'mergedCount',r.merged_count,
        'reviewCount',r.review_count,
        'skippedCount',r.skipped_count,
        'errorCount',r.error_count,
        'startedAt',r.started_at,
        'completedAt',r.completed_at,
        'errorSummary',r.error_summary,
        'items',(
          select coalesce(jsonb_agg(jsonb_build_object(
            'id',i.id,
            'itemKind',i.item_kind,
            'publisherName',i.publisher_name,
            'sourceHostname',i.source_hostname,
            'canonicalUrl',i.canonical_url,
            'sourceTitle',i.source_title,
            'sourcePublishedDate',to_char(i.source_published_date,'YYYY-MM-DD'),
            'contentLanguage',i.content_language,
            'segmentId',i.segment_id,
            'subcategoryId',i.subcategory_id,
            'confidence',i.confidence,
            'duplicateStatus',i.duplicate_status,
            'action',i.action,
            'reportId',i.report_id,
            'reason',i.reason
          ) order by i.created_at desc),'[]'::jsonb)
          from public.news_intake_run_items i
          where i.run_id=r.id
        )
      ) as run_payload
    from public.news_intake_runs r
    order by r.started_at desc
    limit 10
  ) q;

  return jsonb_build_object(
    'sources',v_sources,
    'runs',v_runs,
    'automation',coalesce(v_automation,jsonb_build_object(
      'enabled',false,'intervalHours',36,'lastAutoDispatchedAt',null,'nextAutoDueAt',null,'running',false
    ))
  );
end;
$function$;

revoke all on function public.admin_get_news_intake_automation_dashboard() from public,anon;
grant execute on function public.admin_get_news_intake_automation_dashboard() to authenticated;

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
begin
  select * into v_settings
  from public.news_intake_automation_settings
  where singleton=true
  for update;

  if v_settings.enabled is not true
     or v_settings.next_auto_due_at is null
     or v_settings.next_auto_due_at > now() then
    return null;
  end if;

  if exists(
    select 1
    from public.news_intake_runs
    where status='running' and started_at >= now()-interval '20 minutes'
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

  update public.news_intake_automation_settings
  set last_auto_dispatched_at=now(),
      next_auto_due_at=now()+interval '36 hours',
      updated_at=now()
  where singleton=true;

  select net.http_post(
    url:='https://ahiaymyqfmyyrjkwgvhi.supabase.co/functions/v1/news-intake-scan',
    headers:=jsonb_build_object(
      'Content-Type','application/json',
      'x-news-intake-scheduler',v_secret
    ),
    body:=jsonb_build_object('trigger','automatic'),
    timeout_milliseconds:=5000
  ) into v_request_id;

  insert into public.admin_audit_logs(actor_id,action,target_type,target_id,details)
  values(null,'news_intake.scheduler_dispatch','news_intake_automation','singleton',
    jsonb_build_object(
      'request_id',v_request_id,
      'next_auto_due_at',now()+interval '36 hours',
      'timestamp',clock_timestamp()
    ));

  return v_request_id;
end;
$function$;

revoke all on function private.dispatch_news_intake_auto_scan() from public,anon,authenticated,service_role;
grant execute on function private.dispatch_news_intake_auto_scan() to postgres;

select cron.schedule(
  'sobaike-janao-news-intake-auto-dispatch',
  '7 * * * *',
  $$select private.dispatch_news_intake_auto_scan();$$
);