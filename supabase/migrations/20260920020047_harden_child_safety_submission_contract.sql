update public.subcategories
set description_bn='শিশু অপহরণ বা হত্যার ঘটনা জানান।',
    description_en='Report incidents involving child abduction or murder.',
    updated_at=now()
where id='child_abduction_murder';

CREATE OR REPLACE FUNCTION public.submit_public_configured_complaint_internal(p_payload jsonb, p_client_submission_id text, p_reporter_context jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_client_id text := nullif(btrim(coalesce(p_client_submission_id,p_payload->>'client_submission_id','')),'');
  v_segment text := nullif(btrim(p_payload->>'segment'),'');
  v_subcategory text := nullif(btrim(coalesce(p_payload->>'subcategoryId',p_payload->>'subcategory_id')),'');
  v_title text := nullif(btrim(p_payload->>'title'),'');
  v_description text := nullif(btrim(p_payload->>'description'),'');
  v_schema public.reporting_form_schemas%rowtype;
  v_field public.reporting_form_schema_fields%rowtype;
  v_custom jsonb := coalesce(p_payload->'customFieldAnswers','{}'::jsonb);
  v_value jsonb;
  v_text text;
  v_num numeric;
  v_option_count integer;
  v_report_id text;
  v_year text;
  v_attempt integer := 0;
  v_exists boolean;
  v_existing public.complaints%rowtype;

  v_incident_date date := current_date;
  v_incident_time time;
  v_utility_end_time time;
  v_frequency text := coalesce(nullif(btrim(p_payload->>'frequency'),''),'one-time');
  v_privacy text := coalesce(nullif(btrim(p_payload->>'privacyChoice'),''),'anonymous');

  v_location jsonb := coalesce(p_payload->'location','{}'::jsonb);
  v_division text := coalesce(nullif(btrim(v_location->>'division'),''),'');
  v_district text := coalesce(nullif(btrim(v_location->>'district'),''),'');
  v_upazila text := nullif(btrim(v_location->>'upazilaOrThana'),'');
  v_area text := nullif(btrim(v_location->>'area'),'');
  v_road text := nullif(btrim(v_location->>'road'),'');
  v_landmark text := nullif(btrim(v_location->>'landmark'),'');
  v_address text := nullif(btrim(v_location->>'formattedAddress'),'');
  v_place_id text := nullif(btrim(v_location->>'placeId'),'');
  v_lat double precision;
  v_lng double precision;

  v_reporter_name text;
  v_reporter_contact text;
  v_confirm_public boolean := false;
  v_pub_prefs jsonb := coalesce(p_payload->'publicationPreferences',
    '{"showSubjectName":false,"showOrganization":false,"showGeneralLocation":true,"showDescription":true}'::jsonb);
  v_evidence_types jsonb := coalesce(p_payload->'evidenceTypes','[]'::jsonb);
  v_evidence_desc text := nullif(btrim(p_payload->>'evidenceDescription'),'');
  v_has_support boolean := coalesce((p_payload->>'hasSupportingInfo')::boolean,false);

  v_age text := nullif(btrim(p_payload->>'affectedPersonAgeGroup'),'');
  v_relationship text := nullif(btrim(p_payload->>'allegedAbuserRelationship'),'');
  v_reporting_for text := nullif(btrim(p_payload->>'reportingFor'),'');
  v_rel_context text := nullif(btrim(p_payload->>'relationshipContext'),'');
  v_recent_month text := nullif(btrim(p_payload->>'recentBillMonth'),'');
  v_previous_month text := nullif(btrim(p_payload->>'previousBillMonth'),'');
  v_recent_amount numeric;
  v_previous_amount numeric;
  v_bribery_department text := nullif(btrim(p_payload->>'briberyDepartment'),'');
  v_bribery_service text := nullif(btrim(p_payload->>'briberyService'),'');
  v_bribery_amount numeric;
  v_mob jsonb;

  v_ctx jsonb := coalesce(p_reporter_context,p_payload->'reporterContext',p_payload->'reporter_context');
  v_rep_lat double precision;
  v_rep_lng double precision;
  v_rep_accuracy double precision;
  v_rep_visitor text;
  v_rep_session text;
  v_rep_captured timestamptz := now();

  v_parties jsonb;
  v_party jsonb;
  v_party_type text;
begin
  if coalesce(btrim(p_payload->>'website'),'') <> ''
     or coalesce(btrim(p_payload->>'hp_comment'),'') <> '' then
    raise exception 'VALIDATION_FAILED: Invalid submission parameters.';
  end if;

  if v_client_id is null or length(v_client_id) < 8 then
    raise exception 'VALIDATION_FAILED: A valid client_submission_id is required.';
  end if;

  select * into v_existing
  from public.complaints
  where client_submission_id=v_client_id
  limit 1;

  if v_existing.id is not null then
    return jsonb_build_object(
      'success',true,'reportId',v_existing.id,
      'message','Report has already been submitted.',
      'report',jsonb_build_object(
        'id',v_existing.id,'segment',v_existing.segment_id,
        'subcategoryId',v_existing.subcategory_id,'title',v_existing.title,
        'status',v_existing.status,'createdAt',v_existing.created_at
      )
    );
  end if;

  if v_segment is null or v_subcategory is null then
    raise exception 'VALIDATION_FAILED: Category and complaint type are required.';
  end if;

  if not exists(
    select 1
    from public.subcategories sc
    join public.segments s on s.id=sc.segment_id
    where sc.id=v_subcategory and sc.segment_id=v_segment
      and sc.active=true and sc.config_status='published'
      and s.active=true and s.config_status='published'
  ) then
    raise exception 'VALIDATION_FAILED: Selected category or complaint type is not active.';
  end if;

  select * into v_schema
  from public.reporting_form_schemas
  where scope_type='subcategory' and scope_id=v_subcategory
    and status='published' and engine_mode='schema'
  order by version desc
  limit 1;

  if v_schema.id is null then
    raise exception 'VALIDATION_FAILED: This complaint type is not configured for schema-driven submission.';
  end if;

  if v_custom is null or jsonb_typeof(v_custom) <> 'object' then
    raise exception 'VALIDATION_FAILED: customFieldAnswers must be an object.';
  end if;

  -- Child-safety reports use the standard composer UI with a deliberately minimal
  -- data contract. Strip hidden/stale state server-side as defense in depth so a
  -- client cannot persist fields that the current form does not expose.
  if v_subcategory='child_abduction_murder' then
    v_custom := jsonb_strip_nulls(
      jsonb_build_object('childIncidentType',v_custom->'childIncidentType')
    );
    p_payload := p_payload - array[
      'subjectType','reportedSubject','roleOrDesignation','organization',
      'publicProfileHandle','phoneOrContact','identifyingDescription','mentionedParties',
      'relationshipContext','adminContact','adminName','confirmPublicIdentity',
      'evidenceTypes','evidenceDescription','hasSupportingInfo'
    ]::text[];

    v_frequency := 'one-time';
    v_privacy := 'anonymous';
    v_reporter_name := null;
    v_reporter_contact := null;
    v_confirm_public := false;
    v_evidence_types := '[]'::jsonb;
    v_evidence_desc := null;
    v_has_support := false;
    v_rel_context := null;
    v_age := null;
    v_relationship := null;
    v_reporting_for := null;
    v_upazila := null;
    v_area := null;
    v_road := null;
    v_landmark := null;
    v_address := null;
    v_place_id := null;
    v_lat := null;
    v_lng := null;
    v_location := jsonb_build_object(
      'division',v_division,
      'district',v_district
    );
  end if;

  -- Validate every active field against the published schema.
  for v_field in
    select * from public.reporting_form_schema_fields
    where schema_id=v_schema.id and active=true
    order by sort_order,field_key
  loop
    if v_field.storage_mode='custom_json' then
      v_value := v_custom->v_field.storage_key;
    elsif v_field.storage_mode='core_column' then
      v_value := p_payload->v_field.storage_key;
    elsif v_field.field_type='location' then
      v_value := p_payload->'location';
    elsif v_field.field_type='subject_party' then
      v_value := jsonb_build_object(
        'reportedSubject',p_payload->>'reportedSubject',
        'organization',p_payload->>'organization',
        'roleOrDesignation',p_payload->>'roleOrDesignation'
      );
    elsif v_field.field_type='evidence' then
      v_value := jsonb_build_object(
        'evidenceTypes',coalesce(p_payload->'evidenceTypes','[]'::jsonb),
        'evidenceDescription',p_payload->>'evidenceDescription'
      );
    elsif v_field.field_type='privacy' then
      v_value := to_jsonb(v_privacy);
    elsif v_field.field_type='mob_justice_details' then
      v_value := p_payload->'mobJusticeDetails';
    else
      v_value := null;
    end if;

    if v_field.required then
      if v_value is null or v_value='null'::jsonb
         or (jsonb_typeof(v_value)='string' and nullif(btrim(v_value#>>'{}'),'') is null)
         or (jsonb_typeof(v_value)='array' and jsonb_array_length(v_value)=0)
         or (v_field.field_type='location'
             and coalesce(nullif(btrim(v_location->>'district'),''),
                          nullif(btrim(v_location->>'division'),'')) is null)
      then
        raise exception 'VALIDATION_FAILED: Required field % is missing.',v_field.label_en;
      end if;
    end if;

    if v_value is null or v_value='null'::jsonb then
      continue;
    end if;

    if v_field.field_type in ('text','textarea','phone','email','url','date','time','month','select','radio') then
      v_text := nullif(btrim(v_value#>>'{}'),'');
      if v_text is not null and (v_field.validation ? 'maxLength')
         and length(v_text) > (v_field.validation->>'maxLength')::integer then
        raise exception 'VALIDATION_FAILED: Field % exceeds its maximum length.',v_field.label_en;
      end if;
    end if;

    if v_field.field_type in ('number','currency') then
      begin
        v_num := (v_value#>>'{}')::numeric;
      exception when others then
        raise exception 'VALIDATION_FAILED: Field % must be a number.',v_field.label_en;
      end;
      if (v_field.validation ? 'min') and v_num < (v_field.validation->>'min')::numeric then
        raise exception 'VALIDATION_FAILED: Field % is below the minimum.',v_field.label_en;
      end if;
      if (v_field.validation ? 'max') and v_num > (v_field.validation->>'max')::numeric then
        raise exception 'VALIDATION_FAILED: Field % exceeds the maximum.',v_field.label_en;
      end if;
    end if;

    if v_field.field_type in ('select','radio') and jsonb_array_length(v_field.options)>0 then
      select count(*) into v_option_count
      from jsonb_array_elements(v_field.options) o
      where o->>'value' = (v_value#>>'{}');
      if v_option_count=0 then
        raise exception 'VALIDATION_FAILED: Invalid option for field %.',v_field.label_en;
      end if;
    end if;

    if v_field.field_type='multiselect' then
      if jsonb_typeof(v_value)<>'array' then
        raise exception 'VALIDATION_FAILED: Field % must contain a list.',v_field.label_en;
      end if;
      if exists(
        select 1 from jsonb_array_elements_text(v_value) x(value)
        where not exists(
          select 1 from jsonb_array_elements(v_field.options) o
          where o->>'value'=x.value
        )
      ) then
        raise exception 'VALIDATION_FAILED: Invalid option for field %.',v_field.label_en;
      end if;
    end if;
  end loop;

  if v_title is null or length(v_title)>100 then
    raise exception 'VALIDATION_FAILED: A report title of 1–100 characters is required.';
  end if;
  if v_description is null or length(v_description)>2000 then
    raise exception 'VALIDATION_FAILED: A description of 1–2000 characters is required.';
  end if;

  begin
    if nullif(btrim(p_payload->>'incidentDate'),'') is not null then
      v_incident_date := (p_payload->>'incidentDate')::date;
    end if;
  exception when others then
    raise exception 'VALIDATION_FAILED: Invalid incident date.';
  end;

  begin
    if nullif(btrim(p_payload->>'incidentTime'),'') is not null then
      v_incident_time := (p_payload->>'incidentTime')::time;
    end if;
    if nullif(btrim(p_payload->>'utilityEndTime'),'') is not null then
      v_utility_end_time := (p_payload->>'utilityEndTime')::time;
    end if;
  exception when others then
    raise exception 'VALIDATION_FAILED: Invalid time value.';
  end;

  if v_frequency not in ('one-time','repeated') then v_frequency:='one-time'; end if;
  if v_privacy not in ('anonymous','admin_only','public_identity') then v_privacy:='anonymous'; end if;

  begin
    if nullif(btrim(v_location->>'lat'),'') is not null then v_lat:=(v_location->>'lat')::double precision; end if;
    if nullif(btrim(v_location->>'lng'),'') is not null then v_lng:=(v_location->>'lng')::double precision; end if;
  exception when others then
    raise exception 'VALIDATION_FAILED: Invalid incident coordinates.';
  end;
  if (v_lat is null) <> (v_lng is null) then
    raise exception 'VALIDATION_FAILED: Both incident coordinates must be provided together.';
  end if;
  if v_lat is not null and (v_lat < -90 or v_lat > 90 or v_lng < -180 or v_lng > 180 or (v_lat=0 and v_lng=0)) then
    raise exception 'VALIDATION_FAILED: Incident coordinates are invalid.';
  end if;

  begin
    if nullif(btrim(p_payload->>'recentBillAmount'),'') is not null then v_recent_amount:=(p_payload->>'recentBillAmount')::numeric; end if;
    if nullif(btrim(p_payload->>'previousBillAmount'),'') is not null then v_previous_amount:=(p_payload->>'previousBillAmount')::numeric; end if;
    if nullif(btrim(p_payload->>'briberyAmount'),'') is not null then v_bribery_amount:=(p_payload->>'briberyAmount')::numeric; end if;
  exception when others then
    raise exception 'VALIDATION_FAILED: Invalid numeric amount.';
  end;

  if v_segment='public_safety' and v_subcategory='mob-justice' then
    v_mob := p_payload->'mobJusticeDetails';
  else
    v_mob := null;
  end if;

  v_reporter_name := nullif(btrim(coalesce(p_payload->'adminContact'->>'name',p_payload->>'adminName')),'');
  v_reporter_contact := nullif(btrim(coalesce(p_payload->'adminContact'->>'contact',p_payload->>'adminContact')),'');
  begin
    v_confirm_public := coalesce((p_payload->'adminContact'->>'consentPublic')::boolean,
                                 (p_payload->>'confirmPublicIdentity')::boolean,false);
  exception when others then
    v_confirm_public := false;
  end;
  if v_subcategory='child_abduction_murder' then
    v_reporter_name := null;
    v_reporter_contact := null;
    v_confirm_public := false;
  end if;

  -- Required private reporter/device context.
  if v_ctx is null or jsonb_typeof(v_ctx)<>'object' then
    raise exception 'REPORTER_LOCATION_REQUIRED: Valid reporter device location is required.';
  end if;
  begin
    v_rep_lat := (v_ctx->>'latitude')::double precision;
    v_rep_lng := (v_ctx->>'longitude')::double precision;
    v_rep_accuracy := coalesce((v_ctx->>'accuracy_meters')::double precision,
                               (v_ctx->>'accuracyMeters')::double precision,
                               (v_ctx->>'accuracy')::double precision);
  exception when others then
    raise exception 'INVALID_REPORTER_COORDINATES: Reporter location values are invalid.';
  end;
  if v_rep_lat is null or v_rep_lng is null or v_rep_accuracy is null
     or v_rep_lat < -90 or v_rep_lat > 90 or v_rep_lng < -180 or v_rep_lng > 180
     or (v_rep_lat=0 and v_rep_lng=0) or v_rep_accuracy<=0 then
    raise exception 'INVALID_REPORTER_COORDINATES: Reporter location values are invalid.';
  end if;
  v_rep_visitor := nullif(btrim(coalesce(v_ctx->>'visitor_id',v_ctx->>'visitorId')),'');
  v_rep_session := nullif(btrim(coalesce(v_ctx->>'session_id',v_ctx->>'sessionId')),'');
  if v_rep_visitor is null or v_rep_session is null then
    raise exception 'VALIDATION_FAILED: Visitor and session identifiers are required.';
  end if;
  begin
    if nullif(btrim(coalesce(v_ctx->>'captured_at',v_ctx->>'capturedAt')),'') is not null then
      v_rep_captured := coalesce(v_ctx->>'captured_at',v_ctx->>'capturedAt')::timestamptz;
    end if;
  exception when others then v_rep_captured:=now(); end;

  v_year:=to_char(now(),'YYYY');
  loop
    v_attempt:=v_attempt+1;
    v_report_id:='SJ-'||v_year||'-'||floor(100000+random()*900000)::integer::text;
    select exists(select 1 from public.complaints where id=v_report_id) into v_exists;
    exit when not v_exists;
    if v_attempt>=50 then raise exception 'REPORT_ID_GENERATION_FAILED'; end if;
  end loop;

  insert into public.complaints(
    id,client_submission_id,segment_id,subcategory_id,title,description,
    incident_date,incident_time,utility_end_time,frequency,privacy_choice,
    reporter_name,reporter_contact,confirm_public_identity,
    division,district,upazila_or_thana,area,road,landmark,formatted_address,
    latitude,longitude,place_id,has_supporting_info,evidence_types,evidence_description,
    publication_preferences,relationship_context,recent_bill_month,recent_bill_amount,
    previous_bill_month,previous_bill_amount,bribery_department,bribery_service,bribery_amount,
    affected_person_age_group,alleged_abuser_relationship,reporting_for,mob_justice_details,
    form_schema_version,custom_field_answers,status,created_at,updated_at
  )
  values(
    v_report_id,v_client_id,v_segment,v_subcategory,v_title,v_description,
    v_incident_date,v_incident_time,v_utility_end_time,v_frequency,v_privacy,
    v_reporter_name,v_reporter_contact,v_confirm_public,
    v_division,v_district,v_upazila,v_area,v_road,v_landmark,v_address,
    v_lat,v_lng,v_place_id,v_has_support,v_evidence_types,v_evidence_desc,
    v_pub_prefs,v_rel_context,v_recent_month,v_recent_amount,
    v_previous_month,v_previous_amount,v_bribery_department,v_bribery_service,v_bribery_amount,
    v_age,v_relationship,v_reporting_for,v_mob,
    v_schema.version,v_custom,'submitted',now(),now()
  );

  insert into public.complaint_submission_contexts(
    complaint_id,client_submission_id,visitor_id,session_id,
    reporter_latitude,reporter_longitude,accuracy_meters,captured_at,
    browser_name,browser_version,os_name,device_category,platform,language,timezone,
    screen_width,screen_height,user_agent,created_at
  )
  values(
    v_report_id,v_client_id,v_rep_visitor,v_rep_session,
    v_rep_lat,v_rep_lng,v_rep_accuracy,v_rep_captured,
    nullif(btrim(coalesce(v_ctx->>'browser_name',v_ctx->>'browserName')),''),
    nullif(btrim(coalesce(v_ctx->>'browser_version',v_ctx->>'browserVersion')),''),
    nullif(btrim(coalesce(v_ctx->>'os_name',v_ctx->>'osName')),''),
    nullif(btrim(coalesce(v_ctx->>'device_category',v_ctx->>'deviceCategory')),''),
    nullif(btrim(v_ctx->>'platform'),''),
    nullif(btrim(v_ctx->>'language'),''),
    nullif(btrim(v_ctx->>'timezone'),''),
    nullif(v_ctx->>'screen_width','')::integer,
    nullif(v_ctx->>'screen_height','')::integer,
    nullif(btrim(coalesce(v_ctx->>'user_agent',v_ctx->>'userAgent')),''),
    now()
  );

  -- Optional primary party.
  if coalesce(btrim(p_payload->>'reportedSubject'),'') <> ''
     or coalesce(btrim(p_payload->>'organization'),'') <> ''
     or coalesce(btrim(p_payload->>'roleOrDesignation'),'') <> '' then
    v_party_type:=coalesce(nullif(btrim(p_payload->>'subjectType'),''),'unknown');
    if v_party_type not in ('individual','business','group','organization','unknown') then
      v_party_type:='unknown';
    end if;
    insert into public.complaint_parties(
      complaint_id,name,party_type,role_or_designation,organization,
      phone_or_contact,public_profile_handle,identifying_description,created_at
    )
    values(
      v_report_id,nullif(btrim(p_payload->>'reportedSubject'),''),
      v_party_type,nullif(btrim(p_payload->>'roleOrDesignation'),''),
      nullif(btrim(p_payload->>'organization'),''),
      nullif(btrim(coalesce(p_payload->>'phoneOrContact',p_payload->>'publicProfileHandle')),''),
      nullif(btrim(p_payload->>'publicProfileHandle'),''),
      nullif(btrim(p_payload->>'identifyingDescription'),''),now()
    );
  end if;

  v_parties:=p_payload->'mentionedParties';
  if v_parties is not null and jsonb_typeof(v_parties)='array' then
    for v_party in select * from jsonb_array_elements(v_parties)
    loop
      if coalesce(btrim(v_party->>'name'),'')=''
         and coalesce(btrim(v_party->>'organization'),'')=''
         and coalesce(btrim(v_party->>'roleOrDesignation'),'')='' then
        continue;
      end if;
      v_party_type:=coalesce(nullif(btrim(v_party->>'type'),''),'unknown');
      if v_party_type not in ('individual','business','group','organization','unknown') then v_party_type:='unknown'; end if;
      insert into public.complaint_parties(
        complaint_id,name,party_type,role_or_designation,organization,
        phone_or_contact,public_profile_handle,identifying_description,created_at
      ) values(
        v_report_id,nullif(btrim(v_party->>'name'),''),v_party_type,
        nullif(btrim(v_party->>'roleOrDesignation'),''),
        nullif(btrim(v_party->>'organization'),''),
        nullif(btrim(coalesce(v_party->>'phoneOrContact',v_party->>'publicProfileHandle')),''),
        nullif(btrim(v_party->>'publicProfileHandle'),''),
        nullif(btrim(v_party->>'identifyingDescription'),''),now()
      );
    end loop;
  end if;

  insert into public.complaint_updates(complaint_id,update_type,note,is_public,created_at)
  values(v_report_id,'submitted','Report received and queued for moderation review.',false,now());

  return jsonb_build_object(
    'success',true,'reportId',v_report_id,'message','Report submitted successfully.',
    'report',jsonb_build_object(
      'id',v_report_id,'segment',v_segment,'subcategoryId',v_subcategory,
      'title',v_title,'status','submitted','createdAt',now(),
      'formSchemaVersion',v_schema.version
    )
  );
end;
$function$
;

insert into public.admin_audit_logs(actor_id,action,target_type,target_id,details)
values(
  null,
  'reporting_form_schema.system_harden_child_submission_contract',
  'subcategory',
  'child_abduction_murder',
  jsonb_build_object(
    'schema_version',2,
    'hidden_state_stripped',true,
    'description_scope_corrected',true,
    'timestamp',clock_timestamp()
  )
);

