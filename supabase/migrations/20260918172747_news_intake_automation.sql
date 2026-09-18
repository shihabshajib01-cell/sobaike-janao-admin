alter table public.news_source_domains
  add column if not exists homepage_url text,
  add column if not exists language_hint text not null default 'auto',
  add column if not exists scan_enabled boolean not null default false,
  add column if not exists scan_priority smallint not null default 50,
  add column if not exists last_scanned_at timestamptz;

alter table public.news_source_domains
  drop constraint if exists news_source_domains_homepage_url_check,
  add constraint news_source_domains_homepage_url_check
    check (homepage_url is null or homepage_url ~ '^https://[^/]+(?:/.*)?$'),
  drop constraint if exists news_source_domains_language_hint_check,
  add constraint news_source_domains_language_hint_check
    check (language_hint in ('auto','bn','en')),
  drop constraint if exists news_source_domains_scan_priority_check,
  add constraint news_source_domains_scan_priority_check
    check (scan_priority between 1 and 100);

insert into public.news_source_domains(
  hostname,publisher_name,active,homepage_url,language_hint,scan_enabled,scan_priority
) values
  ('www.prothomalo.com','Prothom Alo',true,'https://www.prothomalo.com/','bn',true,10),
  ('bangla.bdnews24.com','bdnews24.com Bangla',true,'https://bangla.bdnews24.com/','bn',true,11),
  ('bdnews24.com','bdnews24.com',true,'https://bdnews24.com/','en',true,12),
  ('www.thedailystar.net','The Daily Star',true,'https://www.thedailystar.net/','en',true,13),
  ('www.jugantor.com','Jugantor',true,'https://www.jugantor.com/','bn',true,14),
  ('www.kalerkantho.com','Kaler Kantho',true,'https://www.kalerkantho.com/','bn',true,15),
  ('onlinebn.samakal24.com','Samakal',true,'https://onlinebn.samakal24.com/','bn',true,16),
  ('www.ittefaq.com.bd','The Daily Ittefaq',true,'https://www.ittefaq.com.bd/','bn',true,17),
  ('www.jagonews24.com','Jago News',true,'https://www.jagonews24.com/','bn',true,18),
  ('www.banglatribune.com','Bangla Tribune',true,'https://www.banglatribune.com/','bn',true,19),
  ('www.dhakapost.com','Dhaka Post',true,'https://www.dhakapost.com/','bn',true,20),
  ('www.banglanews24.com','Banglanews24.com',true,'https://www.banglanews24.com/','bn',true,21),
  ('unb.com.bd','UNB',true,'https://unb.com.bd/','en',true,22),
  ('www.dhakatribune.com','Dhaka Tribune',true,'https://www.dhakatribune.com/','en',true,23),
  ('bonikbarta.com','Bonik Barta',true,'https://bonikbarta.com/','bn',true,24),
  ('www.newagebd.net','New Age',true,'https://www.newagebd.net/','en',true,25),
  ('www.tbsnews.net','The Business Standard',true,'https://www.tbsnews.net/','en',true,26),
  ('www.bssnews.net','Bangladesh Sangbad Sangstha',true,'https://www.bssnews.net/','en',true,27)
on conflict (hostname) do update
set publisher_name=excluded.publisher_name,
    active=true,
    homepage_url=excluded.homepage_url,
    language_hint=excluded.language_hint,
    scan_enabled=excluded.scan_enabled,
    scan_priority=excluded.scan_priority,
    updated_at=now();

create table if not exists public.news_intake_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'running'
    check (status in ('running','completed','partial','failed')),
  started_by uuid not null references public.admin_users(user_id),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  source_count integer not null default 0 check (source_count >= 0),
  discovered_count integer not null default 0 check (discovered_count >= 0),
  classified_count integer not null default 0 check (classified_count >= 0),
  duplicate_count integer not null default 0 check (duplicate_count >= 0),
  created_count integer not null default 0 check (created_count >= 0),
  merged_count integer not null default 0 check (merged_count >= 0),
  review_count integer not null default 0 check (review_count >= 0),
  skipped_count integer not null default 0 check (skipped_count >= 0),
  error_count integer not null default 0 check (error_count >= 0),
  error_summary text,
  created_at timestamptz not null default now()
);

