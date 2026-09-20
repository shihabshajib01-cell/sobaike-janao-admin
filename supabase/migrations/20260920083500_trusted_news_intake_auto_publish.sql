-- Trusted approved-source automation for News Intake.
-- Citizen/manual report rules remain unchanged. Only reports created through the
-- approved-source automation path receive trustedSourceAuto=true.

create or replace function public.validate_configured_complaint_answers()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_schema public.reporting_form_schemas%rowtype;
  v_field public.reporting_form_schema_fields%rowtype;
  v_value jsonb;
  v_text text;
  v_num numeric;
  v_digits text;
begin
  if new.form_schema_version is null then
    return new;
  end if;

  select *
  into v_schema
  from public.reporting_form_schemas
  where scope_type='subcategory'
    and scope_id=new.subcategory_id
    and version=new.form_schema_version
    and status in ('published','archived')
  order by case status when 'published' then 0 else 1 end
  limit 1;

  if v_schema.id is null then
    raise exception 'VALIDATION_FAILED: Reporting form schema version is not available.';
  end if;

  if new.custom_field_answers is null
     or jsonb_typeof(new.custom_field_answers) <> 'object' then
    raise exception 'VALIDATION_FAILED: customFieldAnswers must be an object.';
  end if;

  for v_field in
    select *
    from public.reporting_form_schema_fields
    where schema_id=v_schema.id
      and active=true
      and storage_mode='custom_json'
    order by sort_order,field_key
  loop
    v_value := new.custom_field_answers->v_field.storage_key;

    if v_field.required
       and not (
         lower(coalesce(new.custom_field_answers->>'trustedSourceAuto','false'))='true'
         and coalesce(new.custom_field_answers->>'sourceTruthMode','')='approved_publisher'
       ) then
      if v_value is null
         or v_value='null'::jsonb
         or (jsonb_typeof(v_value)='string' and nullif(btrim(v_value#>>'{}'),'') is null)
         or (jsonb_typeof(v_value)='array' and jsonb_array_length(v_value)=0)
         or (v_field.field_type='checkbox' and v_value='false'::jsonb)
      then
        raise exception 'VALIDATION_FAILED: Required field % is missing.', v_field.label_en;
      end if;
    end if;

    if v_value is null or v_value='null'::jsonb then
      continue;
    end if;

    if v_field.field_type='checkbox' then
      if jsonb_typeof(v_value) <> 'boolean' then
        raise exception 'VALIDATION_FAILED: Field % must be true or false.', v_field.label_en;
      end if;
      continue;
    end if;

    if v_field.field_type in ('text','textarea','phone','email','url','date','time','month','select','radio') then
      if jsonb_typeof(v_value) <> 'string' then
        raise exception 'VALIDATION_FAILED: Field % must contain text.', v_field.label_en;
      end if;

      v_text := nullif(btrim(v_value#>>'{}'),'');
      if v_text is not null
         and (v_field.validation ? 'minLength')
         and length(v_text) < (v_field.validation->>'minLength')::integer then
        raise exception 'VALIDATION_FAILED: Field % is shorter than its minimum length.', v_field.label_en;
      end if;

      if v_text is not null
         and (v_field.validation ? 'maxLength')
         and length(v_text) > (v_field.validation->>'maxLength')::integer then
        raise exception 'VALIDATION_FAILED: Field % exceeds its maximum length.', v_field.label_en;
      end if;

      if v_field.field_type='email'
         and v_text is not null
         and v_text !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
        raise exception 'VALIDATION_FAILED: Field % must be a valid email address.', v_field.label_en;
      end if;

      if v_field.field_type='url'
         and v_text is not null
         and v_text !~* '^https?://[^[:space:]]+$' then
        raise exception 'VALIDATION_FAILED: Field % must be a valid HTTP or HTTPS URL.', v_field.label_en;
      end if;

      if v_field.field_type='phone' and v_text is not null then
        if v_text !~ '^\+?[0-9 ()-]{7,25}$' then
          raise exception 'VALIDATION_FAILED: Field % must be a valid phone number.', v_field.label_en;
        end if;
        v_digits := regexp_replace(v_text,'[^0-9]','','g');
        if length(v_digits) < 7 or length(v_digits) > 15 then
          raise exception 'VALIDATION_FAILED: Field % must contain 7 to 15 digits.', v_field.label_en;
        end if;
      end if;
    end if;

    if v_field.field_type in ('number','currency') then
      begin
        v_num := (v_value#>>'{}')::numeric;
      exception when others then
        raise exception 'VALIDATION_FAILED: Field % must be a number.', v_field.label_en;
      end;

      if (v_field.validation ? 'min')
         and v_num < (v_field.validation->>'min')::numeric then
        raise exception 'VALIDATION_FAILED: Field % is below the minimum.', v_field.label_en;
      end if;

      if (v_field.validation ? 'max')
         and v_num > (v_field.validation->>'max')::numeric then
        raise exception 'VALIDATION_FAILED: Field % exceeds the maximum.', v_field.label_en;
      end if;
    end if;

    if v_field.field_type in ('select','radio')
       and jsonb_array_length(v_field.options)>0
       and not exists (
         select 1
         from jsonb_array_elements(v_field.options) option_row
         where option_row->>'value' = (v_value#>>'{}')
       ) then
      raise exception 'VALIDATION_FAILED: Invalid option for field %.', v_field.label_en;
    end if;

    if v_field.field_type='multiselect' then
      if jsonb_typeof(v_value) <> 'array' then
        raise exception 'VALIDATION_FAILED: Field % must contain a list.', v_field.label_en;
      end if;

      if exists(
        select 1
        from jsonb_array_elements_text(v_value) selected(value)
        where not exists(
          select 1
          from jsonb_array_elements(v_field.options) option_row
          where option_row->>'value'=selected.value
        )
      ) then
        raise exception 'VALIDATION_FAILED: Invalid option for field %.', v_field.label_en;
      end if;
    end if;
  end loop;

  return new;
end;
$$;

CREATE OR REPLACE FUNCTION public.sanitize_configured_complaint_answers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog','public'
AS $function$
declare
  v_schema_id uuid;
  v_engine_mode text;
  v_filtered jsonb := '{}'::jsonb;
  v_system jsonb := '{}'::jsonb;
  v_missing_checkbox text;
begin
  if new.form_schema_version is null then
    return new;
  end if;

  select s.id,s.engine_mode
  into v_schema_id,v_engine_mode
  from public.reporting_form_schemas s
  where s.scope_type='subcategory'
    and s.scope_id=new.subcategory_id
    and s.version=new.form_schema_version
  order by
    case s.status when 'published' then 0 when 'archived' then 1 else 2 end,
    s.updated_at desc
  limit 1;

  if v_schema_id is null or v_engine_mode <> 'schema' then
    return new;
  end if;

  -- Preserve system-owned News Intake provenance keys. These are not user
  -- form answers and are required for trusted-source policy enforcement.
  v_system := jsonb_strip_nulls(jsonb_build_object(
    'sourceLanguage',new.custom_field_answers->'sourceLanguage',
    'automatedIntake',new.custom_field_answers->'automatedIntake',
    'trustedSourceAuto',new.custom_field_answers->'trustedSourceAuto',
    'sourceTruthMode',new.custom_field_answers->'sourceTruthMode',
    'sourceOmittedFields',new.custom_field_answers->'sourceOmittedFields',
    'locationScope',new.custom_field_answers->'locationScope',
    'sensitiveContentReviewed',new.custom_field_answers->'sensitiveContentReviewed',
    'newsIntakeReviewRequired',new.custom_field_answers->'newsIntakeReviewRequired'
  ));

  select coalesce(jsonb_object_agg(e.key,e.value),'{}'::jsonb)
  into v_filtered
  from jsonb_each(coalesce(new.custom_field_answers,'{}'::jsonb)) e
  join public.reporting_form_schema_fields f
    on f.schema_id=v_schema_id
   and f.active=true
   and f.storage_mode='custom_json'
   and f.storage_key=e.key;

  new.custom_field_answers := coalesce(v_filtered,'{}'::jsonb) || v_system;

  select f.label_en
  into v_missing_checkbox
  from public.reporting_form_schema_fields f
  where f.schema_id=v_schema_id
    and f.active=true
    and f.required=true
    and f.storage_mode='custom_json'
    and f.field_type='checkbox'
    and coalesce(new.custom_field_answers->f.storage_key,'false'::jsonb) <> 'true'::jsonb
  order by f.sort_order
  limit 1;

  if v_missing_checkbox is not null then
    raise exception 'VALIDATION_FAILED: Required checkbox % must be selected.',v_missing_checkbox
      using errcode='22023';
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.guard_sourced_report_schema_requirements()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog','public'
AS $function$
declare
  v_report jsonb;
  v_missing jsonb;
begin
  if new.origin_type<>'sourced_report' then
    return new;
  end if;

  -- Approved-publisher automation preserves only facts actually stated by the
  -- source. Missing structured facts are source omissions, not invented values.
  if lower(coalesce(new.custom_field_answers->>'trustedSourceAuto','false'))='true' then
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
    'road',new.road,
    'landmark',new.landmark,
    'formattedAddress',new.formatted_address,
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

CREATE OR REPLACE FUNCTION public.guard_automated_sourced_report_collision()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog','public'
AS $function$
begin
  if new.origin_type='sourced_report'
     and coalesce(new.custom_field_answers->>'automatedIntake','false')='true'
     and lower(coalesce(new.custom_field_answers->>'trustedSourceAuto','false'))<>'true'
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
      using errcode='P0001';
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_sourced_report_duplicate_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog','public'
AS $function$
declare
  v_eval jsonb;
  v_status text;
  v_candidate_ids text;
begin
  if new.status = 'published'
     and coalesce(old.status, '') <> 'published'
     and new.origin_type = 'sourced_report'
     and lower(coalesce(new.custom_field_answers->>'trustedSourceAuto','false'))<>'true' then

    v_eval := public.evaluate_sourced_report_duplicate_internal(new.id);
    v_status := coalesce(v_eval->>'status', 'clear');

    if v_status <> 'clear' then
      select string_agg(item->>'complaintId', ', ')
      into v_candidate_ids
      from jsonb_array_elements(coalesce(v_eval->'candidates', '[]'::jsonb)) item;

      raise exception
        'DUPLICATE_REVIEW_REQUIRED: Sourced report % has unresolved duplicate candidates (%). Review before publishing.',
        new.id,
        coalesce(nullif(v_candidate_ids, ''), v_status)
        using errcode='22023';
    end if;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.guard_sourced_report_publish_readiness()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog','public'
AS $function$
declare
  v_privacy_review_required boolean:=false;
begin
  if new.origin_type = 'sourced_report'
     and new.status = 'published'
     and old.status is distinct from 'published' then

    if lower(coalesce(new.custom_field_answers->>'trustedSourceAuto','false'))='true'
       and coalesce(new.custom_field_answers->>'sourceTruthMode','')='approved_publisher' then
      return new;
    end if;

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

CREATE OR REPLACE FUNCTION public.process_trusted_news_intake_candidate(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog','public'
AS $function$
declare
  v_report jsonb:=coalesce(p_payload->'report','{}'::jsonb);
  v_source jsonb:=coalesce(p_payload->'source','{}'::jsonb);
  v_segment text:=nullif(btrim(v_report->>'segmentId'),'');
  v_subcategory text:=nullif(btrim(v_report->>'subcategoryId'),'');
  v_title text:=nullif(btrim(v_report->>'titleBn'),'');
  v_title_en text:=nullif(btrim(v_report->>'titleEn'),'');
  v_description text:=nullif(btrim(v_report->>'descriptionBn'),'');
  v_description_en text:=nullif(btrim(v_report->>'descriptionEn'),'');
  v_source_type text:=coalesce(nullif(btrim(v_source->>'sourceType'),''),'news');
  v_publisher text:=nullif(btrim(v_source->>'publisherName'),'');
  v_source_title text:=nullif(btrim(v_source->>'sourceTitle'),'');
  v_url text:=nullif(btrim(v_source->>'canonicalUrl'),'');
  v_domain jsonb;
  v_source_date date;
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
  v_answers jsonb:=case when jsonb_typeof(v_report->'customFieldAnswers')='object'
    then v_report->'customFieldAnswers' else '{}'::jsonb end;
  v_schema_version integer;
  v_existing_id text;
  v_existing_status text;
  v_strong_count integer:=0;
  v_report_id text;
  v_year text;
  v_attempt integer:=0;
  v_source_id uuid;
  v_preferences jsonb;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role'
     and (not public.is_active_admin() or not public.has_permission('complaints.publish')) then
    raise exception 'Access denied.' using errcode='42501';
  end if;

  v_domain:=public.admin_check_news_source_domain(v_url);
  if coalesce((v_domain->>'approved')::boolean,false) is not true then
    raise exception 'SOURCE_DOMAIN_NOT_APPROVED: Source domain is not approved.'
      using errcode='22023';
  end if;
  v_publisher:=coalesce(nullif(btrim(v_domain->>'publisherName'),''),v_publisher);

  if v_segment is null or v_subcategory is null or v_title is null or v_description is null then
    raise exception 'Trusted News Intake requires category, subcategory, source title, and source context.'
      using errcode='22023';
  end if;
  if v_url is null or v_url !~ '^https://[^/]+/.+' or v_publisher is null then
    raise exception 'Trusted News Intake requires an approved HTTPS final article URL.'
      using errcode='22023';
  end if;
  if char_length(v_title)>100 or char_length(v_description)>2000 then
    raise exception 'Trusted News Intake title or description exceeds report limits.'
      using errcode='22023';
  end if;

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

  begin
    if nullif(btrim(v_source->>'sourcePublishedDate'),'') is not null then
      v_source_date:=(v_source->>'sourcePublishedDate')::date;
    end if;
    if nullif(btrim(v_report->>'incidentDate'),'') is not null then
      v_incident_date:=(v_report->>'incidentDate')::date;
    end if;
    if nullif(btrim(v_report->>'incidentTime'),'') is not null then
      v_incident_time:=(v_report->>'incidentTime')::time;
    end if;
    if nullif(btrim(v_report->>'utilityEndTime'),'') is not null then
      v_utility_end_time:=(v_report->>'utilityEndTime')::time;
    end if;
  exception when others then
    raise exception 'One or more supplied source date/time values are invalid.' using errcode='22023';
  end;

  -- Canonical source URLs are globally unique across sourced reports.
  select c.id,c.status
  into v_existing_id,v_existing_status
  from public.complaint_sources s
  join public.complaints c on c.id=s.complaint_id
  where public.normalize_source_url(s.canonical_url)=public.normalize_source_url(v_url)
  order by case when c.status='published' then 0 else 1 end,c.created_at desc
  limit 1;

  if v_existing_id is not null then
    return jsonb_build_object(
      'success',true,'action','skip_duplicate','reportId',v_existing_id,
      'status',v_existing_status,'published',v_existing_status='published',
      'duplicateStatus','exact'
    );
  end if;

  -- Strong cross-publisher same-incident clustering. Never merge on a weak
  -- candidate; if evidence is not strong enough a separate source-grounded
  -- report is safer than attaching a source to the wrong incident.
  with strong as (
    select
      c.id,
      c.status,
      greatest(
        public.duplicate_token_similarity(v_title,c.title),
        public.duplicate_token_similarity(v_title,c.title_en),
        public.duplicate_token_similarity(v_title_en,c.title),
        public.duplicate_token_similarity(v_title_en,c.title_en)
      ) as title_similarity
    from public.complaints c
    where c.origin_type='sourced_report'
      and c.status='published'
      and c.subcategory_id=v_subcategory
      and c.created_at>=now()-interval '10 days'
      and (
        (v_incident_date is not null and c.incident_date is not null and abs(v_incident_date-c.incident_date)<=2)
        or (v_district is not null and public.normalize_duplicate_text(v_district)=public.normalize_duplicate_text(c.district))
        or greatest(
          public.duplicate_token_similarity(v_title,c.title),
          public.duplicate_token_similarity(v_title,c.title_en),
          public.duplicate_token_similarity(v_title_en,c.title),
          public.duplicate_token_similarity(v_title_en,c.title_en)
        )>=0.90
      )
      and greatest(
        public.duplicate_token_similarity(v_title,c.title),
        public.duplicate_token_similarity(v_title,c.title_en),
        public.duplicate_token_similarity(v_title_en,c.title),
        public.duplicate_token_similarity(v_title_en,c.title_en)
      )>=0.82
    order by title_similarity desc,c.created_at desc
    limit 3
  )
  select count(*)::integer,min(id),min(status)
  into v_strong_count,v_existing_id,v_existing_status
  from strong;

  if v_strong_count=1 and v_existing_id is not null then
    insert into public.complaint_sources(
      complaint_id,source_type,publisher_name,source_title,canonical_url,
      source_published_date,verification_status,is_final_detail_page,
      source_version,verification_note,verified_at,verified_by
    ) values (
      v_existing_id,v_source_type,v_publisher,v_source_title,v_url,
      v_source_date,'verified',true,1,
      'Verified approved source automatically merged by News Intake.',
      now(),auth.uid()
    ) returning id into v_source_id;

    update public.complaints set updated_at=now() where id=v_existing_id;

    insert into public.admin_audit_logs(actor_id,action,target_type,target_id,details)
    values(auth.uid(),'news_intake.auto_source_merge','complaint',v_existing_id,jsonb_build_object(
      'source_id',v_source_id,
      'canonical_url',v_url,
      'publisher_name',v_publisher,
      'source_title',v_source_title,
      'timestamp',clock_timestamp()
    ));

    return jsonb_build_object(
      'success',true,'action','merged_source','reportId',v_existing_id,
      'status','published','published',true,'duplicateStatus','match'
    );
  end if;

  select r.version into v_schema_version
  from public.reporting_form_schemas r
  where r.scope_type='subcategory' and r.scope_id=v_subcategory
    and r.status='published' and r.engine_mode='schema'
  order by r.version desc limit 1;

  v_answers:=coalesce(v_answers,'{}'::jsonb) || jsonb_build_object(
    'automatedIntake',true,
    'trustedSourceAuto',true,
    'sourceTruthMode','approved_publisher',
    'newsIntakeReviewRequired',false
  );

  v_year:=to_char(now(),'YYYY');
  loop
    v_attempt:=v_attempt+1;
    v_report_id:='SJ-'||v_year||'-'||floor(100000+random()*900000)::integer::text;
    exit when not exists(select 1 from public.complaints where id=v_report_id);
    if v_attempt>=50 then raise exception 'REPORT_ID_GENERATION_FAILED'; end if;
  end loop;

  v_preferences:=jsonb_build_object(
    'showDescription',true,
    'showGeneralLocation',v_district is not null,
    'publicTitleBn',v_title,
    'publicSummaryBn',case
      when char_length(v_description)>220
      then regexp_replace(left(v_description,220),'\s+\S*$','')||'…'
      else v_description
    end
  );

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
    form_schema_version,custom_field_answers,publication_preferences,
    origin_type,created_at,updated_at
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
    v_schema_version,v_answers,v_preferences,
    'sourced_report',now(),now()
  );

  insert into public.complaint_sources(
    complaint_id,source_type,publisher_name,source_title,canonical_url,
    source_published_date,verification_status,is_final_detail_page,
    source_version,verification_note,verified_at,verified_by
  ) values (
    v_report_id,v_source_type,v_publisher,v_source_title,v_url,
    v_source_date,'verified',true,1,
    'Verified approved source automatically published by News Intake.',
    now(),auth.uid()
  ) returning id into v_source_id;

  insert into public.complaint_updates(complaint_id,update_type,note,is_public,created_at)
  values(v_report_id,'submitted','Approved-source report created automatically by News Intake.',false,now());

  update public.complaints
  set status='published',updated_at=now()
  where id=v_report_id;

  insert into public.complaint_updates(complaint_id,update_type,note,is_public,created_at)
  values(v_report_id,'published','Approved-source report automatically published to the public feed.',true,now());

  insert into public.admin_audit_logs(actor_id,action,target_type,target_id,details)
  values(auth.uid(),'news_intake.auto_publish','complaint',v_report_id,jsonb_build_object(
    'canonical_url',v_url,
    'publisher_name',v_publisher,
    'source_id',v_source_id,
    'source_truth_mode','approved_publisher',
    'incident_date_from_source',v_incident_date is not null,
    'location_from_source',v_district is not null,
    'timestamp',clock_timestamp()
  ));

  return jsonb_build_object(
    'success',true,'action','published','reportId',v_report_id,
    'status','published','published',true,'duplicateStatus','clear'
  );
exception
  when unique_violation then
    select c.id,c.status
    into v_existing_id,v_existing_status
    from public.complaint_sources s
    join public.complaints c on c.id=s.complaint_id
    where public.normalize_source_url(s.canonical_url)=public.normalize_source_url(v_url)
    order by c.created_at desc
    limit 1;

    if v_existing_id is not null then
      return jsonb_build_object(
        'success',true,'action','skip_duplicate','reportId',v_existing_id,
        'status',v_existing_status,'published',v_existing_status='published',
        'duplicateStatus','exact'
      );
    end if;
    raise;
end;
$function$;

REVOKE ALL ON FUNCTION public.process_trusted_news_intake_candidate(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_trusted_news_intake_candidate(jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.process_trusted_news_intake_candidate(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_trusted_news_intake_candidate(jsonb) TO service_role;
