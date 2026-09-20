-- Final incident-type and location-quality hardening for trusted News Intake.

CREATE OR REPLACE FUNCTION public.process_trusted_news_intake_candidate(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_report jsonb:=coalesce(p_payload->'report','{}'::jsonb);
  v_source jsonb:=coalesce(p_payload->'source','{}'::jsonb);
  v_quality jsonb:=coalesce(p_payload->'quality','{}'::jsonb);
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

  if lower(coalesce(v_quality->>'extractionStatus','')) <> 'complete'
     or lower(coalesce(v_quality->>'substantiveContext','false')) <> 'true'
     or lower(coalesce(v_quality->>'currentIncident','false')) <> 'true'
     or lower(coalesce(v_quality->>'followUpOnly','false')) = 'true'
     or coalesce(nullif(regexp_replace(coalesce(v_quality->>'contextLength',''),'[^0-9]','','g'),''),'0')::integer < 80 then
    raise exception 'SOURCE_QUALITY_GATE_FAILED: Trusted News Intake requires a fully extracted current-incident article with substantive context.'
      using errcode='22023';
  end if;

  if public.normalize_duplicate_text(v_title)=public.normalize_duplicate_text(v_description)
     or char_length(public.normalize_duplicate_text(v_description)) < 80 then
    raise exception 'SOURCE_QUALITY_GATE_FAILED: Headline-only or insufficient article context cannot be published.'
      using errcode='22023';
  end if;


  if v_title ~* '(জামিন|রিমান্ড|আদালত|শুনানি|চার্জশিট|চার্জ[[:space:]]*শিট|অভিযোগপত্র|রায়|রায়|দণ্ড|সাজা|আপিল|বিচার[[:space:]]+শুরু|সাক্ষ্যগ্রহণ)'
     or lower(v_title) ~ '(bail|remand|court|hearing|charge[ -]?sheet|chargesheet|verdict|sentenced?|appeal|trial)' then
    raise exception 'SOURCE_CURRENT_INCIDENT_REQUIRED: Court/legal follow-up stories cannot be published as new incidents.'
      using errcode='22023';
  end if;

  if (coalesce(v_title,'')||' '||coalesce(v_description,'')) ~* '(বলে[[:space:]]+প্রচার|দাবিটি[[:space:]]+সত্য[[:space:]]+নয়|দাবিটি[[:space:]]+সত্য[[:space:]]+নয়|ভুয়া[[:space:]]+দাবি|ভুয়া[[:space:]]+দাবি|ফ্যাক্ট[[:space:]]*চেক|তথ্য[[:space:]]+যাচাই|যাচাই[[:space:]]+করে[[:space:]]+দেখা[[:space:]]+গেছে|মিথ্যা[[:space:]]+দাবি|ভুল[[:space:]]+তথ্য)'
     or lower(coalesce(v_title,'')||' '||coalesce(v_description,'')) ~ '(fact[- ]?check|false[[:space:]]+claim|misinformation|misleading[[:space:]]+claim|debunk(ed|ing)?)' then
    raise exception 'SOURCE_CURRENT_INCIDENT_REQUIRED: Fact-check or misinformation/debunking stories cannot be published as new incidents.'
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
        (
          (
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
        )
        or (
          lower(coalesce(nullif(btrim(c.custom_field_answers->>'sourceLanguage'),''),'unknown'))
            <> lower(coalesce(nullif(btrim(v_answers->>'sourceLanguage'),''),'unknown'))
          and lower(coalesce(nullif(btrim(c.custom_field_answers->>'sourceLanguage'),''),'unknown')) in ('bn','en')
          and lower(coalesce(nullif(btrim(v_answers->>'sourceLanguage'),''),'unknown')) in ('bn','en')
          and v_incident_date is not null
          and c.incident_date is not null
          and abs(v_incident_date-c.incident_date)<=1
          and v_district is not null
          and c.district is not null
          and public.normalize_duplicate_text(v_district)=public.normalize_duplicate_text(c.district)
          and (
            (
              v_upazila is not null and c.upazila_or_thana is not null
              and public.normalize_duplicate_text(v_upazila)=public.normalize_duplicate_text(c.upazila_or_thana)
            )
            or (
              v_area is not null and c.area is not null
              and public.duplicate_token_similarity(v_area,c.area)>=0.78
            )
            or (
              v_address is not null and c.formatted_address is not null
              and public.duplicate_token_similarity(v_address,c.formatted_address)>=0.78
            )
            or (
              v_landmark is not null and c.landmark is not null
              and public.duplicate_token_similarity(v_landmark,c.landmark)>=0.78
            )
          )
        )
      )
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
$function$
;

update public.complaints c
set status='submitted',
    custom_field_answers=
      coalesce(c.custom_field_answers,'{}'::jsonb)
      || jsonb_build_object(
        'newsIntakeReviewRequired',true,
        'newsIntakeReviewReason','Classification safety correction: fact-check/misinformation coverage is not a Child Abduction / Murder incident and must not remain published.'
      ),
    updated_at=now()
where c.id='SJ-2026-873249'
  and c.origin_type='sourced_report'
  and coalesce(c.custom_field_answers->>'trustedSourceAuto','false')='true'
  and c.status='published'
  and c.subcategory_id='child_abduction_murder'
  and exists (
    select 1 from public.complaint_sources s
    where s.complaint_id=c.id
      and public.normalize_source_url(s.canonical_url)=public.normalize_source_url('https://www.prothomalo.com/bangladesh/zle8h93vo6')
  );

insert into public.admin_audit_logs(actor_id,action,target_type,target_id,details)
select auth.uid(),'news_intake.classification_quarantine','complaint','SJ-2026-873249',
       jsonb_build_object(
         'source_url','https://www.prothomalo.com/bangladesh/zle8h93vo6',
         'reason','Fact-check/misinformation article was incorrectly classified as Child Abduction / Murder during production verification.',
         'timestamp',clock_timestamp()
       )
where exists (
  select 1 from public.complaints c
  where c.id='SJ-2026-873249' and c.status='submitted'
)
and not exists (
  select 1 from public.admin_audit_logs l
  where l.action='news_intake.classification_quarantine'
    and l.target_id='SJ-2026-873249'
);

update public.complaints c
set upazila_or_thana=null,
    area=null,
    road=null,
    landmark=null,
    formatted_address=null,
    custom_field_answers=jsonb_set(
      jsonb_set(
        coalesce(c.custom_field_answers,'{}'::jsonb),
        '{sourceOmittedFields}',
        coalesce(c.custom_field_answers->'sourceOmittedFields','[]'::jsonb) || '"location"'::jsonb,
        true
      ),
      '{locationScope}',
      '"source_unspecified"'::jsonb,
      true
    ),
    updated_at=now()
where c.id='SJ-2026-159311'
  and c.origin_type='sourced_report'
  and c.status='published'
  and c.district='Khulna'
  and (
    coalesce(c.formatted_address,'') ilike '%এদিকে%'
    or coalesce(c.formatted_address,'') ilike '%ঘটনায়%'
    or coalesce(c.formatted_address,'') ilike '%ঘটনায়%'
  );

insert into public.admin_audit_logs(actor_id,action,target_type,target_id,details)
select auth.uid(),'news_intake.location_quality_repair','complaint','SJ-2026-159311',
       jsonb_build_object(
         'kept_division','Khulna',
         'kept_district','Khulna',
         'cleared_noisy_specific_location',true,
         'source_location_omitted',true,
         'reason','Narrative police-jurisdiction fragment was incorrectly promoted to the public specific location; retained district context and marked the required specific location as source-omitted.',
         'timestamp',clock_timestamp()
       )
where exists (
  select 1 from public.complaints c
  where c.id='SJ-2026-159311'
    and c.formatted_address is null
    and c.custom_field_answers->>'locationScope'='source_unspecified'
    and c.custom_field_answers->'sourceOmittedFields' ? 'location'
)
and not exists (
  select 1 from public.admin_audit_logs l
  where l.action='news_intake.location_quality_repair'
    and l.target_id='SJ-2026-159311'
);
