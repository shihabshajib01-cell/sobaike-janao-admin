-- Final one-click News Intake contract.
-- Only fresh, current-form-valid, source-grounded reports with 400-800 characters
-- may become Feed Ready or transition to published.

update public.bangladesh_upazilas
set aliases=(
  select array_agg(distinct value order by value)
  from unnest(coalesce(aliases,'{}'::text[]) || array['কোতোয়ালি','কোতোয়ালি','কোতোয়ালী']::text[]) value
)
where lower(name_en)='kotwali';

CREATE OR REPLACE FUNCTION public.news_intake_specific_location_text_is_safe(p_value text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog'
AS $function$
select case
  when nullif(btrim(coalesce(p_value,'')),'') is null then false
  when char_length(btrim(p_value))<5 or char_length(btrim(p_value))>120 then false
  when lower(btrim(p_value)) ~ '^(area|market|bazaar|thana|upazila|union|village|city|road|street|lane|station)$' then false
  when lower(btrim(p_value)) ~ '^(on|at|in|near)[[:space:]]+(the[[:space:]]+)?(road|street|lane|area|city|district|station)([[:space:]]+[0-9]+)?$' then false
  when lower(p_value) ~ '(collected[[:space:]]+evidence|cordoned[[:space:]]+off|investigat(e|ed|ing|ion)|police[[:space:]]+said|officials?[[:space:]]+said|victims?|the[[:space:]]+victim|was[[:space:]]+arrested|were[[:space:]]+arrested|detained|went[[:space:]]+to[[:space:]]+the[[:space:]]+area|visited[[:space:]]+the[[:space:]]+area)' then false
  when p_value ~ '(ভুক্তভোগী|পুলিশ[[:space:]]+জানায়|পুলিশ[[:space:]]+জানায়|কর্তৃপক্ষ|তদন্ত|গ্রেপ্তার|আটক|নিহত|আহত|উদ্ধার|জানান|বলেন)' then false
  when p_value ~ '(^|[[:space:]])(এদিকে|অন্যদিকে|এ[[:space:]]+ঘটনায়|এ[[:space:]]+ঘটনায়|এই[[:space:]]+ঘটনায়|এই[[:space:]]+ঘটনায়)($|[[:space:]])' then false
  when p_value ~ '^(র|এর)[[:space:]]+' then false
  else true
end
$function$
;

revoke all on function public.news_intake_specific_location_text_is_safe(text) from public,anon,authenticated;
grant execute on function public.news_intake_specific_location_text_is_safe(text) to service_role;

CREATE OR REPLACE FUNCTION public.admin_resolve_news_intake_location(p_text text, p_language text DEFAULT 'unknown'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_raw text:=coalesce(p_text,'');
  v_dist record; v_dist_count integer:=0;
  v_up record; v_up_count integer:=0;
  v_div record;
  v_lang text:=case when lower(coalesce(p_language,''))='bn' then 'bn' else 'en' end;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role'
     and (not public.is_active_admin() or not public.has_permission('complaints.publish')) then
    raise exception 'Access denied.' using errcode='42501';
  end if;

  with matches as (
    select d.*,least(
      coalesce(nullif(public.location_mention_position(d.name_en,v_raw),0),2147483647),
      coalesce(nullif(public.location_mention_position(d.name_bn,v_raw),0),2147483647),
      coalesce((select min(nullif(public.location_mention_position(a,v_raw),0)) from unnest(d.aliases) a),2147483647)
    ) first_pos
    from public.bangladesh_districts d
  ), usable as (
    select m.* from matches m
    where m.first_pos<2147483647 and (
      not exists (
        select 1 from public.bangladesh_upazilas u
        where u.district_id<>m.id and (
          lower(u.name_en)=lower(m.name_en) or u.name_bn=m.name_bn
          or exists(select 1 from unnest(u.aliases) a where lower(a)=lower(m.name_en) or a=m.name_bn)
        )
      )
      or substring(v_raw from greatest(1,m.first_pos-18) for greatest(length(m.name_en),length(m.name_bn))+55)
           ~* '(district|city|জেলা|শহর|নগর|মহানগর)'
    )
  )
  select count(*) into v_dist_count from usable;

  with matches as (
    select d.*,least(
      coalesce(nullif(public.location_mention_position(d.name_en,v_raw),0),2147483647),
      coalesce(nullif(public.location_mention_position(d.name_bn,v_raw),0),2147483647),
      coalesce((select min(nullif(public.location_mention_position(a,v_raw),0)) from unnest(d.aliases) a),2147483647)
    ) first_pos
    from public.bangladesh_districts d
  ), usable as (
    select m.* from matches m
    where m.first_pos<2147483647 and (
      not exists (
        select 1 from public.bangladesh_upazilas u
        where u.district_id<>m.id and (
          lower(u.name_en)=lower(m.name_en) or u.name_bn=m.name_bn
          or exists(select 1 from unnest(u.aliases) a where lower(a)=lower(m.name_en) or a=m.name_bn)
        )
      )
      or substring(v_raw from greatest(1,m.first_pos-18) for greatest(length(m.name_en),length(m.name_bn))+55)
           ~* '(district|city|জেলা|শহর|নগর|মহানগর)'
    )
  )
  select * into v_dist from usable
  order by first_pos,greatest(length(name_en),length(name_bn)) desc,id limit 1;

  if v_dist_count>1 then
    return jsonb_build_object('division','','district','','upazilaOrThana','','area','','road','','landmark','','formattedAddress','','locationScope','multi_location','quality','multiple_locations','matchedSpecificLocations',0);
  end if;

  if v_dist.id is null and lower(v_raw) ~ 'রাজধানী' then
    select * into v_dist from public.bangladesh_districts where id='dhaka';
  end if;

  if v_dist.id is not null then
    with matched as (
      select u.*,least(
        coalesce(nullif(public.location_mention_position(u.name_en,v_raw),0),2147483647),
        coalesce(nullif(public.location_mention_position(u.name_bn,v_raw),0),2147483647),
        coalesce((select min(nullif(public.location_mention_position(a,v_raw),0)) from unnest(u.aliases) a),2147483647)
      ) first_pos
      from public.bangladesh_upazilas u where u.district_id=v_dist.id
    )
    select count(*) into v_up_count from matched where first_pos<2147483647;

    with matched as (
      select u.*,least(
        coalesce(nullif(public.location_mention_position(u.name_en,v_raw),0),2147483647),
        coalesce(nullif(public.location_mention_position(u.name_bn,v_raw),0),2147483647),
        coalesce((select min(nullif(public.location_mention_position(a,v_raw),0)) from unnest(u.aliases) a),2147483647)
      ) first_pos
      from public.bangladesh_upazilas u where u.district_id=v_dist.id
    )
    select * into v_up from matched where first_pos<2147483647
    order by first_pos,greatest(length(name_en),length(name_bn)) desc,id limit 1;

    select * into v_div from public.bangladesh_divisions where id=v_dist.division_id;

    if v_up_count=1 and v_up.id is not null then
      return jsonb_build_object(
        'division',v_div.name_en,'district',v_dist.name_en,'upazilaOrThana',v_up.name_en,
        'area','','road','','landmark','',
        'formattedAddress',case when v_lang='bn' then v_up.name_bn||', '||v_dist.name_bn else v_up.name_en||', '||v_dist.name_en end,
        'locationScope','specific','quality','specific','matchedSpecificLocations',1
      );
    elsif v_up_count>1 then
      return jsonb_build_object('division',v_div.name_en,'district',v_dist.name_en,'upazilaOrThana','','area','','road','','landmark','','formattedAddress','','locationScope','multi_location','quality','multiple_locations','matchedSpecificLocations',v_up_count);
    end if;

    return jsonb_build_object('division',v_div.name_en,'district',v_dist.name_en,'upazilaOrThana','','area','','road','','landmark','','formattedAddress','','locationScope','district_only','quality','district_only','matchedSpecificLocations',0);
  end if;

  with matched as (
    select u.*,least(
      coalesce(nullif(public.location_mention_position(u.name_en,v_raw),0),2147483647),
      coalesce(nullif(public.location_mention_position(u.name_bn,v_raw),0),2147483647),
      coalesce((select min(nullif(public.location_mention_position(a,v_raw),0)) from unnest(u.aliases) a),2147483647)
    ) first_pos
    from public.bangladesh_upazilas u
  ), usable as (
    select m.* from matched m
    where m.first_pos<2147483647
      and not exists (
        select 1 from public.bangladesh_districts d
        where lower(d.name_en)=lower(m.name_en) or d.name_bn=m.name_bn
      )
  )
  select count(*) into v_up_count from usable;

  if v_up_count=1 then
    with matched as (
      select u.*,least(
        coalesce(nullif(public.location_mention_position(u.name_en,v_raw),0),2147483647),
        coalesce(nullif(public.location_mention_position(u.name_bn,v_raw),0),2147483647),
        coalesce((select min(nullif(public.location_mention_position(a,v_raw),0)) from unnest(u.aliases) a),2147483647)
      ) first_pos
      from public.bangladesh_upazilas u
    ), usable as (
      select m.* from matched m
      where m.first_pos<2147483647
        and not exists (
          select 1 from public.bangladesh_districts d
          where lower(d.name_en)=lower(m.name_en) or d.name_bn=m.name_bn
        )
    )
    select * into v_up from usable
    order by first_pos,greatest(length(name_en),length(name_bn)) desc,id limit 1;

    select * into v_dist from public.bangladesh_districts where id=v_up.district_id;
    select * into v_div from public.bangladesh_divisions where id=v_dist.division_id;
    return jsonb_build_object(
      'division',v_div.name_en,'district',v_dist.name_en,'upazilaOrThana',v_up.name_en,
      'area','','road','','landmark','',
      'formattedAddress',case when v_lang='bn' then v_up.name_bn||', '||v_dist.name_bn else v_up.name_en||', '||v_dist.name_en end,
      'locationScope','specific','quality','specific','matchedSpecificLocations',1
    );
  end if;

  return null;
end
$function$
;

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
     or char_length(v_description) < 400
     or char_length(v_description) > 800 then
    raise exception 'SOURCE_QUALITY_GATE_FAILED: Trusted News Intake descriptions must contain 400 to 800 source-grounded characters.'
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

  if v_source_date is null then
    raise exception 'SOURCE_FRESHNESS_REQUIRED: Trusted News Intake requires a verified source publication date.' using errcode='22023';
  end if;
  if v_source_date > (clock_timestamp() at time zone 'Asia/Dhaka')::date
     or v_source_date < (clock_timestamp() at time zone 'Asia/Dhaka')::date - 7 then
    raise exception 'SOURCE_FRESHNESS_REQUIRED: Source publication date must be within the last 7 days.' using errcode='22023';
  end if;

  if v_subcategory <> 'excess-electricity-bill' and v_incident_date is null then
    raise exception 'SOURCE_REPORT_CONTRACT_FAILED: Incident date is required for this report type.' using errcode='22023';
  end if;

  if public.canonical_division_name(v_division) is null
     or public.canonical_district_name(v_district) is null
     or public.canonical_upazila_name(v_upazila,v_district) is null then
    raise exception 'SOURCE_REPORT_CONTRACT_FAILED: A source-grounded canonical division, district, and upazila/thana are required.' using errcode='22023';
  end if;

  if (v_area is not null and not public.news_intake_specific_location_text_is_safe(v_area))
     or (v_road is not null and not public.news_intake_specific_location_text_is_safe(v_road))
     or (v_landmark is not null and not public.news_intake_specific_location_text_is_safe(v_landmark))
     or (v_address is not null and not public.news_intake_specific_location_text_is_safe(v_address)) then
    raise exception 'SOURCE_LOCATION_QUALITY_FAILED: One or more supplied location fragments are not valid source-grounded place text.' using errcode='22023';
  end if;

  if v_subcategory in ('load-shedding-outage','gas-shortage') and v_incident_time is null then
    raise exception 'SOURCE_REPORT_CONTRACT_FAILED: Utility start time is required for this report type.' using errcode='22023';
  end if;

  if v_subcategory='excess-electricity-bill' then
    if nullif(btrim(v_report->>'recentBillMonth'),'') is null
       or nullif(btrim(v_report->>'previousBillMonth'),'') is null
       or nullif(btrim(v_report->>'recentBillAmount'),'') is null
       or nullif(btrim(v_report->>'previousBillAmount'),'') is null then
      raise exception 'SOURCE_REPORT_CONTRACT_FAILED: Excess-bill comparison fields are required.' using errcode='22023';
    end if;
    if (v_report->>'recentBillMonth') !~ '^[0-9]{4}-[0-9]{2}$'
       or (v_report->>'previousBillMonth') !~ '^[0-9]{4}-[0-9]{2}$' then
      raise exception 'SOURCE_REPORT_CONTRACT_FAILED: Bill months must use YYYY-MM.' using errcode='22023';
    end if;
    if substring(v_report->>'recentBillMonth' from 6 for 2)::integer not between 1 and 12
       or substring(v_report->>'previousBillMonth' from 6 for 2)::integer not between 1 and 12 then
      raise exception 'SOURCE_REPORT_CONTRACT_FAILED: Bill month is invalid.' using errcode='22023';
    end if;
    if (v_report->>'recentBillAmount') !~ '^[0-9]+([.][0-9]+)?$'
       or (v_report->>'previousBillAmount') !~ '^[0-9]+([.][0-9]+)?$'
       or (v_report->>'recentBillAmount')::numeric <= 0
       or (v_report->>'previousBillAmount')::numeric <= 0 then
      raise exception 'SOURCE_REPORT_CONTRACT_FAILED: Bill amounts must be positive numbers.' using errcode='22023';
    end if;
    if (v_report->>'previousBillMonth') >= (v_report->>'recentBillMonth')
       or (v_report->>'recentBillMonth') > to_char(clock_timestamp() at time zone 'Asia/Dhaka','YYYY-MM') then
      raise exception 'SOURCE_REPORT_CONTRACT_FAILED: Bill month ordering is invalid.' using errcode='22023';
    end if;
  end if;

  if v_segment='harassment'
     and (
       nullif(btrim(v_report->>'affectedPersonAgeGroup'),'') is null
       or nullif(btrim(v_report->>'allegedAbuserRelationship'),'') is null
       or nullif(btrim(v_report->>'reportingFor'),'') is null
     ) then
    raise exception 'SOURCE_REPORT_CONTRACT_FAILED: Harassment classifications are required.' using errcode='22023';
  end if;

  if v_subcategory='sexual-harassment'
     and (
       nullif(btrim(v_report->>'sexualHarassmentType'),'') is null
       or nullif(btrim(v_report->>'sexualHarassmentContext'),'') is null
     ) then
    raise exception 'SOURCE_REPORT_CONTRACT_FAILED: Sexual-harassment type and context are required.' using errcode='22023';
  end if;

  if v_subcategory='child_abduction_murder'
     and nullif(btrim(v_answers->>'childIncidentType'),'') is null then
    raise exception 'SOURCE_REPORT_CONTRACT_FAILED: Child-safety incident type is required.' using errcode='22023';
  end if;

  if v_subcategory='mob-justice'
     and (
       jsonb_typeof(v_report->'mobJusticeDetails') <> 'object'
       or nullif(btrim(v_report->'mobJusticeDetails'->>'trigger'),'') is null
       or nullif(btrim(v_report->'mobJusticeDetails'->>'outcome'),'') is null
       or nullif(btrim(v_report->'mobJusticeDetails'->>'ongoingStatus'),'') is null
     ) then
    raise exception 'SOURCE_REPORT_CONTRACT_FAILED: Mob Justice trigger, outcome, and ongoing status are required.' using errcode='22023';
  end if;

  if jsonb_array_length(public.sourced_report_schema_validation_errors_internal(v_subcategory,v_report)) > 0 then
    raise exception 'SOURCE_SCHEMA_VALIDATION_FAILED: Candidate does not satisfy the currently published reporting schema.' using errcode='22023';
  end if;

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

CREATE OR REPLACE FUNCTION public.guard_trusted_news_intake_one_click_contract()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_source_date date;
  v_transition boolean:=tg_op='INSERT' or old.status is distinct from 'published';
begin
  if new.origin_type<>'sourced_report'
     or coalesce((new.custom_field_answers->>'trustedSourceAuto')::boolean,false) is not true
     or new.status<>'published' then return new; end if;

  if char_length(coalesce(new.description,''))<400 or char_length(coalesce(new.description,''))>800 then
    raise exception 'SOURCE_QUALITY_GATE_FAILED: Trusted News Intake descriptions must contain 400 to 800 source-grounded characters.' using errcode='22023';
  end if;
  if public.canonical_division_name(new.division) is null
     or public.canonical_district_name(new.district) is null
     or public.canonical_upazila_name(new.upazila_or_thana,new.district) is null then
    raise exception 'SOURCE_REPORT_CONTRACT_FAILED: A canonical source-grounded division, district, and upazila/thana are required.' using errcode='22023';
  end if;
  if (new.area is not null and not public.news_intake_specific_location_text_is_safe(new.area))
     or (new.road is not null and not public.news_intake_specific_location_text_is_safe(new.road))
     or (new.landmark is not null and not public.news_intake_specific_location_text_is_safe(new.landmark))
     or (new.formatted_address is not null and not public.news_intake_specific_location_text_is_safe(new.formatted_address)) then
    raise exception 'SOURCE_LOCATION_QUALITY_FAILED: Published News Intake location is not valid source-grounded place text.' using errcode='22023';
  end if;
  if new.subcategory_id<>'excess-electricity-bill' and new.incident_date is null then
    raise exception 'SOURCE_REPORT_CONTRACT_FAILED: Incident date is required.' using errcode='22023';
  end if;
  if new.subcategory_id in ('load-shedding-outage','gas-shortage') and new.incident_time is null then
    raise exception 'SOURCE_REPORT_CONTRACT_FAILED: Utility start time is required.' using errcode='22023';
  end if;
  if new.subcategory_id='excess-electricity-bill'
     and (new.recent_bill_month is null or new.recent_bill_amount is null or new.recent_bill_amount<=0
          or new.previous_bill_month is null or new.previous_bill_amount is null or new.previous_bill_amount<=0) then
    raise exception 'SOURCE_REPORT_CONTRACT_FAILED: Excess-bill comparison fields are required.' using errcode='22023';
  end if;
  if new.segment_id='harassment'
     and (new.affected_person_age_group is null or new.alleged_abuser_relationship is null or new.reporting_for is null) then
    raise exception 'SOURCE_REPORT_CONTRACT_FAILED: Harassment classifications are required.' using errcode='22023';
  end if;
  if new.subcategory_id='sexual-harassment'
     and (new.sexual_harassment_type is null or new.sexual_harassment_context is null) then
    raise exception 'SOURCE_REPORT_CONTRACT_FAILED: Sexual-harassment type and context are required.' using errcode='22023';
  end if;
  if new.subcategory_id='child_abduction_murder'
     and nullif(btrim(new.custom_field_answers->>'childIncidentType'),'') is null then
    raise exception 'SOURCE_REPORT_CONTRACT_FAILED: Child-safety incident type is required.' using errcode='22023';
  end if;
  if new.subcategory_id='mob-justice'
     and (jsonb_typeof(new.mob_justice_details)<>'object'
          or nullif(btrim(new.mob_justice_details->>'trigger'),'') is null
          or nullif(btrim(new.mob_justice_details->>'outcome'),'') is null
          or nullif(btrim(new.mob_justice_details->>'ongoingStatus'),'') is null) then
    raise exception 'SOURCE_REPORT_CONTRACT_FAILED: Mob Justice fields are required.' using errcode='22023';
  end if;

  select s.source_published_date into v_source_date
  from public.complaint_sources s where s.complaint_id=new.id
  order by s.verified_at desc nulls last,s.created_at desc limit 1;

  if v_source_date is null then
    raise exception 'SOURCE_FRESHNESS_REQUIRED: Published News Intake requires a verified source publication date.' using errcode='22023';
  end if;
  if v_transition and (v_source_date>(clock_timestamp() at time zone 'Asia/Dhaka')::date
      or v_source_date<(clock_timestamp() at time zone 'Asia/Dhaka')::date-7) then
    raise exception 'SOURCE_FRESHNESS_REQUIRED: Source publication date must be within the last 7 days at publication.' using errcode='22023';
  end if;
  return new;
end
$function$
;

revoke all on function public.guard_trusted_news_intake_one_click_contract() from public,anon,authenticated;

drop trigger if exists trg_guard_trusted_news_intake_one_click_contract on public.complaints;
create trigger trg_guard_trusted_news_intake_one_click_contract
before insert or update on public.complaints
for each row execute function public.guard_trusted_news_intake_one_click_contract();

with unsafe as (
  select distinct c.id
  from public.complaints c
  join public.complaint_sources s on s.complaint_id=c.id
  where c.origin_type='sourced_report' and c.status='published'
    and coalesce((c.custom_field_answers->>'trustedSourceAuto')::boolean,false)=true
    and (
      char_length(coalesce(c.description,''))<400 or char_length(coalesce(c.description,''))>800
      or s.source_published_date is null
      or s.source_published_date>(clock_timestamp() at time zone 'Asia/Dhaka')::date
      or s.source_published_date<(clock_timestamp() at time zone 'Asia/Dhaka')::date-7
      or (c.subcategory_id<>'excess-electricity-bill' and c.incident_date is null)
      or public.canonical_division_name(c.division) is null
      or public.canonical_district_name(c.district) is null
      or public.canonical_upazila_name(c.upazila_or_thana,c.district) is null
      or (c.area is not null and not public.news_intake_specific_location_text_is_safe(c.area))
      or (c.road is not null and not public.news_intake_specific_location_text_is_safe(c.road))
      or (c.landmark is not null and not public.news_intake_specific_location_text_is_safe(c.landmark))
      or (c.formatted_address is not null and not public.news_intake_specific_location_text_is_safe(c.formatted_address))
      or (c.subcategory_id in ('load-shedding-outage','gas-shortage') and c.incident_time is null)
      or (c.subcategory_id='excess-electricity-bill' and (
        c.recent_bill_month is null or c.recent_bill_amount is null or c.recent_bill_amount<=0
        or c.previous_bill_month is null or c.previous_bill_amount is null or c.previous_bill_amount<=0
      ))
      or (c.segment_id='harassment' and (
        c.affected_person_age_group is null or c.alleged_abuser_relationship is null or c.reporting_for is null
      ))
      or (c.subcategory_id='sexual-harassment' and (
        c.sexual_harassment_type is null or c.sexual_harassment_context is null
      ))
      or (c.subcategory_id='child_abduction_murder' and nullif(btrim(c.custom_field_answers->>'childIncidentType'),'') is null)
      or (c.subcategory_id='mob-justice' and (
        jsonb_typeof(c.mob_justice_details)<>'object'
        or nullif(btrim(c.mob_justice_details->>'trigger'),'') is null
        or nullif(btrim(c.mob_justice_details->>'outcome'),'') is null
        or nullif(btrim(c.mob_justice_details->>'ongoingStatus'),'') is null
      ))
    )
),
updated as (
  update public.complaints c
  set status='submitted',
      custom_field_answers=
        jsonb_set(
          coalesce(c.custom_field_answers,'{}'::jsonb),
          '{sourceOmittedFields}',
          coalesce((
            select jsonb_agg(to_jsonb(x.value))
            from (
              select value
              from jsonb_array_elements_text(coalesce(c.custom_field_answers->'sourceOmittedFields','[]'::jsonb))
              union
              select 'location' where public.canonical_upazila_name(c.upazila_or_thana,c.district) is null
              union
              select 'incidentDate' where c.subcategory_id<>'excess-electricity-bill' and c.incident_date is null
            ) x
          ),'[]'::jsonb),
          true
        )
        || jsonb_build_object(
          'newsIntakeReviewRequired',true,
          'newsIntakeReviewReason','Legacy trusted-source report quarantined because it does not satisfy the final one-click News Intake contract.'
        ),
      updated_at=now()
  from unsafe u
  where c.id=u.id
  returning c.id
)
insert into public.admin_audit_logs(actor_id,action,target_type,target_id,details)
select auth.uid(),'news_intake.one_click_contract_quarantine','complaint',u.id,
       jsonb_build_object(
         'reason','Published trusted-auto report did not satisfy the final 400-800/freshness/location/report-form contract.',
         'timestamp',clock_timestamp()
       )
from updated u
where not exists (
  select 1 from public.admin_audit_logs l
  where l.action='news_intake.one_click_contract_quarantine' and l.target_id=u.id
);