create table if not exists public.news_intake_run_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.news_intake_runs(id) on delete cascade,
  source_hostname text not null,
  publisher_name text not null,
  canonical_url text not null,
  source_title text,
  source_published_date date,
  content_language text not null default 'unknown'
    check (content_language in ('bn','en','mixed','unknown')),
  segment_id text references public.segments(id),
  subcategory_id text references public.subcategories(id),
  confidence numeric(5,4) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  duplicate_status text
    check (duplicate_status is null or duplicate_status in ('clear','exact','match','review','unavailable')),
  action text not null
    check (action in ('discovered','skip_duplicate','needs_review','created_draft','merged_source','error')),
  report_id text references public.complaints(id) on delete set null,
  reason text,
  created_at timestamptz not null default now(),
  unique(run_id,canonical_url),
  check (char_length(canonical_url) <= 2000),
  check (source_title is null or char_length(source_title) <= 500),
  check (reason is null or char_length(reason) <= 1500)
);

create index if not exists idx_news_intake_runs_started_at
  on public.news_intake_runs(started_at desc);
create index if not exists idx_news_intake_run_items_run_id_created_at
  on public.news_intake_run_items(run_id,created_at);
create index if not exists idx_news_intake_run_items_report_id
  on public.news_intake_run_items(report_id)
  where report_id is not null;
create index if not exists idx_news_source_domains_auto_scan
  on public.news_source_domains(scan_priority,publisher_name)
  where active=true and scan_enabled=true;

alter table public.news_intake_runs enable row level security;
alter table public.news_intake_run_items enable row level security;
revoke all on table public.news_intake_runs from public,anon,authenticated;
revoke all on table public.news_intake_run_items from public,anon,authenticated;

create or replace function public.admin_get_news_intake_scan_sources()
returns jsonb
language plpgsql
stable security definer
set search_path to 'pg_catalog','public'
as $function$
declare
  v_sources jsonb;
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
    'lastScannedAt',d.last_scanned_at
  ) order by d.scan_priority,d.publisher_name,d.hostname),'[]'::jsonb)
  into v_sources
  from public.news_source_domains d
  where d.active=true and d.scan_enabled=true and d.homepage_url is not null;

  return v_sources;
end;
$function$;

revoke all on function public.admin_get_news_intake_scan_sources() from public,anon;
grant execute on function public.admin_get_news_intake_scan_sources() to authenticated;

create or replace function public.admin_begin_news_intake_run()
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public'
as $function$
declare
  v_id uuid;
  v_source_count integer;
begin
  if not public.is_active_admin() or not public.has_permission('complaints.publish') then
    raise exception 'Access denied.' using errcode='42501';
  end if;

  select count(*)::integer into v_source_count
  from public.news_source_domains
  where active=true and scan_enabled=true and homepage_url is not null;

  insert into public.news_intake_runs(started_by,source_count)
  values(auth.uid(),v_source_count)
  returning id into v_id;

  insert into public.admin_audit_logs(actor_id,action,target_type,target_id,details)
  values(auth.uid(),'news_intake.run_start','news_intake_run',v_id::text,
    jsonb_build_object('source_count',v_source_count,'timestamp',clock_timestamp()));

  return jsonb_build_object(
    'runId',v_id,
    'status','running',
    'sourceCount',v_source_count,
    'startedAt',clock_timestamp()
  );
end;
$function$;

revoke all on function public.admin_begin_news_intake_run() from public,anon;
grant execute on function public.admin_begin_news_intake_run() to authenticated;

