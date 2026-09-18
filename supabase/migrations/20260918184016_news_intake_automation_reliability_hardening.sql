
alter table public.news_source_domains
  add column if not exists automation_note text;

alter table public.news_intake_run_items
  add column if not exists item_kind text not null default 'article';

alter table public.news_intake_run_items
  drop constraint if exists news_intake_run_items_item_kind_check,
  add constraint news_intake_run_items_item_kind_check
    check (item_kind in ('source','article'));

update public.news_source_domains
set scan_enabled=false,
    automation_note='Trusted source; automated server-side reading is unavailable or unreliable, so use manual News Intake for this publisher.',
    updated_at=now()
where hostname in (
  'www.jugantor.com',
  'www.kalerkantho.com',
  'www.ittefaq.com.bd',
  'www.jagonews24.com',
  'www.banglatribune.com',
  'www.dhakatribune.com',
  'bonikbarta.com',
  'www.newagebd.net',
  'www.bssnews.net'
);

update public.news_source_domains
set scan_enabled=false,
    homepage_url=null,
    automation_note='Legacy Samakal discovery alias; canonical automated source is samakal.com.',
    updated_at=now()
where hostname='onlinebn.samakal24.com';

insert into public.news_source_domains(
  hostname,publisher_name,active,homepage_url,language_hint,scan_enabled,scan_priority,automation_note
) values
  ('samakal.com','Samakal',true,'https://samakal.com/','bn',true,16,null),
  ('www.samakal.com','Samakal',true,null,'bn',false,90,'Redirect alias for Samakal.')
on conflict(hostname) do update
set publisher_name=excluded.publisher_name,
    active=true,
    homepage_url=excluded.homepage_url,
    language_hint=excluded.language_hint,
    scan_enabled=excluded.scan_enabled,
    scan_priority=excluded.scan_priority,
    automation_note=excluded.automation_note,
    updated_at=now();

