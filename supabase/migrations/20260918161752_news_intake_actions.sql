-- News Intake create-draft and source-merge actions.
-- Production migration: 20260918161752_news_intake_actions

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
begin
  if not public.is_active_admin() or not public.has_permission('complaints.publish') then
    raise exception 'Access denied.' using errcode='42501';
  end if;

  v_preview:=public.admin_preview_sourced_report_intake(p_payload);
  if jsonb_array_length(coalesce(v_preview#>'{duplicate,exactSourceDuplicates}','[]'::jsonb))>0 then
    raise exception 'SOURCE_ALREADY_EXISTS: This canonical source is already attached to an existing report.'
      using errcode='23505';
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
    case when jsonb_typeof(v_report->'customFieldAnswers')='object'
      then v_report->'customFieldAnswers' else '{}'::jsonb end,
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
    'canPublishImmediately',(v_duplicate->>'status')='clear'
  );
exception
  when unique_violation then
    raise exception 'SOURCE_ALREADY_EXISTS: This canonical source is already attached to another report.'
      using errcode='23505';
end;
$function$

revoke all on function public.admin_create_sourced_report_from_intake(jsonb) from public,anon;
grant execute on function public.admin_create_sourced_report_from_intake(jsonb) to authenticated;

CREATE OR REPLACE FUNCTION public.admin_merge_intake_source(p_complaint_id text, p_source jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_target public.complaints%rowtype;
  v_url text:=nullif(btrim(p_source->>'canonicalUrl'),'');
  v_source_type text:=coalesce(nullif(btrim(p_source->>'sourceType'),''),'news');
  v_publisher text:=nullif(btrim(p_source->>'publisherName'),'');
  v_title text:=nullif(btrim(p_source->>'sourceTitle'),'');
  v_date date;
  v_source_id uuid;
  v_domain jsonb;
begin
  if not public.is_active_admin() or not public.has_permission('complaints.publish') then
    raise exception 'Access denied.' using errcode='42501';
  end if;

  select * into v_target from public.complaints
  where id=p_complaint_id for update;

  if v_target.id is null then raise exception 'Complaint not found.' using errcode='P0002'; end if;
  if v_target.origin_type<>'sourced_report' then
    raise exception 'Sources may only be merged through News Intake into sourced reports.'
      using errcode='22023';
  end if;
  if v_target.status='rejected' then
    raise exception 'Cannot merge a source into a rejected report.' using errcode='22023';
  end if;

  v_domain:=public.admin_check_news_source_domain(v_url);
  if coalesce((v_domain->>'approved')::boolean,false) is not true then
    raise exception 'SOURCE_DOMAIN_NOT_APPROVED: Source domain is not approved.'
      using errcode='22023';
  end if;

  if v_source_type not in ('news','official','social','article','other')
     or v_publisher is null or v_url is null then
    raise exception 'Valid source type, publisher, and URL are required.' using errcode='22023';
  end if;

  begin
    if nullif(btrim(p_source->>'sourcePublishedDate'),'') is not null then
      v_date:=(p_source->>'sourcePublishedDate')::date;
    end if;
  exception when others then
    raise exception 'Invalid source publication date.' using errcode='22023';
  end;

  if exists(
    select 1 from public.complaint_sources
    where public.normalize_source_url(canonical_url)=public.normalize_source_url(v_url)
  ) then
    raise exception 'SOURCE_ALREADY_EXISTS: This source is already attached to a report.'
      using errcode='23505';
  end if;

  insert into public.complaint_sources(
    complaint_id,source_type,publisher_name,source_title,canonical_url,
    source_published_date,verification_status,is_final_detail_page,
    source_version,verification_note,verified_at,verified_by
  ) values (
    v_target.id,v_source_type,v_publisher,v_title,v_url,
    v_date,'verified',true,1,'Verified and merged through Admin News Intake.',
    now(),auth.uid()
  ) returning id into v_source_id;

  update public.complaints set updated_at=now() where id=v_target.id;

  insert into public.admin_audit_logs(actor_id,action,target_type,target_id,details)
  values(auth.uid(),'sourced_report.source_merge','complaint',v_target.id,jsonb_build_object(
    'source_id',v_source_id,
    'canonical_url',v_url,
    'publisher_name',v_publisher,
    'timestamp',clock_timestamp()
  ));

  return jsonb_build_object(
    'success',true,
    'reportId',v_target.id,
    'sourceId',v_source_id,
    'status',v_target.status
  );
exception
  when unique_violation then
    raise exception 'SOURCE_ALREADY_EXISTS: This source is already attached to another report.'
      using errcode='23505';
end;
$function$

revoke all on function public.admin_merge_intake_source(text,jsonb) from public,anon;
grant execute on function public.admin_merge_intake_source(text,jsonb) to authenticated;
