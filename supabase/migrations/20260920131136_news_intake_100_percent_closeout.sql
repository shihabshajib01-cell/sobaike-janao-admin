-- News Intake 100% closeout.
-- Enforces source-language-only public payloads, current-schema compliance with
-- explicit source omissions, conservative bilingual same-incident dedupe, and
-- the verified child incident-date repair.

CREATE OR REPLACE FUNCTION public.get_public_home_feed(p_visitor_lat double precision DEFAULT NULL::double precision, p_visitor_lng double precision DEFAULT NULL::double precision, p_filter text DEFAULT 'all'::text, p_district text DEFAULT 'all'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_result jsonb;
  v_has_visitor_loc boolean := false;
  v_clean_filter text;
  v_clean_district text;
begin
  if p_visitor_lat is not null and p_visitor_lng is not null
     and p_visitor_lat >= -90.0 and p_visitor_lat <= 90.0
     and p_visitor_lng >= -180.0 and p_visitor_lng <= 180.0
     and not (p_visitor_lat = 0.0 and p_visitor_lng = 0.0) then
    v_has_visitor_loc := true;
  end if;

  v_clean_filter := lower(trim(coalesce(p_filter, 'all')));
  if v_clean_filter not in ('all', 'latest', 'popular', 'most_shared') then
    v_clean_filter := 'all';
  end if;

  v_clean_district := lower(coalesce(public.canonical_district_name(p_district), trim(coalesce(p_district, 'all'))));

  with base_complaints as (
    select
      c.id,
      c.segment_id,
      c.subcategory_id,
      case when c.origin_type='sourced_report' and lower(coalesce(nullif(btrim(c.custom_field_answers->>'sourceLanguage'),''),'unknown'))='en' then null else coalesce(nullif(trim(c.publication_preferences->>'publicTitleBn'), ''), c.title) end as title_bn,
      case when c.origin_type='sourced_report' and lower(coalesce(nullif(btrim(c.custom_field_answers->>'sourceLanguage'),''),'unknown'))='bn' then null else coalesce(
        nullif(trim(c.publication_preferences->>'publicTitleEn'), ''),
        nullif(trim(c.title_en), ''),
        nullif(trim(c.publication_preferences->>'publicTitleBn'), ''),
        c.title
      ) end as title_en,
      case when (c.publication_preferences->'showDescription') = 'true'::jsonb
        then case when c.origin_type='sourced_report' and lower(coalesce(nullif(btrim(c.custom_field_answers->>'sourceLanguage'),''),'unknown'))='en' then null else coalesce(nullif(trim(c.publication_preferences->>'publicSummaryBn'), ''), c.description) end
        else null
      end as summary_bn,
      case when (c.publication_preferences->'showDescription') = 'true'::jsonb
        then case when c.origin_type='sourced_report' and lower(coalesce(nullif(btrim(c.custom_field_answers->>'sourceLanguage'),''),'unknown'))='bn' then null else coalesce(
          nullif(trim(c.publication_preferences->>'publicSummaryEn'), ''),
          nullif(trim(c.description_en), ''),
          nullif(trim(c.publication_preferences->>'publicSummaryBn'), ''),
          c.description
        ) end
        else null
      end as summary_en,
      case when c.origin_type='sourced_report' and lower(coalesce(nullif(btrim(c.custom_field_answers->>'sourceLanguage'),''),'unknown'))='en' then null else case when (c.publication_preferences->'showDescription') = 'true'::jsonb then c.description else null end end as description_bn,
      case when (c.publication_preferences->'showDescription') = 'true'::jsonb
        then case when c.origin_type='sourced_report' and lower(coalesce(nullif(btrim(c.custom_field_answers->>'sourceLanguage'),''),'unknown'))='bn' then null else coalesce(nullif(trim(c.description_en), ''), c.description) end
        else null
      end as description_en,
      case when (c.publication_preferences->'showGeneralLocation') = 'true'::jsonb then c.district else null end as district,
      case when (c.publication_preferences->'showGeneralLocation') = 'true'::jsonb then coalesce(loc_d.name_bn,case when public.location_text_language(c.district)='bn' then c.district end) else null end as district_bn,
      case when (c.publication_preferences->'showGeneralLocation') = 'true'::jsonb then coalesce(loc_d.name_en,case when public.location_text_language(c.district)='en' then c.district end) else null end as district_en,
      case when (c.publication_preferences->'showGeneralLocation') = 'true'::jsonb then c.area else null end as area,
      case when (c.publication_preferences->'showGeneralLocation') = 'true'::jsonb then public.compose_public_area(c.area,loc_u.name_bn,loc_d.name_bn,'bn') else null end as area_bn,
      case when (c.publication_preferences->'showGeneralLocation') = 'true'::jsonb then public.compose_public_area(c.area,loc_u.name_en,loc_d.name_en,'en') else null end as area_en,
      case when (c.publication_preferences->'showGeneralLocation') = 'true'::jsonb then coalesce(c.formatted_address,c.road,c.area,c.landmark,c.upazila_or_thana,c.district) else null end as location_display,
      case when (c.publication_preferences->'showGeneralLocation') = 'true'::jsonb then public.compose_public_location(c.formatted_address,c.road,c.area,c.landmark,loc_u.name_bn,loc_d.name_bn,'bn') else null end as location_bn,
      case when (c.publication_preferences->'showGeneralLocation') = 'true'::jsonb then public.compose_public_location(c.formatted_address,c.road,c.area,c.landmark,loc_u.name_en,loc_d.name_en,'en') else null end as location_en,
      c.incident_date,
      c.affected_person_age_group,
      c.alleged_abuser_relationship,
      c.reporting_for,
      c.incident_time,
      c.published_at as created_at,
      c.has_supporting_info,
      c.status,
      c.public_view_count,
      c.public_share_count,
      c.recent_bill_month,
      c.recent_bill_amount,
      c.previous_bill_month,
      c.previous_bill_amount,
      c.utility_end_time,
      case when (c.publication_preferences->'showSubjectName') = 'true'::jsonb then party.name else null end as party_name,
      case when (c.publication_preferences->'showOrganization') = 'true'::jsonb then party.organization else null end as party_org,
      case
        when v_has_visitor_loc
             and (c.publication_preferences->'showGeneralLocation') = 'true'::jsonb
             and c.latitude is not null and c.longitude is not null
             and not (c.latitude = 0.0 and c.longitude = 0.0)
             and c.latitude >= -90.0 and c.latitude <= 90.0
             and c.longitude >= -180.0 and c.longitude <= 180.0
        then 6371.0 * 2.0 * atan2(
          sqrt(
            sin(radians(c.latitude - p_visitor_lat) / 2.0) * sin(radians(c.latitude - p_visitor_lat) / 2.0)
            + cos(radians(p_visitor_lat)) * cos(radians(c.latitude))
            * sin(radians(c.longitude - p_visitor_lng) / 2.0) * sin(radians(c.longitude - p_visitor_lng) / 2.0)
          ),
          sqrt(greatest(0.0, 1.0 - (
            sin(radians(c.latitude - p_visitor_lat) / 2.0) * sin(radians(c.latitude - p_visitor_lat) / 2.0)
            + cos(radians(p_visitor_lat)) * cos(radians(c.latitude))
            * sin(radians(c.longitude - p_visitor_lng) / 2.0) * sin(radians(c.longitude - p_visitor_lng) / 2.0)
          )))
        )
        else null
      end as internal_distance_km
    from public.complaints c
    left join public.bangladesh_districts loc_d
      on loc_d.name_en=c.district
    left join public.bangladesh_upazilas loc_u
      on loc_u.district_id=loc_d.id and loc_u.name_en=c.upazila_or_thana
    left join lateral (
      select
        case when count(*) = 1 then max(nullif(trim(cp.name), '')) else null end as name,
        case when count(*) = 1 then max(nullif(trim(cp.organization), '')) else null end as organization
      from public.complaint_parties cp
      where cp.complaint_id = c.id
        and (
          nullif(trim(cp.name), '') is not null
          or nullif(trim(cp.organization), '') is not null
          or nullif(trim(cp.role_or_designation), '') is not null
          or nullif(trim(cp.phone_or_contact), '') is not null
          or nullif(trim(cp.public_profile_handle), '') is not null
          or nullif(trim(cp.identifying_description), '') is not null
          or nullif(trim(cp.address), '') is not null
          or trim(coalesce(cp.party_type, '')) in ('individual', 'business', 'group', 'organization')
        )
    ) party on true
    where c.status = 'published'
      and (
        v_clean_district = 'all'
        or (
          (c.publication_preferences->'showGeneralLocation') = 'true'::jsonb
          and lower(c.district) = v_clean_district
        )
      )
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', bc.id,
        'segment', bc.segment_id,
        'subcategoryId', bc.subcategory_id,
        'subcategoryBn', coalesce((select sc.name_bn from public.subcategories sc where sc.id = bc.subcategory_id), bc.subcategory_id),
        'subcategoryEn', coalesce((select sc.name_en from public.subcategories sc where sc.id = bc.subcategory_id), bc.subcategory_id),
        'titleBn', bc.title_bn,
        'titleEn', bc.title_en,
        'summaryBn', bc.summary_bn,
        'summaryEn', bc.summary_en,
        'descriptionBn', bc.description_bn,
        'descriptionEn', bc.description_en,
        'reportedSubject', bc.party_name,
        'organization', bc.party_org,
        'district', bc.district,
        'districtBn', bc.district_bn,
        'districtEn', bc.district_en,
        'area', bc.area,
        'areaBn', bc.area_bn,
        'areaEn', bc.area_en,
        'location', coalesce(bc.location_en,bc.location_bn,bc.location_display),
        'locationBn', bc.location_bn,
        'locationEn', bc.location_en,
        'incidentDate', to_char(bc.incident_date, 'YYYY-MM-DD'),
        'affectedPersonAgeGroup', bc.affected_person_age_group,
        'allegedAbuserRelationship', bc.alleged_abuser_relationship,
        'reportingFor', bc.reporting_for,
        'incidentTime', case when bc.segment_id = 'load_shedding' and bc.subcategory_id in ('load-shedding-outage', 'gas-shortage') then bc.incident_time else null end,
        'incident_time', case when bc.segment_id = 'load_shedding' and bc.subcategory_id in ('load-shedding-outage', 'gas-shortage') then bc.incident_time else null end,
        'publishedAt', to_char(bc.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'priority', 'medium',
        'hasSupportingInfo', bc.has_supporting_info,
        'status', bc.status,
        'viewCount', bc.public_view_count,
        'shareCount', bc.public_share_count,
        'recentBillMonth', bc.recent_bill_month,
        'recentBillAmount', bc.recent_bill_amount,
        'previousBillMonth', bc.previous_bill_month,
        'previousBillAmount', bc.previous_bill_amount,
        'recent_bill_month', bc.recent_bill_month,
        'recent_bill_amount', bc.recent_bill_amount,
        'previous_bill_month', bc.previous_bill_month,
        'previous_bill_amount', bc.previous_bill_amount,
        'utilityEndTime', case when bc.segment_id = 'load_shedding' and bc.subcategory_id in ('load-shedding-outage', 'gas-shortage') then bc.utility_end_time else null end,
        'utility_end_time', case when bc.segment_id = 'load_shedding' and bc.subcategory_id in ('load-shedding-outage', 'gas-shortage') then bc.utility_end_time else null end
      )
      order by
        case when v_clean_filter = 'all' and v_has_visitor_loc then bc.internal_distance_km end asc nulls last,
        case when v_clean_filter = 'latest' then bc.created_at end desc nulls last,
        case when v_clean_filter = 'latest' and v_has_visitor_loc then bc.internal_distance_km end asc nulls last,
        case when v_clean_filter = 'popular' then bc.public_view_count end desc nulls last,
        case when v_clean_filter = 'popular' then bc.public_share_count end desc nulls last,
        case when v_clean_filter = 'popular' and v_has_visitor_loc then bc.internal_distance_km end asc nulls last,
        case when v_clean_filter = 'most_shared' then bc.public_share_count end desc nulls last,
        case when v_clean_filter = 'most_shared' then bc.public_view_count end desc nulls last,
        case when v_clean_filter = 'most_shared' and v_has_visitor_loc then bc.internal_distance_km end asc nulls last,
        bc.created_at desc,
        bc.id desc
    ),
    '[]'::jsonb
  ) into v_result
  from base_complaints bc;

  return v_result;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_public_home_feed_page(p_visitor_lat double precision DEFAULT NULL::double precision, p_visitor_lng double precision DEFAULT NULL::double precision, p_filter text DEFAULT 'all'::text, p_district text DEFAULT 'all'::text, p_offset integer DEFAULT 0, p_limit integer DEFAULT 10)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_offset integer := greatest(coalesce(p_offset,0),0);
  v_limit integer := least(greatest(coalesce(p_limit,10),1),50);
  v_filter text := lower(trim(coalesce(p_filter,'all')));
  v_clean_district text;
  v_has_visitor_loc boolean := false;
  v_query_geog extensions.geography;
  v_candidate_ids text[] := '{}'::text[];
  v_page_ids text[] := '{}'::text[];
  v_geo_ids text[] := '{}'::text[];
  v_fallback_ids text[] := '{}'::text[];
  v_geo_count integer := 0;
  v_needed integer := 0;
  v_total_count integer := 0;
  v_items jsonb := '[]'::jsonb;
  v_has_more boolean := false;