update public.news_source_domains
set automation_note=null,updated_at=now()
where active=true and scan_enabled=true and homepage_url is not null;

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
  v_item_kind text:=coalesce(nullif(btrim(p_item->>'itemKind'),''),'article');
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
  if v_item_kind not in ('source','article') then
    raise exception 'Invalid News Intake item kind.' using errcode='22023';
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
    run_id,item_kind,source_hostname,publisher_name,canonical_url,source_title,
    source_published_date,content_language,segment_id,subcategory_id,
    confidence,duplicate_status,action,report_id,reason
  ) values (
    p_run_id,
    v_item_kind,
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
  set item_kind=excluded.item_kind,
      source_title=excluded.source_title,
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
    count(*) filter(where item_kind='article')::integer,
    count(*) filter(where item_kind='article' and segment_id is not null and subcategory_id is not null)::integer,
    count(*) filter(where item_kind='article' and action in ('skip_duplicate','merged_source'))::integer,
    count(*) filter(where item_kind='article' and action='created_draft')::integer,
    count(*) filter(where item_kind='article' and action='merged_source')::integer,
    count(*) filter(where item_kind='article' and action='needs_review')::integer,
    count(*) filter(where item_kind='article' and action='skip_duplicate')::integer,
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

create or replace function public.admin_preview_sourced_report_intake(p_payload jsonb)
returns jsonb
language plpgsql
stable security definer
set search_path to 'pg_catalog','public'
as $function$
declare
  v_source_check jsonb;
  v_duplicate jsonb;
  v_report jsonb:=coalesce(p_payload->'report','{}'::jsonb);
  v_incident_date date;
  v_subcategory text:=nullif(btrim(v_report->>'subcategoryId'),'');
  v_district text:=nullif(btrim(v_report->>'district'),'');
  v_safe_candidates jsonb:='[]'::jsonb;
begin
  if not public.is_active_admin() or not public.has_permission('complaints.publish') then
    raise exception 'Access denied.' using errcode='42501';
  end if;

  v_source_check:=public.admin_check_news_source_domain(p_payload#>>'{source,canonicalUrl}');
  if coalesce((v_source_check->>'approved')::boolean,false) is not true then
    raise exception 'SOURCE_DOMAIN_NOT_APPROVED: Source domain is not in the approved news-source registry.'
      using errcode='22023';
  end if;

  v_duplicate:=public.evaluate_sourced_report_candidate_internal(p_payload);

  if coalesce(v_duplicate->>'status','clear')='clear'
     and v_subcategory is not null
     and v_district is not null then
    begin
      v_incident_date:=(v_report->>'incidentDate')::date;
    exception when others then
      v_incident_date:=null;
    end;

    if v_incident_date is not null then
      select coalesce(jsonb_agg(jsonb_build_object(
        'complaintId',q.id,
        'status',q.status,
        'titleBn',q.title,
        'titleEn',q.title_en,
        'segmentId',q.segment_id,
        'subcategoryId',q.subcategory_id,
        'incidentDate',to_char(q.incident_date,'YYYY-MM-DD'),
        'district',q.district,
        'upazilaOrThana',q.upazila_or_thana,
        'area',q.area,
        'score',60,
        'titleSimilarity',0,
        'matchLevel','review',
        'reasons',jsonb_build_array(
          'same_subcategory',
          'same_incident_date',
          'same_district',
          'cross_language_safe_review'
        ),
        'sources',(
          select coalesce(jsonb_agg(jsonb_build_object(
            'publisherName',cs.publisher_name,
            'sourceTitle',cs.source_title,
            'canonicalUrl',cs.canonical_url,
            'sourcePublishedDate',to_char(cs.source_published_date,'YYYY-MM-DD')
          ) order by cs.created_at),'[]'::jsonb)
          from public.complaint_sources cs
          where cs.complaint_id=q.id
        )
      ) order by q.created_at desc),'[]'::jsonb)
      into v_safe_candidates
      from (
        select c.*
        from public.complaints c
        where c.origin_type='sourced_report'
          and c.status in ('submitted','published','unpublished','edited')
          and c.subcategory_id=v_subcategory
          and c.incident_date=v_incident_date
          and public.normalize_duplicate_text(c.district)=public.normalize_duplicate_text(v_district)
        order by c.created_at desc
        limit 5
      ) q;

      if jsonb_array_length(v_safe_candidates)>0 then
        v_duplicate:=v_duplicate || jsonb_build_object(
          'status','review',
          'requiresReview',true,
          'candidateCount',jsonb_array_length(v_safe_candidates),
          'reviewCount',jsonb_array_length(v_safe_candidates),
          'candidates',v_safe_candidates
        );
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'sourceDomain',v_source_check,
    'duplicate',v_duplicate,
    'canCreateDraft',jsonb_array_length(coalesce(v_duplicate->'exactSourceDuplicates','[]'::jsonb))=0,
    'canPublishImmediately',coalesce(v_duplicate->>'status','clear')='clear'
  );
end;
$function$;

revoke all on function public.admin_preview_sourced_report_intake(jsonb) from public,anon;
grant execute on function public.admin_preview_sourced_report_intake(jsonb) to authenticated;

create or replace function public.guard_automated_sourced_report_collision()
returns trigger
language plpgsql
set search_path to 'pg_catalog','public'
as $function$
begin
  if new.origin_type='sourced_report'
     and coalesce(new.custom_field_answers->>'automatedIntake','false')='true'
     and exists(
       select 1
       from public.complaints c
       where c.origin_type='sourced_report'
         and c.status in ('submitted','published','unpublished','edited')
         and c.subcategory_id=new.subcategory_id
         and c.incident_date=new.incident_date
         and public.normalize_duplicate_text(c.district)=public.normalize_duplicate_text(new.district)
     ) then
    raise exception 'DUPLICATE_REVIEW_REQUIRED: Automated sourced report collides with an existing same-category, same-date, same-district report.'
      using errcode='23505';
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_guard_automated_sourced_report_collision on public.complaints;
create trigger trg_guard_automated_sourced_report_collision
before insert on public.complaints
for each row
execute function public.guard_automated_sourced_report_collision();

revoke all on function public.guard_automated_sourced_report_collision() from public,anon,authenticated;

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
    'scanEnabled',d.scan_enabled,
    'automationNote',d.automation_note,
    'lastScannedAt',d.last_scanned_at
  ) order by case when d.scan_enabled then 0 else 1 end,d.scan_priority,d.publisher_name),'[]'::jsonb)
  into v_sources
  from public.news_source_domains d
  where d.active=true and d.homepage_url is not null;

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

  return jsonb_build_object('sources',v_sources,'runs',v_runs);
end;
$function$;

revoke all on function public.admin_get_news_intake_automation_dashboard() from public,anon;
grant execute on function public.admin_get_news_intake_automation_dashboard() to authenticated;