create or replace function public.admin_record_news_intake_item(
  p_run_id uuid,
  p_item jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public'
as $function$
declare
  v_run public.news_intake_runs%rowtype;
  v_source_date date;
  v_confidence numeric;
  v_id uuid;
  v_url text:=nullif(btrim(p_item->>'canonicalUrl'),'');
  v_action text:=nullif(btrim(p_item->>'action'),'');
  v_report_id text:=nullif(btrim(p_item->>'reportId'),'');
begin
  if not public.is_active_admin() or not public.has_permission('complaints.publish') then
    raise exception 'Access denied.' using errcode='42501';
  end if;

  select * into v_run
  from public.news_intake_runs
  where id=p_run_id
  for update;

  if v_run.id is null or v_run.started_by<>auth.uid() then
    raise exception 'News intake run not found.' using errcode='P0002';
  end if;
  if v_run.status<>'running' then
    raise exception 'News intake run is already closed.' using errcode='22023';
  end if;
  if v_url is null or v_url !~ '^https://[^/]+(?:/.*)?$' then
    raise exception 'A valid HTTPS canonical URL is required.' using errcode='22023';
  end if;

  begin
    if nullif(btrim(p_item->>'sourcePublishedDate'),'') is not null then
      v_source_date:=(p_item->>'sourcePublishedDate')::date;
    end if;
    if nullif(btrim(p_item->>'confidence'),'') is not null then
      v_confidence:=(p_item->>'confidence')::numeric;
    end if;
  exception when others then
    raise exception 'Invalid News Intake item date or confidence.' using errcode='22023';
  end;

  insert into public.news_intake_run_items(
    run_id,source_hostname,publisher_name,canonical_url,source_title,
    source_published_date,content_language,segment_id,subcategory_id,
    confidence,duplicate_status,action,report_id,reason
  ) values (
    p_run_id,
    coalesce(nullif(lower(btrim(p_item->>'sourceHostname')),''),'unknown'),
    coalesce(nullif(btrim(p_item->>'publisherName'),''),'Unknown source'),
    v_url,
    nullif(btrim(p_item->>'sourceTitle'),''),
    v_source_date,
    coalesce(nullif(btrim(p_item->>'contentLanguage'),''),'unknown'),
    nullif(btrim(p_item->>'segmentId'),''),
    nullif(btrim(p_item->>'subcategoryId'),''),
    v_confidence,
    nullif(btrim(p_item->>'duplicateStatus'),''),
    v_action,
    v_report_id,
    nullif(btrim(p_item->>'reason'),'')
  )
  on conflict (run_id,canonical_url) do update
  set source_title=excluded.source_title,
      source_published_date=excluded.source_published_date,
      content_language=excluded.content_language,
      segment_id=excluded.segment_id,
      subcategory_id=excluded.subcategory_id,
      confidence=excluded.confidence,
      duplicate_status=excluded.duplicate_status,
      action=excluded.action,
      report_id=excluded.report_id,
      reason=excluded.reason
  returning id into v_id;

  return jsonb_build_object('id',v_id,'runId',p_run_id);
end;
$function$;

revoke all on function public.admin_record_news_intake_item(uuid,jsonb) from public,anon;
grant execute on function public.admin_record_news_intake_item(uuid,jsonb) to authenticated;

create or replace function public.admin_finish_news_intake_run(
  p_run_id uuid,
  p_status text default 'completed',
  p_error text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public'
as $function$
declare
  v_run public.news_intake_runs%rowtype;
  v_discovered integer;
  v_classified integer;
  v_duplicates integer;
  v_created integer;
  v_merged integer;
  v_review integer;
  v_skipped integer;
  v_errors integer;
begin
  if not public.is_active_admin() or not public.has_permission('complaints.publish') then
    raise exception 'Access denied.' using errcode='42501';
  end if;
  if p_status not in ('completed','partial','failed') then
    raise exception 'Invalid run status.' using errcode='22023';
  end if;

  select * into v_run
  from public.news_intake_runs
  where id=p_run_id
  for update;

  if v_run.id is null or v_run.started_by<>auth.uid() then
    raise exception 'News intake run not found.' using errcode='P0002';
  end if;

  select
    count(*)::integer,
    count(*) filter(where segment_id is not null and subcategory_id is not null)::integer,
    count(*) filter(where action in ('skip_duplicate','merged_source'))::integer,
    count(*) filter(where action='created_draft')::integer,
    count(*) filter(where action='merged_source')::integer,
    count(*) filter(where action='needs_review')::integer,
    count(*) filter(where action='skip_duplicate')::integer,
    count(*) filter(where action='error')::integer
  into v_discovered,v_classified,v_duplicates,v_created,v_merged,v_review,v_skipped,v_errors
  from public.news_intake_run_items
  where run_id=p_run_id;

  update public.news_intake_runs
  set status=p_status,
      completed_at=now(),
      discovered_count=v_discovered,
      classified_count=v_classified,
      duplicate_count=v_duplicates,
      created_count=v_created,
      merged_count=v_merged,
      review_count=v_review,
      skipped_count=v_skipped,
      error_count=v_errors,
      error_summary=nullif(left(coalesce(p_error,''),2000),'')
  where id=p_run_id
  returning * into v_run;

  update public.news_source_domains d
  set last_scanned_at=now(),updated_at=now()
  where d.hostname in (
    select distinct i.source_hostname
    from public.news_intake_run_items i
    where i.run_id=p_run_id
  );

  insert into public.admin_audit_logs(actor_id,action,target_type,target_id,details)
  values(auth.uid(),'news_intake.run_finish','news_intake_run',p_run_id::text,
    jsonb_build_object(
      'status',p_status,
      'discovered_count',v_discovered,
      'classified_count',v_classified,
      'duplicate_count',v_duplicates,
      'created_count',v_created,
      'merged_count',v_merged,
      'review_count',v_review,
      'skipped_count',v_skipped,
      'error_count',v_errors,
      'timestamp',clock_timestamp()
    ));

  return jsonb_build_object(
    'runId',v_run.id,
    'status',v_run.status,
    'sourceCount',v_run.source_count,
    'discoveredCount',v_run.discovered_count,
    'classifiedCount',v_run.classified_count,
    'duplicateCount',v_run.duplicate_count,
    'createdCount',v_run.created_count,
    'mergedCount',v_run.merged_count,
    'reviewCount',v_run.review_count,
    'skippedCount',v_run.skipped_count,
    'errorCount',v_run.error_count,
    'startedAt',v_run.started_at,
    'completedAt',v_run.completed_at
  );
end;
$function$;

revoke all on function public.admin_finish_news_intake_run(uuid,text,text) from public,anon;
grant execute on function public.admin_finish_news_intake_run(uuid,text,text) to authenticated;

create or replace function public.admin_get_news_intake_automation_dashboard()
returns jsonb
language plpgsql
stable security definer
set search_path to 'pg_catalog','public'
as $function$
declare
  v_sources jsonb;
  v_runs jsonb;
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
    'lastScannedAt',d.last_scanned_at
  ) order by d.scan_priority,d.publisher_name),'[]'::jsonb)
  into v_sources
  from public.news_source_domains d
  where d.active=true and d.scan_enabled=true and d.homepage_url is not null;

  select coalesce(jsonb_agg(run_payload order by started_at desc),'[]'::jsonb)
  into v_runs
  from (
    select r.started_at,
      jsonb_build_object(
        'runId',r.id,
        'status',r.status,
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

  return jsonb_build_object('sources',v_sources,'runs',v_runs);
end;
$function$;

revoke all on function public.admin_get_news_intake_automation_dashboard() from public,anon;
grant execute on function public.admin_get_news_intake_automation_dashboard() to authenticated;
