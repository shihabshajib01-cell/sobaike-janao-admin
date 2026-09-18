
create or replace function public.sourced_report_missing_required_fields_internal(
  p_subcategory_id text,
  p_report jsonb
)
returns jsonb
language plpgsql
stable
set search_path to 'pg_catalog','public'
as $function$
declare
  v_schema_id uuid;
  v_field record;
  v_value jsonb;
  v_missing jsonb:='[]'::jsonb;
  v_storage_key text;
  v_field_key text;
begin
  select r.id into v_schema_id
  from public.reporting_form_schemas r
  where r.scope_type='subcategory'
    and r.scope_id=p_subcategory_id
    and r.status='published'
    and r.engine_mode='schema'
  order by r.version desc
  limit 1;

  if v_schema_id is null then
    return '[]'::jsonb;
  end if;

  for v_field in
    select f.field_key,f.storage_key,f.storage_mode,f.label_en,f.label_bn
    from public.reporting_form_schema_fields f
    where f.schema_id=v_schema_id
      and f.active=true
      and f.required=true
    order by f.sort_order,f.id
  loop
    v_storage_key:=coalesce(nullif(btrim(v_field.storage_key),''),v_field.field_key);
    v_field_key:=v_field.field_key;
    v_value:=null;

    if v_field_key='title' or v_storage_key='title' then
      v_value:=to_jsonb(coalesce(nullif(btrim(p_report->>'titleBn'),''),nullif(btrim(p_report->>'titleEn'),'')));
    elsif v_field_key='description' or v_storage_key='description' then
      v_value:=to_jsonb(coalesce(nullif(btrim(p_report->>'descriptionBn'),''),nullif(btrim(p_report->>'descriptionEn'),'')));
    elsif v_field_key='location' or v_storage_key='location' or v_field.storage_mode='system_block' and v_field.field_key='location' then
      if nullif(btrim(p_report->>'division'),'') is not null
         and nullif(btrim(p_report->>'district'),'') is not null then
        v_value:='true'::jsonb;
      end if;
    elsif v_field_key='mob_justice_details' or v_storage_key='mobJusticeDetails' then
      if jsonb_typeof(p_report->'mobJusticeDetails')='object'
         and p_report->'mobJusticeDetails'<>'{}'::jsonb then
        v_value:=p_report->'mobJusticeDetails';
      end if;
    else
      v_value:=coalesce(
        p_report->v_storage_key,
        p_report->v_field_key,
        p_report->'customFieldAnswers'->v_storage_key,
        p_report->'customFieldAnswers'->v_field_key
      );
    end if;

    if v_value is null
       or v_value='null'::jsonb
       or (jsonb_typeof(v_value)='string' and btrim(v_value#>>'{}')='')
       or (jsonb_typeof(v_value)='array' and jsonb_array_length(v_value)=0)
       or (jsonb_typeof(v_value)='object' and v_value='{}'::jsonb) then
      v_missing:=v_missing || jsonb_build_array(jsonb_build_object(
        'fieldKey',v_field_key,
        'storageKey',v_storage_key,
        'labelEn',v_field.label_en,
        'labelBn',v_field.label_bn
      ));
    end if;
  end loop;

  return v_missing;
end;
$function$;

revoke all on function public.sourced_report_missing_required_fields_internal(text,jsonb)
from public,anon,authenticated;

create or replace function public.guard_sourced_report_schema_requirements()
returns trigger
language plpgsql
set search_path to 'pg_catalog','public'
as $function$
declare
  v_report jsonb;
  v_missing jsonb;
begin
  if new.origin_type<>'sourced_report' then
    return new;
  end if;

  v_report:=jsonb_build_object(
    'titleBn',new.title,
    'titleEn',new.title_en,
    'descriptionBn',new.description,
    'descriptionEn',new.description_en,
    'division',new.division,
    'district',new.district,
    'upazilaOrThana',new.upazila_or_thana,
    'area',new.area,
    'frequency',new.frequency,
    'incidentTime',case when new.incident_time is null then null else to_jsonb(new.incident_time::text) end,
    'utilityEndTime',case when new.utility_end_time is null then null else to_jsonb(new.utility_end_time::text) end,
    'recentBillMonth',new.recent_bill_month,
    'recentBillAmount',new.recent_bill_amount,
    'previousBillMonth',new.previous_bill_month,
    'previousBillAmount',new.previous_bill_amount,
    'briberyDepartment',new.bribery_department,
    'briberyService',new.bribery_service,
    'briberyAmount',new.bribery_amount,
    'affectedPersonAgeGroup',new.affected_person_age_group,
    'allegedAbuserRelationship',new.alleged_abuser_relationship,
    'reportingFor',new.reporting_for,
    'sexualHarassmentType',new.sexual_harassment_type,
    'sexualHarassmentContext',new.sexual_harassment_context,
    'sexualHarassmentInstitution',new.sexual_harassment_institution,
    'intimateWhatHappened',new.intimate_what_happened,
    'intimatePlatform',new.intimate_platform,
    'mobJusticeDetails',new.mob_justice_details,
    'customFieldAnswers',coalesce(new.custom_field_answers,'{}'::jsonb)
  );

  v_missing:=public.sourced_report_missing_required_fields_internal(
    new.subcategory_id,
    v_report
  );

  if jsonb_array_length(v_missing)>0 then
    raise exception 'SCHEMA_REQUIRED_FIELDS_MISSING: %',v_missing::text
      using errcode='P0001';
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_guard_sourced_report_schema_requirements on public.complaints;
create trigger trg_guard_sourced_report_schema_requirements
before insert or update on public.complaints
for each row
execute function public.guard_sourced_report_schema_requirements();

revoke all on function public.guard_sourced_report_schema_requirements()
from public,anon,authenticated;

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
  v_missing_fields jsonb:='[]'::jsonb;
begin
  if not public.is_active_admin() or not public.has_permission('complaints.publish') then
    raise exception 'Access denied.' using errcode='42501';
  end if;

  v_source_check:=public.admin_check_news_source_domain(p_payload#>>'{source,canonicalUrl}');
  if coalesce((v_source_check->>'approved')::boolean,false) is not true then
    raise exception 'SOURCE_DOMAIN_NOT_APPROVED: Source domain is not in the approved news-source registry.'
      using errcode='22023';
  end if;

  if v_subcategory is not null then
    v_missing_fields:=public.sourced_report_missing_required_fields_internal(
      v_subcategory,
      v_report
    );
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
    'schemaValidation',jsonb_build_object(
      'ready',jsonb_array_length(v_missing_fields)=0,
      'missingFields',v_missing_fields
    ),
    'canCreateDraft',
      jsonb_array_length(coalesce(v_duplicate->'exactSourceDuplicates','[]'::jsonb))=0
      and jsonb_array_length(v_missing_fields)=0,
    'canPublishImmediately',
      coalesce(v_duplicate->>'status','clear')='clear'
      and jsonb_array_length(v_missing_fields)=0
  );
end;
$function$;

revoke all on function public.admin_preview_sourced_report_intake(jsonb) from public,anon;
grant execute on function public.admin_preview_sourced_report_intake(jsonb) to authenticated;
