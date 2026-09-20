-- Support category-matched review items without creating unsafe complaint drafts.
-- Matched News Intake items can carry an admin-only staged payload that
-- pre-fills the published report form and identifies fields requiring review.

ALTER TABLE public.news_intake_run_items
  ADD COLUMN IF NOT EXISTS review_payload jsonb;

ALTER TABLE public.news_intake_run_items
  DROP CONSTRAINT IF EXISTS news_intake_run_items_review_payload_object_check;

ALTER TABLE public.news_intake_run_items
  ADD CONSTRAINT news_intake_run_items_review_payload_object_check
  CHECK (
    review_payload IS NULL
    OR jsonb_typeof(review_payload) = 'object'
  );

CREATE OR REPLACE FUNCTION public.admin_record_news_intake_item(
  p_run_id uuid,
  p_item jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_run public.news_intake_runs%rowtype;
  v_source_date date;
  v_confidence numeric;
  v_id uuid;
  v_url text:=nullif(btrim(p_item->>'canonicalUrl'),'');
  v_action text:=nullif(btrim(p_item->>'action'),'');
  v_report_id text:=nullif(btrim(p_item->>'reportId'),'');
  v_item_kind text:=coalesce(nullif(btrim(p_item->>'itemKind'),''),'article');
  v_review_payload jsonb:=case
    when jsonb_typeof(p_item->'reviewPayload')='object' then p_item->'reviewPayload'
    else null
  end;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role'
     and (not public.is_active_admin() or not public.has_permission('complaints.publish')) then
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
  if v_review_payload is not null and octet_length(v_review_payload::text)>65536 then
    raise exception 'News Intake review payload is too large.' using errcode='22023';
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
    confidence,duplicate_status,action,report_id,reason,review_payload
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
    nullif(btrim(p_item->>'reason'),''),
    v_review_payload
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
      reason=excluded.reason,
      review_payload=excluded.review_payload
  returning id into v_id;

  return jsonb_build_object('id',v_id,'runId',p_run_id);
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_news_intake_automation_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
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
            'reason',i.reason,
            'reviewPayload',i.review_payload
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

CREATE OR REPLACE FUNCTION public.admin_complete_news_intake_item_review(
  p_item_id uuid,
  p_report_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_item public.news_intake_run_items%rowtype;
  v_report public.complaints%rowtype;
  v_duplicate jsonb;
  v_duplicate_status text;
  v_review_required boolean;
  v_action text;
  v_reason text;
begin
  if not public.is_active_admin() or not public.has_permission('complaints.publish') then
    raise exception 'Access denied.' using errcode='42501';
  end if;

  select * into v_item
  from public.news_intake_run_items
  where id=p_item_id
  for update;

  if v_item.id is null then
    raise exception 'News Intake item not found.' using errcode='P0002';
  end if;
  if v_item.item_kind<>'article' or v_item.segment_id is null or v_item.subcategory_id is null then
    raise exception 'Only category-matched article items can complete review.' using errcode='22023';
  end if;

  select * into v_report
  from public.complaints
  where id=p_report_id
  for update;

  if v_report.id is null or v_report.origin_type<>'sourced_report' then
    raise exception 'Reviewed sourced report not found.' using errcode='P0002';
  end if;
  if v_report.segment_id is distinct from v_item.segment_id
     or v_report.subcategory_id is distinct from v_item.subcategory_id then
    raise exception 'Reviewed report category no longer matches the intake item.' using errcode='22023';
  end if;
  if not exists(
    select 1
    from public.complaint_sources s
    where s.complaint_id=v_report.id
      and public.normalize_source_url(s.canonical_url)=public.normalize_source_url(v_item.canonical_url)
  ) then
    raise exception 'Reviewed report does not contain the intake source URL.' using errcode='22023';
  end if;

  v_duplicate:=public.evaluate_sourced_report_duplicate_internal(v_report.id);
  v_duplicate_status:=coalesce(v_duplicate->>'status','unavailable');
  v_review_required:=
    lower(coalesce(v_report.custom_field_answers->>'newsIntakeReviewRequired','false'))='true'
    or (
      public.news_intake_privacy_review_required(v_report.subcategory_id)
      and lower(coalesce(v_report.custom_field_answers->>'sensitiveContentReviewed','false'))<>'true'
    );

  if v_report.status='published' then
    v_action:='created_draft';
    v_reason:='Reviewed report is already published.';
  elsif v_report.status='submitted'
        and v_duplicate_status='clear'
        and not v_review_required then
    v_action:='created_draft';
    v_reason:='Manual review completed; report is ready for publication.';
  else
    v_action:='needs_review';
    v_reason:='Manual review saved, but server readiness checks still require review.';
  end if;

  update public.news_intake_run_items
  set report_id=v_report.id,
      action=v_action,
      duplicate_status=v_duplicate_status,
      reason=v_reason,
      review_payload=null
  where id=v_item.id;

  return jsonb_build_object(
    'success',true,
    'itemId',v_item.id,
    'reportId',v_report.id,
    'action',v_action,
    'duplicateStatus',v_duplicate_status,
    'ready',v_action='created_draft' and v_report.status='submitted' and not v_review_required
  );
end;
$function$;

REVOKE ALL ON FUNCTION public.admin_complete_news_intake_item_review(uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_complete_news_intake_item_review(uuid,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_complete_news_intake_item_review(uuid,text) TO authenticated;
