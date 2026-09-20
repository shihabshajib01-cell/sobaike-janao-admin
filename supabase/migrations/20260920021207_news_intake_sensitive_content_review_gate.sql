-- News Intake sensitive-content safety gate.
-- Sensitive sourced reports require explicit privacy review before publication.
-- Existing submitted sensitive sourced reports are quarantined for review.

CREATE OR REPLACE FUNCTION public.news_intake_privacy_review_required(p_subcategory_id text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT coalesce(p_subcategory_id,'') = ANY (ARRAY[
    'child_abduction_murder',
    'rape-sexual-violence',
    'sexual-harassment',
    'domestic-violence',
    'blackmail-coercion',
    'honeytrap'
  ]::text[]);
$function$;

CREATE OR REPLACE FUNCTION public.sourced_report_schema_validation_errors_internal(
  p_subcategory_id text,
  p_report jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_schema_id uuid;
  v_field record;
  v_value jsonb;
  v_text text;
  v_storage_key text;
  v_errors jsonb:=public.sourced_report_missing_required_fields_internal(p_subcategory_id,p_report);
  v_numeric numeric;
  v_min numeric;
  v_max numeric;
  v_min_length integer;
  v_max_length integer;
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
    return v_errors;
  end if;

  for v_field in
    select
      f.field_key,f.field_type,f.storage_mode,f.storage_key,
      f.label_en,f.label_bn,f.required,
      coalesce(f.validation,'{}'::jsonb) as validation,
      coalesce(f.options,'[]'::jsonb) as options
    from public.reporting_form_schema_fields f
    where f.schema_id=v_schema_id and f.active=true
    order by f.sort_order,f.id
  loop
    v_storage_key:=coalesce(nullif(btrim(v_field.storage_key),''),v_field.field_key);
    v_value:=null;

    if v_field.field_key='title' or v_storage_key='title' then
      v_value:=to_jsonb(coalesce(
        nullif(btrim(p_report->>'titleBn'),''),
        nullif(btrim(p_report->>'titleEn'),'')
      ));
    elsif v_field.field_key='description' or v_storage_key='description' then
      v_value:=to_jsonb(coalesce(
        nullif(btrim(p_report->>'descriptionBn'),''),
        nullif(btrim(p_report->>'descriptionEn'),'')
      ));
    elsif v_field.field_key='location' or v_storage_key='location' then
      if nullif(btrim(p_report->>'division'),'') is not null
         and nullif(btrim(p_report->>'district'),'') is not null then
        v_value:='true'::jsonb;
      end if;
    elsif v_field.field_key='mob_justice_details' or v_storage_key='mobJusticeDetails' then
      if jsonb_typeof(p_report->'mobJusticeDetails')='object'
         and p_report->'mobJusticeDetails'<>'{}'::jsonb then
        v_value:=p_report->'mobJusticeDetails';
      end if;
    else
      v_value:=coalesce(
        p_report -> v_storage_key,
        p_report -> v_field.field_key,
        p_report->'customFieldAnswers' -> v_storage_key,
        p_report->'customFieldAnswers' -> v_field.field_key
      );
    end if;

    if v_value is null
       or v_value='null'::jsonb
       or (jsonb_typeof(v_value)='string' and btrim(v_value#>>'{}')='')
       or (jsonb_typeof(v_value)='array' and jsonb_array_length(v_value)=0)
       or (jsonb_typeof(v_value)='object' and v_value='{}'::jsonb) then
      continue;
    end if;

    v_text:=case when jsonb_typeof(v_value)='string' then v_value#>>'{}' else v_value::text end;

    if v_field.field_type='checkbox' and v_field.required=true
       and lower(coalesce(v_text,''))<>'true' then
      v_errors:=v_errors || jsonb_build_array(jsonb_build_object(
        'fieldKey',v_field.field_key,'storageKey',v_storage_key,
        'labelEn',v_field.label_en,'labelBn',v_field.label_bn,'code','required_true'
      ));
      continue;
    end if;

    if v_field.field_type in ('select','radio') then
      if not exists(
        select 1 from jsonb_array_elements(v_field.options) opt
        where opt->>'value'=v_text
      ) then
        v_errors:=v_errors || jsonb_build_array(jsonb_build_object(
          'fieldKey',v_field.field_key,'storageKey',v_storage_key,
          'labelEn',v_field.label_en,'labelBn',v_field.label_bn,'code','invalid_option'
        ));
        continue;
      end if;
    elsif v_field.field_type='multiselect' then
      if jsonb_typeof(v_value)<>'array'
         or exists(
           select 1
           from jsonb_array_elements_text(
             case when jsonb_typeof(v_value)='array' then v_value else '[]'::jsonb end
           ) selected(value)
           where not exists(
             select 1 from jsonb_array_elements(v_field.options) opt
             where opt->>'value'=selected.value
           )
         ) then
        v_errors:=v_errors || jsonb_build_array(jsonb_build_object(
          'fieldKey',v_field.field_key,'storageKey',v_storage_key,
          'labelEn',v_field.label_en,'labelBn',v_field.label_bn,'code','invalid_option'
        ));
        continue;
      end if;
    end if;

    v_min_length:=nullif(v_field.validation->>'minLength','')::integer;
    v_max_length:=nullif(v_field.validation->>'maxLength','')::integer;

    if v_min_length is not null and char_length(v_text)<v_min_length then
      v_errors:=v_errors || jsonb_build_array(jsonb_build_object(
        'fieldKey',v_field.field_key,'storageKey',v_storage_key,
        'labelEn',v_field.label_en,'labelBn',v_field.label_bn,'code','min_length'
      ));
    end if;
    if v_max_length is not null and char_length(v_text)>v_max_length then
      v_errors:=v_errors || jsonb_build_array(jsonb_build_object(
        'fieldKey',v_field.field_key,'storageKey',v_storage_key,
        'labelEn',v_field.label_en,'labelBn',v_field.label_bn,'code','max_length'
      ));
    end if;

    if v_field.field_type in ('number','currency') then
      begin
        v_numeric:=v_text::numeric;
        v_min:=nullif(v_field.validation->>'min','')::numeric;
        v_max:=nullif(v_field.validation->>'max','')::numeric;
        if v_min is not null and v_numeric<v_min then
          v_errors:=v_errors || jsonb_build_array(jsonb_build_object(
            'fieldKey',v_field.field_key,'storageKey',v_storage_key,
            'labelEn',v_field.label_en,'labelBn',v_field.label_bn,'code','min'
          ));
        end if;
        if v_max is not null and v_numeric>v_max then
          v_errors:=v_errors || jsonb_build_array(jsonb_build_object(
            'fieldKey',v_field.field_key,'storageKey',v_storage_key,
            'labelEn',v_field.label_en,'labelBn',v_field.label_bn,'code','max'
          ));
        end if;
      exception when others then
        v_errors:=v_errors || jsonb_build_array(jsonb_build_object(
          'fieldKey',v_field.field_key,'storageKey',v_storage_key,
          'labelEn',v_field.label_en,'labelBn',v_field.label_bn,'code','invalid_number'
        ));
      end;
    elsif v_field.field_type='email'
       and v_text !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
      v_errors:=v_errors || jsonb_build_array(jsonb_build_object(
        'fieldKey',v_field.field_key,'storageKey',v_storage_key,
        'labelEn',v_field.label_en,'labelBn',v_field.label_bn,'code','invalid_email'
      ));
    elsif v_field.field_type='url'
       and v_text !~* '^https?://[^[:space:]]+$' then
      v_errors:=v_errors || jsonb_build_array(jsonb_build_object(
        'fieldKey',v_field.field_key,'storageKey',v_storage_key,
        'labelEn',v_field.label_en,'labelBn',v_field.label_bn,'code','invalid_url'
      ));
    elsif v_field.field_type='phone'
       and char_length(regexp_replace(v_text,'[^0-9]','','g')) not between 7 and 15 then
      v_errors:=v_errors || jsonb_build_array(jsonb_build_object(
        'fieldKey',v_field.field_key,'storageKey',v_storage_key,
        'labelEn',v_field.label_en,'labelBn',v_field.label_bn,'code','invalid_phone'
      ));
    end if;
  end loop;

  return v_errors;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_preview_sourced_report_intake(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_source_check jsonb;
  v_duplicate jsonb;
  v_report jsonb:=coalesce(p_payload->'report','{}'::jsonb);
  v_incident_date date;
  v_subcategory text:=nullif(btrim(v_report->>'subcategoryId'),'');
  v_district text:=nullif(btrim(v_report->>'district'),'');
  v_safe_candidates jsonb:='[]'::jsonb;
  v_missing_fields jsonb:='[]'::jsonb;
  v_privacy_review_required boolean:=false;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role'
     and (not public.is_active_admin() or not public.has_permission('complaints.publish')) then
    raise exception 'Access denied.' using errcode='42501';
  end if;

  v_source_check:=public.admin_check_news_source_domain(p_payload#>>'{source,canonicalUrl}');
  if coalesce((v_source_check->>'approved')::boolean,false) is not true then
    raise exception 'SOURCE_DOMAIN_NOT_APPROVED: Source domain is not in the approved news-source registry.'
      using errcode='22023';
  end if;

  if v_subcategory is not null then
    v_missing_fields:=public.sourced_report_schema_validation_errors_internal(
      v_subcategory,
      v_report
    );
    v_privacy_review_required:=public.news_intake_privacy_review_required(v_subcategory);
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
    'privacyReviewRequired',v_privacy_review_required,
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
      and (
        not v_privacy_review_required
        or lower(coalesce(v_report#>>'{customFieldAnswers,sensitiveContentReviewed}','false'))='true'
      )
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_create_sourced_report_from_intake(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_report jsonb:=coalesce(p_payload->'report','{}'::jsonb);
  v_source jsonb:=coalesce(p_payload->'source','{}'::jsonb);
  v_preview jsonb;
  v_segment text:=nullif(btrim(v_report->>'segmentId'),'');
  v_subcategory text:=nullif(btrim(v_report->>'subcategoryId'),'');
  v_title text:=nullif(btrim(v_report->>'titleBn'),'');
  v_title_en text:=nullif(btrim(v_report->>'titleEn'),'');
  v_description text:=nullif(btrim(v_report->>'descriptionBn'),'');
  v_description_en text:=nullif(btrim(v_report->>'descriptionEn'),'');
  v_incident_date date;
  v_incident_time time;
  v_utility_end_time time;
  v_frequency text:=coalesce(nullif(btrim(v_report->>'frequency'),''),'one-time');
  v_priority text:=coalesce(nullif(btrim(v_report->>'priority'),''),'medium');
  v_division text:=nullif(btrim(v_report->>'division'),'');
  v_district text:=nullif(btrim(v_report->>'district'),'');
  v_upazila text:=nullif(btrim(v_report->>'upazilaOrThana'),'');
  v_area text:=nullif(btrim(v_report->>'area'),'');
  v_road text:=nullif(btrim(v_report->>'road'),'');
  v_landmark text:=nullif(btrim(v_report->>'landmark'),'');
  v_address text:=nullif(btrim(v_report->>'formattedAddress'),'');
  v_schema_version integer;
  v_report_id text;
  v_year text;
  v_attempt integer:=0;
  v_source_type text:=coalesce(nullif(btrim(v_source->>'sourceType'),''),'news');
  v_publisher text:=nullif(btrim(v_source->>'publisherName'),'');
  v_source_title text:=nullif(btrim(v_source->>'sourceTitle'),'');
  v_url text:=nullif(btrim(v_source->>'canonicalUrl'),'');
  v_source_date date;
  v_duplicate jsonb;
  v_privacy_review_required boolean:=false;
  v_answers jsonb:=case when jsonb_typeof(v_report->'customFieldAnswers')='object'
    then v_report->'customFieldAnswers' else '{}'::jsonb end;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role'
     and (not public.is_active_admin() or not public.has_permission('complaints.publish')) then
    raise exception 'Access denied.' using errcode='42501';
  end if;

  v_preview:=public.admin_preview_sourced_report_intake(p_payload);
  v_publisher:=coalesce(
    nullif(btrim(v_preview#>>'{sourceDomain,publisherName}'),''),
    v_publisher
  );
  if jsonb_array_length(coalesce(v_preview#>'{duplicate,exactSourceDuplicates}','[]'::jsonb))>0 then
    raise exception 'SOURCE_ALREADY_EXISTS: This canonical source is already attached to an existing report.'
      using errcode='23505';
  end if;

  if coalesce((v_preview#>>'{schemaValidation,ready}')::boolean,false) is not true then
    raise exception 'SOURCE_SCHEMA_VALIDATION_FAILED: The sourced report does not satisfy the currently published reporting schema.'
      using errcode='22023';
  end if;

  if v_segment is null or v_subcategory is null or v_title is null
     or v_description is null or v_division is null or v_district is null then
    raise exception 'Category, subcategory, Bangla title, Bangla description, division, and district are required.'
      using errcode='22023';
  end if;

  if char_length(v_title)>100 then
    raise exception 'Bangla title cannot exceed 100 characters.' using errcode='22023';
  end if;
  if v_title_en is not null and char_length(v_title_en)>100 then
    raise exception 'English title cannot exceed 100 characters.' using errcode='22023';
  end if;
  if char_length(v_description)>2000
     or (v_description_en is not null and char_length(v_description_en)>2000) then
    raise exception 'Descriptions cannot exceed 2000 characters.' using errcode='22023';
  end if;

  begin
    v_incident_date:=(v_report->>'incidentDate')::date;
    if nullif(btrim(v_report->>'incidentTime'),'') is not null then
      v_incident_time:=(v_report->>'incidentTime')::time;
    end if;
    if nullif(btrim(v_report->>'utilityEndTime'),'') is not null then
      v_utility_end_time:=(v_report->>'utilityEndTime')::time;
    end if;
    if nullif(btrim(v_source->>'sourcePublishedDate'),'') is not null then
      v_source_date:=(v_source->>'sourcePublishedDate')::date;
    end if;
  exception when others then
    raise exception 'One or more supplied date/time values are invalid.' using errcode='22023';
  end;

  if not exists(
    select 1
    from public.subcategories sc
    join public.segments sg on sg.id=sc.segment_id
    where sc.id=v_subcategory and sc.segment_id=v_segment
      and sc.active=true and sg.active=true
      and sc.config_status='published' and sg.config_status='published'
  ) then
    raise exception 'Selected category/subcategory is not currently published for reporting.'
      using errcode='22023';
  end if;

  v_privacy_review_required:=public.news_intake_privacy_review_required(v_subcategory);

  select r.version into v_schema_version
  from public.reporting_form_schemas r
  where r.scope_type='subcategory' and r.scope_id=v_subcategory
    and r.status='published' and r.engine_mode='schema'
  order by r.version desc limit 1;

  if v_source_type not in ('news','official','social','article','other') then
    raise exception 'Invalid source type.' using errcode='22023';
  end if;
  if v_publisher is null or v_url is null or v_url !~ '^https://[^/]+/.+' then
    raise exception 'Publisher name and a valid HTTPS source URL are required.' using errcode='22023';
  end if;

  v_year:=to_char(now(),'YYYY');
  loop
    v_attempt:=v_attempt+1;
    v_report_id:='SJ-'||v_year||'-'||floor(100000+random()*900000)::integer::text;
    exit when not exists(select 1 from public.complaints where id=v_report_id);
    if v_attempt>=50 then raise exception 'REPORT_ID_GENERATION_FAILED'; end if;
  end loop;

  insert into public.complaints(
    id,segment_id,subcategory_id,title,title_en,description,description_en,
    incident_date,incident_time,utility_end_time,frequency,status,priority,
    privacy_choice,confirm_public_identity,
    division,district,upazila_or_thana,area,road,landmark,formatted_address,
    relationship_context,recent_bill_month,recent_bill_amount,
    previous_bill_month,previous_bill_amount,
    bribery_department,bribery_service,bribery_amount,
    affected_person_age_group,alleged_abuser_relationship,reporting_for,
    sexual_harassment_type,sexual_harassment_context,sexual_harassment_institution,
    intimate_what_happened,intimate_platform,mob_justice_details,
    form_schema_version,custom_field_answers,origin_type,created_at,updated_at
  ) values (
    v_report_id,v_segment,v_subcategory,v_title,v_title_en,v_description,v_description_en,
    v_incident_date,v_incident_time,v_utility_end_time,v_frequency,'submitted',v_priority,
    'anonymous',false,
    v_division,v_district,v_upazila,v_area,v_road,v_landmark,v_address,
    nullif(btrim(v_report->>'relationshipContext'),''),
    nullif(btrim(v_report->>'recentBillMonth'),''),
    nullif(v_report->>'recentBillAmount','')::numeric,
    nullif(btrim(v_report->>'previousBillMonth'),''),
    nullif(v_report->>'previousBillAmount','')::numeric,
    nullif(btrim(v_report->>'briberyDepartment'),''),
    nullif(btrim(v_report->>'briberyService'),''),
    nullif(v_report->>'briberyAmount','')::numeric,
    nullif(btrim(v_report->>'affectedPersonAgeGroup'),''),
    nullif(btrim(v_report->>'allegedAbuserRelationship'),''),
    nullif(btrim(v_report->>'reportingFor'),''),
    nullif(btrim(v_report->>'sexualHarassmentType'),''),
    nullif(btrim(v_report->>'sexualHarassmentContext'),''),
    nullif(btrim(v_report->>'sexualHarassmentInstitution'),''),
    case when nullif(btrim(v_report->>'intimateWhatHappened'),'') is null
      then null else to_jsonb(btrim(v_report->>'intimateWhatHappened')) end,
    case when nullif(btrim(v_report->>'intimatePlatform'),'') is null
      then null else to_jsonb(btrim(v_report->>'intimatePlatform')) end,
    case when jsonb_typeof(v_report->'mobJusticeDetails')='object'
      then v_report->'mobJusticeDetails' else null end,
    v_schema_version,
    v_answers,
    'sourced_report',now(),now()
  );

  insert into public.complaint_sources(
    complaint_id,source_type,publisher_name,source_title,canonical_url,
    source_published_date,verification_status,is_final_detail_page,
    source_version,verification_note,verified_at,verified_by
  ) values (
    v_report_id,v_source_type,v_publisher,v_source_title,v_url,
    v_source_date,'verified',true,1,
    'Verified through Admin News Intake.',now(),auth.uid()
  );

  insert into public.complaint_updates(complaint_id,update_type,note,is_public,created_at)
  values(v_report_id,'submitted','Sourced report created through Admin News Intake.',false,now());

  v_duplicate:=public.evaluate_sourced_report_duplicate_internal(v_report_id);

  insert into public.admin_audit_logs(actor_id,action,target_type,target_id,details)
  values(auth.uid(),'sourced_report.intake_create','complaint',v_report_id,jsonb_build_object(
    'canonical_url',v_url,
    'publisher_name',v_publisher,
    'duplicate_preview_status',v_preview#>>'{duplicate,status}',
    'candidate_ids',coalesce((
      select jsonb_agg(item->>'complaintId')
      from jsonb_array_elements(coalesce(v_preview#>'{duplicate,candidates}','[]'::jsonb)) item
    ),'[]'::jsonb),
    'timestamp',clock_timestamp()
  ));

  return jsonb_build_object(
    'success',true,
    'reportId',v_report_id,
    'status','submitted',
    'duplicate',v_duplicate,
    'canPublishImmediately',
      (v_duplicate->>'status')='clear'
      and lower(coalesce(v_answers->>'newsIntakeReviewRequired','false'))<>'true'
      and (not v_privacy_review_required or lower(coalesce(v_answers->>'sensitiveContentReviewed','false'))='true')
  );
exception
  when unique_violation then
    raise exception 'SOURCE_ALREADY_EXISTS: This canonical source is already attached to another report.'
      using errcode='23505';
end;
$function$
;

CREATE OR REPLACE FUNCTION public.guard_sourced_report_publish_readiness()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_privacy_review_required boolean:=false;
begin
  if new.origin_type = 'sourced_report'
     and new.status = 'published'
     and old.status is distinct from 'published' then

    if coalesce(new.custom_field_answers->>'newsIntakeReviewRequired','false') = 'true' then
      raise exception 'SOURCE_GROUNDING_REVIEW_REQUIRED: This sourced report is flagged for source-grounding review before publication.'
        using errcode='22023';
    end if;

    v_privacy_review_required:=public.news_intake_privacy_review_required(new.subcategory_id);

    if v_privacy_review_required
       and lower(coalesce(new.custom_field_answers->>'sensitiveContentReviewed','false')) <> 'true' then
      raise exception 'SOURCE_SENSITIVE_CONTENT_REVIEW_REQUIRED: Review the public title, summary, location, and identifying details before publishing this sensitive sourced report.'
        using errcode='22023';
    end if;
  end if;

  return new;
end;
$function$;


update public.complaints c
set custom_field_answers =
      coalesce(c.custom_field_answers,'{}'::jsonb)
      || jsonb_build_object('newsIntakeReviewRequired',true)
      || case
           when nullif(btrim(c.custom_field_answers->>'newsIntakeReviewReason'),'') is null
           then jsonb_build_object(
             'newsIntakeReviewReason',
             'sensitive_content_privacy_review_required'
           )
           else '{}'::jsonb
         end,
    updated_at=now()
where c.origin_type='sourced_report'
  and c.status='submitted'
  and public.news_intake_privacy_review_required(c.subcategory_id)
  and lower(coalesce(c.custom_field_answers->>'sensitiveContentReviewed','false'))<>'true';