begin
  if v_filter not in ('all','latest','popular','most_shared') then
    v_filter := 'all';
  end if;

  if p_visitor_lat is not null and p_visitor_lng is not null
     and p_visitor_lat between -90.0 and 90.0
     and p_visitor_lng between -180.0 and 180.0
     and not (p_visitor_lat=0.0 and p_visitor_lng=0.0) then
    v_has_visitor_loc := true;
    v_query_geog := extensions.st_setsrid(
      extensions.st_makepoint(p_visitor_lng,p_visitor_lat),
      4326
    )::extensions.geography;
  end if;

  v_clean_district := lower(
    coalesce(
      public.canonical_district_name(p_district),
      trim(coalesce(p_district,'all'))
    )
  );

  select count(*)
  into v_total_count
  from public.complaints c
  where c.status='published'
    and (
      v_clean_district='all'
      or (
        (c.publication_preferences->'showGeneralLocation')='true'::jsonb
        and lower(c.district)=v_clean_district
      )
    );

  if v_filter='all' and v_has_visitor_loc then
    select coalesce(
      array_agg(q.id order by q.geo_distance asc,q.created_at desc,q.id desc),
      '{}'::text[]
    )
    into v_geo_ids
    from (
      select
        c.id,c.published_at as created_at,
        (extensions.st_setsrid(extensions.st_makepoint(c.longitude,c.latitude),4326)::extensions.geography)
          operator(extensions.<->) v_query_geog as geo_distance
      from public.complaints c
      where c.status='published'
        and (v_clean_district='all' or lower(c.district)=v_clean_district)
        and (c.publication_preferences->'showGeneralLocation')='true'::jsonb
        and c.latitude is not null and c.longitude is not null
        and not (c.latitude=0.0 and c.longitude=0.0)
        and c.latitude between -90.0 and 90.0
        and c.longitude between -180.0 and 180.0
      order by
        (extensions.st_setsrid(extensions.st_makepoint(c.longitude,c.latitude),4326)::extensions.geography)
          operator(extensions.<->) v_query_geog asc,
        c.published_at desc,c.id desc
      offset v_offset
      limit v_limit + 1
    ) q;

    v_candidate_ids := coalesce(v_geo_ids,'{}'::text[]);

    if cardinality(v_candidate_ids) < v_limit + 1 then
      if cardinality(v_candidate_ids) > 0 then
        v_geo_count := v_offset + cardinality(v_candidate_ids);
      else
        select count(*) into v_geo_count
        from public.complaints c
        where c.status='published'
          and (v_clean_district='all' or lower(c.district)=v_clean_district)
          and (c.publication_preferences->'showGeneralLocation')='true'::jsonb
          and c.latitude is not null and c.longitude is not null
          and not (c.latitude=0.0 and c.longitude=0.0)
          and c.latitude between -90.0 and 90.0
          and c.longitude between -180.0 and 180.0;
      end if;

      v_needed := (v_limit + 1) - cardinality(v_candidate_ids);

      select coalesce(array_agg(q.id order by q.created_at desc,q.id desc),'{}'::text[])
      into v_fallback_ids
      from (
        select c.id,c.published_at as created_at
        from public.complaints c
        where c.status='published'
          and (
            v_clean_district='all'
            or (
              (c.publication_preferences->'showGeneralLocation')='true'::jsonb
              and lower(c.district)=v_clean_district
            )
          )
          and not (
            (c.publication_preferences->'showGeneralLocation')='true'::jsonb
            and c.latitude is not null and c.longitude is not null
            and not (c.latitude=0.0 and c.longitude=0.0)
            and c.latitude between -90.0 and 90.0
            and c.longitude between -180.0 and 180.0
          )
        order by c.published_at desc,c.id desc
        offset greatest(v_offset-v_geo_count,0)
        limit v_needed
      ) q;

      v_candidate_ids := v_candidate_ids || coalesce(v_fallback_ids,'{}'::text[]);
    end if;

  elsif v_filter in ('all','latest') and not v_has_visitor_loc then
    select coalesce(
      array_agg(q.id order by q.created_at desc,q.id desc),
      '{}'::text[]
    )
    into v_candidate_ids
    from (
      select c.id,c.published_at as created_at
      from public.complaints c
      where c.status='published'
        and (
          v_clean_district='all'
          or (
            (c.publication_preferences->'showGeneralLocation')='true'::jsonb
            and lower(c.district)=v_clean_district
          )
        )
      order by c.published_at desc,c.id desc
      offset v_offset
      limit v_limit + 1
    ) q;

  elsif v_filter='latest' and v_has_visitor_loc then
    select coalesce(
      array_agg(
        q.id
        order by q.created_at desc,q.geo_distance asc nulls last,q.id desc
      ),
      '{}'::text[]
    )
    into v_candidate_ids
    from (
      select
        c.id,
        c.published_at as created_at,
        case
          when (c.publication_preferences->'showGeneralLocation')='true'::jsonb
           and c.latitude is not null
           and c.longitude is not null
           and not (c.latitude=0.0 and c.longitude=0.0)
           and c.latitude between -90.0 and 90.0
           and c.longitude between -180.0 and 180.0
          then extensions.st_distance(
            extensions.st_setsrid(
              extensions.st_makepoint(c.longitude,c.latitude),
              4326
            )::extensions.geography,
            v_query_geog,
            false
          )
          else null
        end as geo_distance
      from public.complaints c
      where c.status='published'
        and (
          v_clean_district='all'
          or (
            (c.publication_preferences->'showGeneralLocation')='true'::jsonb
            and lower(c.district)=v_clean_district
          )
        )
      order by
        c.published_at desc,
        case
          when (c.publication_preferences->'showGeneralLocation')='true'::jsonb
           and c.latitude is not null
           and c.longitude is not null
           and not (c.latitude=0.0 and c.longitude=0.0)
           and c.latitude between -90.0 and 90.0
           and c.longitude between -180.0 and 180.0
          then extensions.st_distance(
            extensions.st_setsrid(
              extensions.st_makepoint(c.longitude,c.latitude),
              4326
            )::extensions.geography,
            v_query_geog,
            false
          )
          else null
        end asc nulls last,
        c.id desc
      offset v_offset
      limit v_limit + 1
    ) q;

  elsif v_filter='popular' and not v_has_visitor_loc then
    select coalesce(
      array_agg(
        q.id
        order by
          q.views desc,
          q.shares desc,
          q.published_second desc,
          q.created_at desc,
          q.id desc
      ),
      '{}'::text[]
    )
    into v_candidate_ids
    from (
      select
        c.id,
        c.published_at as created_at,
        c.public_view_count as views,
        c.public_share_count as shares,
        date_trunc('second',c.published_at at time zone 'UTC') as published_second
      from public.complaints c
      where c.status='published'
        and (
          v_clean_district='all'
          or (
            (c.publication_preferences->'showGeneralLocation')='true'::jsonb
            and lower(c.district)=v_clean_district
          )
        )
      order by
        c.public_view_count desc,
        c.public_share_count desc,
        date_trunc('second',c.published_at at time zone 'UTC') desc,
        c.published_at desc,
        c.id desc
      offset v_offset
      limit v_limit + 1
    ) q;

  elsif v_filter='popular' and v_has_visitor_loc then
    select coalesce(
      array_agg(
        q.id
        order by
          q.views desc,
          q.shares desc,
          q.published_second desc,
          q.geo_distance asc nulls last,
          q.created_at desc,
          q.id desc
      ),
      '{}'::text[]
    )
    into v_candidate_ids
    from (
      select
        c.id,
        c.published_at as created_at,
        c.public_view_count as views,
        c.public_share_count as shares,
        date_trunc('second',c.published_at at time zone 'UTC') as published_second,
        case
          when (c.publication_preferences->'showGeneralLocation')='true'::jsonb
           and c.latitude is not null
           and c.longitude is not null
           and not (c.latitude=0.0 and c.longitude=0.0)
           and c.latitude between -90.0 and 90.0
           and c.longitude between -180.0 and 180.0
          then extensions.st_distance(
            extensions.st_setsrid(
              extensions.st_makepoint(c.longitude,c.latitude),
              4326
            )::extensions.geography,
            v_query_geog,
            false
          )
          else null
        end as geo_distance
      from public.complaints c
      where c.status='published'
        and (
          v_clean_district='all'
          or (
            (c.publication_preferences->'showGeneralLocation')='true'::jsonb
            and lower(c.district)=v_clean_district
          )
        )
      order by
        c.public_view_count desc,
        c.public_share_count desc,
        date_trunc('second',c.published_at at time zone 'UTC') desc,
        case
          when (c.publication_preferences->'showGeneralLocation')='true'::jsonb
           and c.latitude is not null
           and c.longitude is not null
           and not (c.latitude=0.0 and c.longitude=0.0)
           and c.latitude between -90.0 and 90.0
           and c.longitude between -180.0 and 180.0
          then extensions.st_distance(
            extensions.st_setsrid(
              extensions.st_makepoint(c.longitude,c.latitude),
              4326
            )::extensions.geography,
            v_query_geog,
            false
          )
          else null
        end asc nulls last,
        c.published_at desc,
        c.id desc
      offset v_offset
      limit v_limit + 1
    ) q;

  elsif v_filter='most_shared' and not v_has_visitor_loc then
    select coalesce(
      array_agg(
        q.id
        order by
          q.shares desc,
          q.views desc,
          q.created_at desc,
          q.id desc
      ),
      '{}'::text[]
    )
    into v_candidate_ids
    from (
      select
        c.id,
        c.published_at as created_at,
        c.public_share_count as shares,
        c.public_view_count as views
      from public.complaints c
      where c.status='published'
        and (
          v_clean_district='all'
          or (
            (c.publication_preferences->'showGeneralLocation')='true'::jsonb
            and lower(c.district)=v_clean_district
          )
        )
      order by
        c.public_share_count desc,
        c.public_view_count desc,
        c.published_at desc,
        c.id desc
      offset v_offset
      limit v_limit + 1
    ) q;

  else
    select coalesce(
      array_agg(
        q.id
        order by
          q.shares desc,
          q.views desc,
          q.geo_distance asc nulls last,
          q.created_at desc,
          q.id desc
      ),
      '{}'::text[]
    )
    into v_candidate_ids
    from (
      select
        c.id,
        c.published_at as created_at,
        c.public_share_count as shares,
        c.public_view_count as views,
        case
          when (c.publication_preferences->'showGeneralLocation')='true'::jsonb
           and c.latitude is not null
           and c.longitude is not null
           and not (c.latitude=0.0 and c.longitude=0.0)
           and c.latitude between -90.0 and 90.0
           and c.longitude between -180.0 and 180.0
          then extensions.st_distance(
            extensions.st_setsrid(
              extensions.st_makepoint(c.longitude,c.latitude),
              4326
            )::extensions.geography,
            v_query_geog,
            false
          )
          else null
        end as geo_distance
      from public.complaints c
      where c.status='published'
        and (
          v_clean_district='all'
          or (
            (c.publication_preferences->'showGeneralLocation')='true'::jsonb
            and lower(c.district)=v_clean_district
          )
        )
      order by
        c.public_share_count desc,
        c.public_view_count desc,
        case
          when (c.publication_preferences->'showGeneralLocation')='true'::jsonb
           and c.latitude is not null
           and c.longitude is not null
           and not (c.latitude=0.0 and c.longitude=0.0)
           and c.latitude between -90.0 and 90.0
           and c.longitude between -180.0 and 180.0
          then extensions.st_distance(
            extensions.st_setsrid(
              extensions.st_makepoint(c.longitude,c.latitude),
              4326
            )::extensions.geography,
            v_query_geog,
            false
          )
          else null
        end asc nulls last,
        c.published_at desc,
        c.id desc
      offset v_offset
      limit v_limit + 1
    ) q;
  end if;

  v_has_more := coalesce(cardinality(v_candidate_ids),0) > v_limit;

  if v_has_more then
    v_page_ids := v_candidate_ids[1:v_limit];
  else
    v_page_ids := coalesce(v_candidate_ids,'{}'::text[]);
  end if;

  with selected_ids as (
    select s.id,s.ordinality
    from unnest(v_page_ids) with ordinality as s(id,ordinality)
  ),
  base_complaints as (
    select
      s.ordinality,
      c.id,
      c.segment_id,
      c.subcategory_id,
      case when c.origin_type='sourced_report' and lower(coalesce(nullif(btrim(c.custom_field_answers->>'sourceLanguage'),''),'unknown'))='en' then null else coalesce(
        nullif(trim(c.publication_preferences->>'publicTitleBn'),''),
        c.title
      ) end as title_bn,
      case when c.origin_type='sourced_report' and lower(coalesce(nullif(btrim(c.custom_field_answers->>'sourceLanguage'),''),'unknown'))='bn' then null else coalesce(
        nullif(trim(c.publication_preferences->>'publicTitleEn'),''),
        nullif(trim(c.title_en),''),
        nullif(trim(c.publication_preferences->>'publicTitleBn'),''),
        c.title
      ) end as title_en,
      case
        when (c.publication_preferences->'showDescription')='true'::jsonb
        then case when c.origin_type='sourced_report' and lower(coalesce(nullif(btrim(c.custom_field_answers->>'sourceLanguage'),''),'unknown'))='en' then null else coalesce(
          nullif(trim(c.publication_preferences->>'publicSummaryBn'),''),
          c.description
        ) end
        else null
      end as summary_bn,
      case
        when (c.publication_preferences->'showDescription')='true'::jsonb
        then case when c.origin_type='sourced_report' and lower(coalesce(nullif(btrim(c.custom_field_answers->>'sourceLanguage'),''),'unknown'))='bn' then null else coalesce(
          nullif(trim(c.publication_preferences->>'publicSummaryEn'),''),
          nullif(trim(c.description_en),''),
          nullif(trim(c.publication_preferences->>'publicSummaryBn'),''),
          c.description
        ) end
        else null
      end as summary_en,
      case when c.origin_type='sourced_report' and lower(coalesce(nullif(btrim(c.custom_field_answers->>'sourceLanguage'),''),'unknown'))='en' then null else case
        when (c.publication_preferences->'showDescription')='true'::jsonb
        then c.description
        else null
      end end as description_bn,
      case
        when (c.publication_preferences->'showDescription')='true'::jsonb
        then case when c.origin_type='sourced_report' and lower(coalesce(nullif(btrim(c.custom_field_answers->>'sourceLanguage'),''),'unknown'))='bn' then null else coalesce(nullif(trim(c.description_en),''),c.description) end
        else null
      end as description_en,
      case
        when (c.publication_preferences->'showGeneralLocation')='true'::jsonb
        then c.district
        else null
      end as district,
      case
        when (c.publication_preferences->'showGeneralLocation')='true'::jsonb
        then coalesce(
          loc_d.name_bn,
          case when public.location_text_language(c.district)='bn' then c.district end
        )
        else null
      end as district_bn,
      case
        when (c.publication_preferences->'showGeneralLocation')='true'::jsonb
        then coalesce(
          loc_d.name_en,
          case when public.location_text_language(c.district)='en' then c.district end
        )
        else null
      end as district_en,
      case
        when (c.publication_preferences->'showGeneralLocation')='true'::jsonb
        then c.area
        else null
      end as area,
      case
        when (c.publication_preferences->'showGeneralLocation')='true'::jsonb
        then public.compose_public_area(c.area,loc_u.name_bn,loc_d.name_bn,'bn')
        else null
      end as area_bn,
      case
        when (c.publication_preferences->'showGeneralLocation')='true'::jsonb
        then public.compose_public_area(c.area,loc_u.name_en,loc_d.name_en,'en')
        else null
      end as area_en,
      case
        when (c.publication_preferences->'showGeneralLocation')='true'::jsonb
        then coalesce(
          c.formatted_address,
          c.road,
          c.area,
          c.landmark,
          c.upazila_or_thana,
          c.district
        )
        else null
      end as location_display,
      case
        when (c.publication_preferences->'showGeneralLocation')='true'::jsonb
        then public.compose_public_location(
          c.formatted_address,
          c.road,
          c.area,
          c.landmark,
          loc_u.name_bn,
          loc_d.name_bn,
          'bn'
        )
        else null
      end as location_bn,
      case
        when (c.publication_preferences->'showGeneralLocation')='true'::jsonb
        then public.compose_public_location(
          c.formatted_address,
          c.road,
          c.area,
          c.landmark,
          loc_u.name_en,
          loc_d.name_en,
          'en'
        )
        else null
      end as location_en,
      c.incident_date,
      c.affected_person_age_group,
      c.alleged_abuser_relationship,
      c.reporting_for,
      c.incident_time,
      c.published_at as created_at,
      c.has_supporting_info,
      c.status,
      c.public_view_count,
      c.public_share_count,
      c.recent_bill_month,
      c.recent_bill_amount,
      c.previous_bill_month,
      c.previous_bill_amount,
      c.utility_end_time,
      case
        when (c.publication_preferences->'showSubjectName')='true'::jsonb
        then party.name
        else null
      end as party_name,
      case
        when (c.publication_preferences->'showOrganization')='true'::jsonb
        then party.organization
        else null
      end as party_org,
      sc.name_bn as subcategory_bn,
      sc.name_en as subcategory_en
    from selected_ids s
    join public.complaints c on c.id=s.id
    left join public.subcategories sc on sc.id=c.subcategory_id
    left join public.bangladesh_districts loc_d
      on loc_d.name_en=c.district
    left join public.bangladesh_upazilas loc_u
      on loc_u.district_id=loc_d.id
     and loc_u.name_en=c.upazila_or_thana
    left join lateral (
      select
        case when count(*)=1
          then max(nullif(trim(cp.name),''))
          else null
        end as name,
        case when count(*)=1
          then max(nullif(trim(cp.organization),''))
          else null
        end as organization
      from public.complaint_parties cp
      where cp.complaint_id=c.id
        and (
          nullif(trim(cp.name),'') is not null
          or nullif(trim(cp.organization),'') is not null
          or nullif(trim(cp.role_or_designation),'') is not null
          or nullif(trim(cp.phone_or_contact),'') is not null
          or nullif(trim(cp.public_profile_handle),'') is not null
          or nullif(trim(cp.identifying_description),'') is not null
          or nullif(trim(cp.address),'') is not null
          or trim(coalesce(cp.party_type,'')) in (
            'individual','business','group','organization'
          )
        )
    ) party on true
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',bc.id,
        'segment',bc.segment_id,
        'subcategoryId',bc.subcategory_id,
        'subcategoryBn',coalesce(bc.subcategory_bn,bc.subcategory_id),
        'subcategoryEn',coalesce(bc.subcategory_en,bc.subcategory_id),
        'titleBn',bc.title_bn,
        'titleEn',bc.title_en,
        'summaryBn',bc.summary_bn,
        'summaryEn',bc.summary_en,
        'descriptionBn',bc.description_bn,
        'descriptionEn',bc.description_en,
        'reportedSubject',bc.party_name,
        'organization',bc.party_org,
        'district',bc.district,
        'districtBn',bc.district_bn,
        'districtEn',bc.district_en,
        'area',bc.area,
        'areaBn',bc.area_bn,
        'areaEn',bc.area_en,
        'location',coalesce(bc.location_en,bc.location_bn,bc.location_display),
        'locationBn',bc.location_bn,
        'locationEn',bc.location_en,
        'incidentDate',to_char(bc.incident_date,'YYYY-MM-DD'),
        'affectedPersonAgeGroup',bc.affected_person_age_group,
        'allegedAbuserRelationship',bc.alleged_abuser_relationship,
        'reportingFor',bc.reporting_for,
        'incidentTime',
          case
            when bc.segment_id='load_shedding'
             and bc.subcategory_id in ('load-shedding-outage','gas-shortage')
            then bc.incident_time
            else null
          end,
        'incident_time',
          case
            when bc.segment_id='load_shedding'
             and bc.subcategory_id in ('load-shedding-outage','gas-shortage')
            then bc.incident_time
            else null
          end,
        'publishedAt',
          to_char(
            bc.created_at at time zone 'UTC',
            'YYYY-MM-DD"T"HH24:MI:SS"Z"'
          ),
        'priority','medium',
        'hasSupportingInfo',bc.has_supporting_info,
        'status',bc.status,
        'viewCount',bc.public_view_count,
        'shareCount',bc.public_share_count,
        'recentBillMonth',bc.recent_bill_month,
        'recentBillAmount',bc.recent_bill_amount,
        'previousBillMonth',bc.previous_bill_month,
        'previousBillAmount',bc.previous_bill_amount,
        'recent_bill_month',bc.recent_bill_month,
        'recent_bill_amount',bc.recent_bill_amount,
        'previous_bill_month',bc.previous_bill_month,
        'previous_bill_amount',bc.previous_bill_amount,
        'utilityEndTime',
          case
            when bc.segment_id='load_shedding'
             and bc.subcategory_id in ('load-shedding-outage','gas-shortage')
            then bc.utility_end_time
            else null
          end,
        'utility_end_time',
          case
            when bc.segment_id='load_shedding'
             and bc.subcategory_id in ('load-shedding-outage','gas-shortage')
            then bc.utility_end_time
            else null
          end
      )
      order by bc.ordinality
    ),
    '[]'::jsonb
  )
  into v_items
  from base_complaints bc;

  return jsonb_build_object(
    'items',v_items,
    'hasMore',v_has_more,
    'nextOffset',
      case when v_has_more then v_offset+v_limit else null end,
    'offset',v_offset,
    'limit',v_limit,
    'totalCount',v_total_count
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_public_published_report(p_report_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE v_result jsonb; v_clean_id text;
BEGIN
  v_clean_id := upper(trim(coalesce(p_report_id, '')));
  IF v_clean_id = '' THEN RETURN NULL; END IF;
  SELECT (jsonb_build_object(
    'id', c.id,
    'reporterName', CASE WHEN c.privacy_choice = 'public_identity' AND c.confirm_public_identity = true THEN nullif(trim(c.reporter_name), '') ELSE NULL END,
    'segment', c.segment_id,
    'subcategoryId', c.subcategory_id,
    'subcategoryBn', coalesce((SELECT sc.name_bn FROM public.subcategories sc WHERE sc.id = c.subcategory_id), c.subcategory_id),
    'subcategoryEn', coalesce((SELECT sc.name_en FROM public.subcategories sc WHERE sc.id = c.subcategory_id), c.subcategory_id),
    'titleBn', case when c.origin_type='sourced_report' and lower(coalesce(nullif(btrim(c.custom_field_answers->>'sourceLanguage'),''),'unknown'))='en' then null else coalesce(nullif(trim(c.publication_preferences->>'publicTitleBn'), ''), c.title) end,
    'titleEn', case when c.origin_type='sourced_report' and lower(coalesce(nullif(btrim(c.custom_field_answers->>'sourceLanguage'),''),'unknown'))='bn' then null else coalesce(nullif(trim(c.publication_preferences->>'publicTitleEn'), ''), nullif(trim(c.title_en), ''), nullif(trim(c.publication_preferences->>'publicTitleBn'), ''), c.title) end,
    'summaryBn', CASE WHEN (c.publication_preferences->'showDescription') = 'true'::jsonb THEN case when c.origin_type='sourced_report' and lower(coalesce(nullif(btrim(c.custom_field_answers->>'sourceLanguage'),''),'unknown'))='en' then null else coalesce(nullif(trim(c.publication_preferences->>'publicSummaryBn'), ''), c.description) end ELSE NULL END,
    'summaryEn', CASE WHEN (c.publication_preferences->'showDescription') = 'true'::jsonb THEN case when c.origin_type='sourced_report' and lower(coalesce(nullif(btrim(c.custom_field_answers->>'sourceLanguage'),''),'unknown'))='bn' then null else coalesce(nullif(trim(c.publication_preferences->>'publicSummaryEn'), ''), nullif(trim(c.description_en), ''), nullif(trim(c.publication_preferences->>'publicSummaryBn'), ''), c.description) end ELSE NULL END,
    'descriptionBn', case when c.origin_type='sourced_report' and lower(coalesce(nullif(btrim(c.custom_field_answers->>'sourceLanguage'),''),'unknown'))='en' then null else CASE WHEN (c.publication_preferences->'showDescription') = 'true'::jsonb THEN c.description ELSE NULL END end,
    'descriptionEn', CASE WHEN (c.publication_preferences->'showDescription') = 'true'::jsonb THEN case when c.origin_type='sourced_report' and lower(coalesce(nullif(btrim(c.custom_field_answers->>'sourceLanguage'),''),'unknown'))='bn' then null else coalesce(nullif(trim(c.description_en), ''), c.description) end ELSE NULL END,
    'reportedSubject', CASE WHEN (c.publication_preferences->'showSubjectName') = 'true'::jsonb THEN party.name ELSE NULL END,
    'organization', CASE WHEN (c.publication_preferences->'showOrganization') = 'true'::jsonb THEN party.organization ELSE NULL END,
    'district', CASE WHEN (c.publication_preferences->'showGeneralLocation') = 'true'::jsonb THEN c.district ELSE NULL END,
    'districtBn', CASE WHEN (c.publication_preferences->'showGeneralLocation') = 'true'::jsonb THEN coalesce(loc_d.name_bn,case when public.location_text_language(c.district)='bn' then c.district end) ELSE NULL END,
    'districtEn', CASE WHEN (c.publication_preferences->'showGeneralLocation') = 'true'::jsonb THEN coalesce(loc_d.name_en,case when public.location_text_language(c.district)='en' then c.district end) ELSE NULL END,
    'area', CASE WHEN (c.publication_preferences->'showGeneralLocation') = 'true'::jsonb THEN c.area ELSE NULL END,
    'areaBn', CASE WHEN (c.publication_preferences->'showGeneralLocation') = 'true'::jsonb THEN public.compose_public_area(c.area,loc_u.name_bn,loc_d.name_bn,'bn') ELSE NULL END,
    'areaEn', CASE WHEN (c.publication_preferences->'showGeneralLocation') = 'true'::jsonb THEN public.compose_public_area(c.area,loc_u.name_en,loc_d.name_en,'en') ELSE NULL END,
    'location', CASE WHEN (c.publication_preferences->'showGeneralLocation') = 'true'::jsonb THEN coalesce(public.compose_public_location(c.formatted_address,c.road,c.area,c.landmark,loc_u.name_en,loc_d.name_en,'en'),public.compose_public_location(c.formatted_address,c.road,c.area,c.landmark,loc_u.name_bn,loc_d.name_bn,'bn'),c.formatted_address,c.road,c.area,c.landmark,c.upazila_or_thana,c.district) ELSE NULL END,
    'locationBn', CASE WHEN (c.publication_preferences->'showGeneralLocation') = 'true'::jsonb THEN public.compose_public_location(c.formatted_address,c.road,c.area,c.landmark,loc_u.name_bn,loc_d.name_bn,'bn') ELSE NULL END,
    'locationEn', CASE WHEN (c.publication_preferences->'showGeneralLocation') = 'true'::jsonb THEN public.compose_public_location(c.formatted_address,c.road,c.area,c.landmark,loc_u.name_en,loc_d.name_en,'en') ELSE NULL END,
    'incidentDate', to_char(c.incident_date, 'YYYY-MM-DD'),
    'affectedPersonAgeGroup', c.affected_person_age_group,
    'allegedAbuserRelationship', c.alleged_abuser_relationship,
    'reportingFor', c.reporting_for,
    'intimateWhatHappened', CASE WHEN c.segment_id = 'harassment' AND c.subcategory_id = 'blackmail-coercion' THEN c.intimate_what_happened #>> '{}' ELSE NULL END,
    'intimatePlatform', CASE WHEN c.segment_id = 'harassment' AND c.subcategory_id = 'blackmail-coercion' THEN c.intimate_platform #>> '{}' ELSE NULL END,
    'briberyDepartment', CASE WHEN c.segment_id = 'extortion' AND c.subcategory_id = 'bribe-demanded-service' THEN c.bribery_department ELSE NULL END,
    'briberyService', CASE WHEN c.segment_id = 'extortion' AND c.subcategory_id = 'bribe-demanded-service' THEN c.bribery_service ELSE NULL END
  ) || jsonb_build_object(
    'briberyAmount', CASE WHEN c.segment_id = 'extortion' AND c.subcategory_id = 'bribe-demanded-service' THEN c.bribery_amount ELSE NULL END,
    'bribery_department', CASE WHEN c.segment_id = 'extortion' AND c.subcategory_id = 'bribe-demanded-service' THEN c.bribery_department ELSE NULL END,
    'bribery_service', CASE WHEN c.segment_id = 'extortion' AND c.subcategory_id = 'bribe-demanded-service' THEN c.bribery_service ELSE NULL END,
    'bribery_amount', CASE WHEN c.segment_id = 'extortion' AND c.subcategory_id = 'bribe-demanded-service' THEN c.bribery_amount ELSE NULL END,
    'frequency', CASE WHEN c.segment_id = 'extortion' THEN c.frequency ELSE NULL END,
    'incidentTime', CASE WHEN (c.segment_id = 'load_shedding' AND c.subcategory_id IN ('load-shedding-outage', 'gas-shortage')) OR c.segment_id = 'extortion' THEN c.incident_time ELSE NULL END,
    'incident_time', CASE WHEN (c.segment_id = 'load_shedding' AND c.subcategory_id IN ('load-shedding-outage', 'gas-shortage')) OR c.segment_id = 'extortion' THEN c.incident_time ELSE NULL END,
    'publishedAt', to_char(c.published_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'updatedAt', to_char(c.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'priority', 'medium',
    'hasSupportingInfo', c.has_supporting_info,
    'status', c.status,
    'viewCount', c.public_view_count,
    'shareCount', c.public_share_count,
    'recentBillMonth', c.recent_bill_month,
    'recentBillAmount', c.recent_bill_amount,
    'previousBillMonth', c.previous_bill_month,
    'previousBillAmount', c.previous_bill_amount,
    'recent_bill_month', c.recent_bill_month,
    'recent_bill_amount', c.recent_bill_amount,
    'previous_bill_month', c.previous_bill_month,
    'previous_bill_amount', c.previous_bill_amount,
    'utilityEndTime', CASE WHEN c.segment_id = 'load_shedding' AND c.subcategory_id IN ('load-shedding-outage', 'gas-shortage') THEN c.utility_end_time ELSE NULL END,
    'utility_end_time', CASE WHEN c.segment_id = 'load_shedding' AND c.subcategory_id IN ('load-shedding-outage', 'gas-shortage') THEN c.utility_end_time ELSE NULL END
  )) INTO v_result
  FROM public.complaints c
  LEFT JOIN public.bangladesh_districts loc_d ON loc_d.name_en=c.district
  LEFT JOIN public.bangladesh_upazilas loc_u ON loc_u.district_id=loc_d.id AND loc_u.name_en=c.upazila_or_thana
  LEFT JOIN LATERAL (
    SELECT CASE WHEN count(*) = 1 THEN max(nullif(trim(cp.name), '')) ELSE NULL END AS name,
           CASE WHEN count(*) = 1 THEN max(nullif(trim(cp.organization), '')) ELSE NULL END AS organization
    FROM public.complaint_parties cp
    WHERE cp.complaint_id = c.id AND (
      nullif(trim(cp.name), '') IS NOT NULL OR nullif(trim(cp.organization), '') IS NOT NULL OR nullif(trim(cp.role_or_designation), '') IS NOT NULL OR nullif(trim(cp.phone_or_contact), '') IS NOT NULL OR nullif(trim(cp.public_profile_handle), '') IS NOT NULL OR nullif(trim(cp.identifying_description), '') IS NOT NULL OR nullif(trim(cp.address), '') IS NOT NULL OR trim(coalesce(cp.party_type, '')) IN ('individual', 'business', 'group', 'organization')
    )
  ) party ON true
  WHERE upper(c.id) = v_clean_id AND c.status = 'published';
  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_public_published_reports()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_result jsonb;
begin
  select coalesce(
    jsonb_agg(
      (
        jsonb_build_object(
          'id', c.id,
          'segment', c.segment_id,
          'subcategoryId', c.subcategory_id,
          'subcategoryBn', coalesce((select sc.name_bn from public.subcategories sc where sc.id = c.subcategory_id), c.subcategory_id),
          'subcategoryEn', coalesce((select sc.name_en from public.subcategories sc where sc.id = c.subcategory_id), c.subcategory_id),
          'titleBn', case when c.origin_type='sourced_report' and lower(coalesce(nullif(btrim(c.custom_field_answers->>'sourceLanguage'),''),'unknown'))='en' then null else coalesce(nullif(trim(c.publication_preferences->>'publicTitleBn'), ''), c.title) end,
          'titleEn', case when c.origin_type='sourced_report' and lower(coalesce(nullif(btrim(c.custom_field_answers->>'sourceLanguage'),''),'unknown'))='bn' then null else coalesce(nullif(trim(c.publication_preferences->>'publicTitleEn'), ''), nullif(trim(c.title_en), ''), nullif(trim(c.publication_preferences->>'publicTitleBn'), ''), c.title) end,
          'summaryBn', case when (c.publication_preferences->'showDescription') = 'true'::jsonb then case when c.origin_type='sourced_report' and lower(coalesce(nullif(btrim(c.custom_field_answers->>'sourceLanguage'),''),'unknown'))='en' then null else coalesce(nullif(trim(c.publication_preferences->>'publicSummaryBn'), ''), c.description) end else null end,
          'summaryEn', case when (c.publication_preferences->'showDescription') = 'true'::jsonb then case when c.origin_type='sourced_report' and lower(coalesce(nullif(btrim(c.custom_field_answers->>'sourceLanguage'),''),'unknown'))='bn' then null else coalesce(nullif(trim(c.publication_preferences->>'publicSummaryEn'), ''), nullif(trim(c.description_en), ''), nullif(trim(c.publication_preferences->>'publicSummaryBn'), ''), c.description) end else null end,
          'descriptionBn', case when c.origin_type='sourced_report' and lower(coalesce(nullif(btrim(c.custom_field_answers->>'sourceLanguage'),''),'unknown'))='en' then null else case when (c.publication_preferences->'showDescription') = 'true'::jsonb then c.description else null end end,
          'descriptionEn', case when (c.publication_preferences->'showDescription') = 'true'::jsonb then case when c.origin_type='sourced_report' and lower(coalesce(nullif(btrim(c.custom_field_answers->>'sourceLanguage'),''),'unknown'))='bn' then null else coalesce(nullif(trim(c.description_en), ''), c.description) end else null end,
          'reportedSubject', case when (c.publication_preferences->'showSubjectName') = 'true'::jsonb then party.name else null end,
          'organization', case when (c.publication_preferences->'showOrganization') = 'true'::jsonb then party.organization else null end,
          'district', case when (c.publication_preferences->'showGeneralLocation') = 'true'::jsonb then c.district else null end,
          'districtBn', case when (c.publication_preferences->'showGeneralLocation') = 'true'::jsonb then district_match.name_bn else null end,
          'districtEn', case when (c.publication_preferences->'showGeneralLocation') = 'true'::jsonb then district_match.name_en else null end,
          'area', case when (c.publication_preferences->'showGeneralLocation') = 'true'::jsonb then c.area else null end,
          'areaBn', case
            when (c.publication_preferences->'showGeneralLocation') <> 'true'::jsonb then null
            when nullif(btrim(coalesce(c.area,'')),'') is not null and public.location_text_language(c.area)='bn' then btrim(c.area)
            when upazila_match.name_bn is not null then upazila_match.name_bn
            else district_match.name_bn
          end,
          'areaEn', case
            when (c.publication_preferences->'showGeneralLocation') <> 'true'::jsonb then null
            when nullif(btrim(coalesce(c.area,'')),'') is not null and public.location_text_language(c.area)='en' then btrim(c.area)
            when upazila_match.name_en is not null then upazila_match.name_en
            else district_match.name_en
          end,
          'location', case
            when (c.publication_preferences->'showGeneralLocation') = 'true'::jsonb
            then coalesce(location_parts.location_en, location_parts.location_bn, c.formatted_address, c.road, c.area, c.landmark, c.upazila_or_thana, c.district)
            else null
          end,
          'locationBn', case when (c.publication_preferences->'showGeneralLocation') = 'true'::jsonb then location_parts.location_bn else null end,
          'locationEn', case when (c.publication_preferences->'showGeneralLocation') = 'true'::jsonb then location_parts.location_en else null end,
          'incidentDate', to_char(c.incident_date, 'YYYY-MM-DD'),
          'affectedPersonAgeGroup', c.affected_person_age_group,
          'allegedAbuserRelationship', c.alleged_abuser_relationship,
          'reportingFor', c.reporting_for,
          'briberyDepartment', case when c.segment_id = 'extortion' and c.subcategory_id = 'bribe-demanded-service' then c.bribery_department else null end,
          'briberyService', case when c.segment_id = 'extortion' and c.subcategory_id = 'bribe-demanded-service' then c.bribery_service else null end
        )
        ||
        jsonb_build_object(
          'briberyAmount', case when c.segment_id = 'extortion' and c.subcategory_id = 'bribe-demanded-service' then c.bribery_amount else null end,
          'bribery_department', case when c.segment_id = 'extortion' and c.subcategory_id = 'bribe-demanded-service' then c.bribery_department else null end,
          'bribery_service', case when c.segment_id = 'extortion' and c.subcategory_id = 'bribe-demanded-service' then c.bribery_service else null end,
          'bribery_amount', case when c.segment_id = 'extortion' and c.subcategory_id = 'bribe-demanded-service' then c.bribery_amount else null end,
          'frequency', case when c.segment_id = 'extortion' then c.frequency else null end,
          'incidentTime', case when (c.segment_id = 'load_shedding' and c.subcategory_id in ('load-shedding-outage', 'gas-shortage')) or c.segment_id = 'extortion' then c.incident_time else null end,
          'incident_time', case when (c.segment_id = 'load_shedding' and c.subcategory_id in ('load-shedding-outage', 'gas-shortage')) or c.segment_id = 'extortion' then c.incident_time else null end,
          'publishedAt', to_char(c.published_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
          'updatedAt', to_char(c.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
          'priority', 'medium',
          'hasSupportingInfo', c.has_supporting_info,
          'status', c.status,
          'viewCount', c.public_view_count,
          'shareCount', c.public_share_count,
          'recentBillMonth', c.recent_bill_month,
          'recentBillAmount', c.recent_bill_amount,
          'previousBillMonth', c.previous_bill_month,
          'previousBillAmount', c.previous_bill_amount,
          'recent_bill_month', c.recent_bill_month,
          'recent_bill_amount', c.recent_bill_amount,
          'previous_bill_month', c.previous_bill_month,
          'previous_bill_amount', c.previous_bill_amount,
          'utilityEndTime', case when c.segment_id = 'load_shedding' and c.subcategory_id in ('load-shedding-outage', 'gas-shortage') then c.utility_end_time else null end,
          'utility_end_time', case when c.segment_id = 'load_shedding' and c.subcategory_id in ('load-shedding-outage', 'gas-shortage') then c.utility_end_time else null end
        )
      )
      order by c.published_at desc, c.id desc
    ),
    '[]'::jsonb
  )
  into v_result
  from public.complaints c
  left join lateral (
    select
      case when count(*) = 1 then max(nullif(trim(cp.name), '')) else null end as name,
      case when count(*) = 1 then max(nullif(trim(cp.organization), '')) else null end as organization
    from public.complaint_parties cp
    where cp.complaint_id = c.id
      and (
        nullif(trim(cp.name), '') is not null
        or nullif(trim(cp.organization), '') is not null
        or nullif(trim(cp.role_or_designation), '') is not null
        or nullif(trim(cp.phone_or_contact), '') is not null
        or nullif(trim(cp.public_profile_handle), '') is not null
        or nullif(trim(cp.identifying_description), '') is not null
        or nullif(trim(cp.address), '') is not null
        or trim(coalesce(cp.party_type, '')) in ('individual', 'business', 'group', 'organization')
      )
  ) party on true
  left join lateral (
    select d.id, d.name_bn, d.name_en
    from public.bangladesh_districts d
    where lower(btrim(coalesce(c.district,''))) in (lower(d.id),lower(d.name_en),lower(d.name_bn))
       or exists (
         select 1
         from unnest(d.aliases) alias_value
         where lower(alias_value)=lower(btrim(coalesce(c.district,'')))
       )
    limit 1
  ) district_match on true
  left join lateral (
    select u.name_bn, u.name_en, u.district_id
    from public.bangladesh_upazilas u
    where (
      lower(btrim(coalesce(c.upazila_or_thana,''))) in (lower(u.id),lower(u.name_en),lower(u.name_bn))
      or exists (
        select 1
        from unnest(u.aliases) alias_value
        where lower(alias_value)=lower(btrim(coalesce(c.upazila_or_thana,'')))
      )
    )
    and (
      nullif(btrim(coalesce(c.district,'')),'') is null
      or (district_match.id is not null and u.district_id=district_match.id)
    )
    order by case when district_match.id is not null and u.district_id=district_match.id then 0 else 1 end, u.id
    limit 1
  ) upazila_match on true
  left join lateral (
    select
      case
        when nullif(btrim(coalesce(c.formatted_address,'')),'') is not null
         and public.location_text_language(c.formatted_address)='bn'
        then btrim(c.formatted_address)
        else (
          select string_agg(dedup.value, ', ' order by dedup.first_ord)
          from (
            select part.value, min(part.ord) as first_ord
            from unnest(array[
              case when nullif(btrim(coalesce(c.road,'')),'') is not null and public.location_text_language(c.road)='bn' then btrim(c.road) end,
              case when nullif(btrim(coalesce(c.area,'')),'') is not null and public.location_text_language(c.area)='bn' then btrim(c.area) end,
              case when nullif(btrim(coalesce(c.landmark,'')),'') is not null and public.location_text_language(c.landmark)='bn' then btrim(c.landmark) end,
              coalesce(upazila_match.name_bn, case when public.location_text_language(c.upazila_or_thana)='bn' then btrim(c.upazila_or_thana) end),
              coalesce(district_match.name_bn, case when public.location_text_language(c.district)='bn' then btrim(c.district) end)
            ]) with ordinality as part(value, ord)
            where nullif(part.value,'') is not null
            group by part.value
          ) dedup
        )
      end as location_bn,
      case
        when nullif(btrim(coalesce(c.formatted_address,'')),'') is not null
         and public.location_text_language(c.formatted_address)='en'
        then btrim(c.formatted_address)
        else (
          select string_agg(dedup.value, ', ' order by dedup.first_ord)
          from (
            select part.value, min(part.ord) as first_ord
            from unnest(array[
              case when nullif(btrim(coalesce(c.road,'')),'') is not null and public.location_text_language(c.road)='en' then btrim(c.road) end,
              case when nullif(btrim(coalesce(c.area,'')),'') is not null and public.location_text_language(c.area)='en' then btrim(c.area) end,
              case when nullif(btrim(coalesce(c.landmark,'')),'') is not null and public.location_text_language(c.landmark)='en' then btrim(c.landmark) end,
              coalesce(upazila_match.name_en, case when public.location_text_language(c.upazila_or_thana)='en' then btrim(c.upazila_or_thana) end),
              coalesce(district_match.name_en, case when public.location_text_language(c.district)='en' then btrim(c.district) end)
            ]) with ordinality as part(value, ord)
            where nullif(part.value,'') is not null
            group by part.value
          ) dedup
        )
      end as location_en
  ) location_parts on true
  where c.status = 'published';

  return v_result;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.guard_sourced_report_schema_requirements()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_report jsonb;
  v_missing jsonb;
  v_omitted jsonb:='[]'::jsonb;
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
    'road',new.road,
    'landmark',new.landmark,
    'formattedAddress',new.formatted_address,
    'frequency',new.frequency,
    'incidentDate',case when new.incident_date is null then null else to_jsonb(new.incident_date::text) end,
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

  if lower(coalesce(new.custom_field_answers->>'trustedSourceAuto','false'))='true' then
    v_omitted:=coalesce(new.custom_field_answers->'sourceOmittedFields','[]'::jsonb);
    if jsonb_typeof(v_omitted)<>'array' then v_omitted:='[]'::jsonb; end if;

    select coalesce(jsonb_agg(item),'[]'::jsonb)
    into v_missing
    from jsonb_array_elements(v_missing) item
    where not exists (
      select 1
      from jsonb_array_elements_text(v_omitted) omitted(value)
      where omitted.value in (item->>'fieldKey',item->>'storageKey')
         or (
           omitted.value='location'
           and (
             item->>'storageKey'='location'
             or item->>'fieldKey' in ('canonicalLocation','locationSpecificity')
           )
         )
    );
  end if;

  if jsonb_array_length(v_missing)>0 then
    raise exception 'SCHEMA_REQUIRED_FIELDS_MISSING: %',v_missing::text
      using errcode='P0001';
  end if;

  return new;
end;
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


-- Repair the verified Prothom Alo child-murder report. The source was published
-- 2026-09-20 and states the child went missing "last Friday", so 2026-09-18 is
-- the source-grounded incident date.
update public.complaints c
set incident_date=date '2026-09-18',
    custom_field_answers=jsonb_set(
      coalesce(c.custom_field_answers,'{}'::jsonb),
      '{sourceOmittedFields}',
      coalesce((
        select jsonb_agg(to_jsonb(v.value))
        from jsonb_array_elements_text(coalesce(c.custom_field_answers->'sourceOmittedFields','[]'::jsonb)) v(value)
        where v.value <> 'incidentDate'
      ),'[]'::jsonb),
      true
    ),
    updated_at=now()
where c.id='SJ-2026-324145'
  and c.origin_type='sourced_report'
  and c.incident_date is null
  and exists (
    select 1 from public.complaint_sources s
    where s.complaint_id=c.id
      and public.normalize_source_url(s.canonical_url)=public.normalize_source_url('https://www.prothomalo.com/bangladesh/crime/f9n403dy4b')
  );

insert into public.admin_audit_logs(actor_id,action,target_type,target_id,details)
select auth.uid(),'news_intake.source_grounding_repair','complaint','SJ-2026-324145',
       jsonb_build_object(
         'field','incident_date','value','2026-09-18',
         'source_url','https://www.prothomalo.com/bangladesh/crime/f9n403dy4b',
         'reason','Source states the child went missing last Friday; source published 2026-09-20.',
         'timestamp',clock_timestamp()
       )
where exists (
  select 1 from public.complaints c
  where c.id='SJ-2026-324145' and c.incident_date=date '2026-09-18'
)
and not exists (
  select 1 from public.admin_audit_logs l
  where l.action='news_intake.source_grounding_repair'
    and l.target_id='SJ-2026-324145'
    and l.details->>'field'='incident_date'
);
