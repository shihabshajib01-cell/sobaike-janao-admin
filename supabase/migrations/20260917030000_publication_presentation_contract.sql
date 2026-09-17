-- Preserve citizen-submitted complaint content while allowing a curated public presentation.
-- Public headline/summary values live inside the existing publication_preferences JSONB,
-- so no citizen-submitted columns are overwritten and no new table is required.

DROP FUNCTION IF EXISTS public.admin_publish_complaint(text);

CREATE OR REPLACE FUNCTION public.admin_publish_complaint(
  p_complaint_id text,
  p_public_title_bn text DEFAULT NULL,
  p_public_title_en text DEFAULT NULL,
  p_public_summary_bn text DEFAULT NULL,
  p_public_summary_en text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_complaint record;
  v_audit_id uuid;
  v_preferences jsonb;
  v_location text;
  v_public_title_bn text;
  v_public_title_en text;
  v_public_summary_bn text;
  v_public_summary_en text;
  v_show_description boolean;
  v_show_location boolean;
BEGIN
  IF NOT public.is_active_admin() THEN
    RAISE EXCEPTION
      'Access denied. Active administrative session required.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_permission('complaints.publish') THEN
    RAISE EXCEPTION
      'Access denied. You do not have permission to publish complaints.'
      USING ERRCODE = '42501';
  END IF;

  SELECT
    c.*,
    sc.name_bn AS subcategory_name_bn,
    sc.name_en AS subcategory_name_en
  INTO v_complaint
  FROM public.complaints c
  LEFT JOIN public.subcategories sc ON sc.id = c.subcategory_id
  WHERE c.id = p_complaint_id
  FOR UPDATE OF c;

  IF v_complaint.id IS NULL THEN
    RAISE EXCEPTION
      'Complaint with ID % not found',
      p_complaint_id
      USING ERRCODE = 'P0002';
  END IF;

  IF v_complaint.status IS NULL
     OR v_complaint.status NOT IN ('submitted', 'unpublished') THEN
    RAISE EXCEPTION
      'Cannot publish complaint with status "%". Only "submitted" or "unpublished" complaints can be published.',
      COALESCE(v_complaint.status, 'null')
      USING ERRCODE = '22023';
  END IF;

  v_preferences := COALESCE(v_complaint.publication_preferences, '{}'::jsonb);
  v_show_description := (v_preferences->'showDescription') = 'true'::jsonb;
  v_show_location := (v_preferences->'showGeneralLocation') = 'true'::jsonb;
  v_location := CASE
    WHEN v_show_location THEN COALESCE(
      NULLIF(btrim(v_complaint.area), ''),
      NULLIF(btrim(v_complaint.district), '')
    )
    ELSE NULL
  END;

  -- Prefer an explicit Admin draft, then an existing saved public draft.
  -- Keep an already descriptive citizen/admin title; otherwise create a safe taxonomy/location headline.
  v_public_title_bn := COALESCE(
    NULLIF(btrim(p_public_title_bn), ''),
    NULLIF(btrim(v_preferences->>'publicTitleBn'), ''),
    CASE
      WHEN NULLIF(btrim(v_complaint.title), '') IS NOT NULL
       AND lower(btrim(v_complaint.title)) NOT IN (
         lower(COALESCE(v_complaint.subcategory_name_bn, '')),
         lower(COALESCE(v_complaint.subcategory_name_en, '')),
         'দোকান ও ব্যবসা',
         'shops & businesses'
       )
      THEN btrim(v_complaint.title)
      ELSE NULL
    END,
    CASE v_complaint.subcategory_id
      WHEN 'bribe-demanded-service' THEN
        CASE WHEN v_location IS NOT NULL THEN v_location || '-এ ঘুষের অভিযোগ' ELSE 'ঘুষের অভিযোগ' END
      WHEN 'shop-business' THEN
        CASE WHEN v_location IS NOT NULL THEN v_location || '-এ দোকান ও ব্যবসা প্রতিষ্ঠানে চাঁদাবাজির অভিযোগ' ELSE 'দোকান ও ব্যবসা প্রতিষ্ঠানে চাঁদাবাজির অভিযোগ' END
      WHEN 'transport-movement' THEN
        CASE WHEN v_location IS NOT NULL THEN v_location || '-এ পরিবহন খাতে চাঁদাবাজির অভিযোগ' ELSE 'পরিবহন খাতে চাঁদাবাজির অভিযোগ' END
      WHEN 'construction-property' THEN
        CASE WHEN v_location IS NOT NULL THEN v_location || '-এ নির্মাণ/সম্পত্তি সংক্রান্ত চাঁদাবাজির অভিযোগ' ELSE 'নির্মাণ/সম্পত্তি সংক্রান্ত চাঁদাবাজির অভিযোগ' END
      WHEN 'threat-money-demand' THEN
        CASE WHEN v_location IS NOT NULL THEN v_location || '-এ হুমকি দিয়ে টাকা দাবির অভিযোগ' ELSE 'হুমকি দিয়ে টাকা দাবির অভিযোগ' END
      ELSE
        CASE
          WHEN v_location IS NOT NULL AND NULLIF(btrim(v_complaint.subcategory_name_bn), '') IS NOT NULL
            THEN v_location || '-এ ' || btrim(v_complaint.subcategory_name_bn) || ' সংক্রান্ত অভিযোগ'
          WHEN NULLIF(btrim(v_complaint.subcategory_name_bn), '') IS NOT NULL
            THEN btrim(v_complaint.subcategory_name_bn) || ' সংক্রান্ত অভিযোগ'
          ELSE COALESCE(NULLIF(btrim(v_complaint.title), ''), v_complaint.id)
        END
    END
  );

  v_public_title_en := COALESCE(
    NULLIF(btrim(p_public_title_en), ''),
    NULLIF(btrim(v_preferences->>'publicTitleEn'), ''),
    CASE
      WHEN NULLIF(btrim(v_complaint.title_en), '') IS NOT NULL
       AND lower(btrim(v_complaint.title_en)) NOT IN (
         lower(COALESCE(v_complaint.subcategory_name_en, '')),
         lower(COALESCE(v_complaint.subcategory_name_bn, '')),
         'shops & businesses'
       )
      THEN btrim(v_complaint.title_en)
      ELSE NULL
    END,
    CASE v_complaint.subcategory_id
      WHEN 'bribe-demanded-service' THEN
        CASE WHEN v_location IS NOT NULL THEN 'Bribery complaint reported in ' || v_location ELSE 'Bribery complaint reported' END
      WHEN 'shop-business' THEN
        CASE WHEN v_location IS NOT NULL THEN 'Extortion from shops and businesses reported in ' || v_location ELSE 'Extortion from shops and businesses reported' END
      WHEN 'transport-movement' THEN
        CASE WHEN v_location IS NOT NULL THEN 'Transport extortion complaint reported in ' || v_location ELSE 'Transport extortion complaint reported' END
      WHEN 'construction-property' THEN
        CASE WHEN v_location IS NOT NULL THEN 'Construction or property extortion reported in ' || v_location ELSE 'Construction or property extortion reported' END
      WHEN 'threat-money-demand' THEN
        CASE WHEN v_location IS NOT NULL THEN 'Coercive money demand reported in ' || v_location ELSE 'Coercive money demand reported' END
      ELSE
        CASE
          WHEN v_location IS NOT NULL AND NULLIF(btrim(v_complaint.subcategory_name_en), '') IS NOT NULL
            THEN btrim(v_complaint.subcategory_name_en) || ' complaint reported in ' || v_location
          WHEN NULLIF(btrim(v_complaint.subcategory_name_en), '') IS NOT NULL
            THEN btrim(v_complaint.subcategory_name_en) || ' complaint reported'
          ELSE COALESCE(NULLIF(btrim(v_complaint.title_en), ''), NULLIF(btrim(v_complaint.title), ''), v_complaint.id)
        END
    END
  );

  -- Summary is intentionally separate from the original full description.
  -- Public RPCs still enforce the citizen's showDescription preference.
  v_public_summary_bn := COALESCE(
    NULLIF(btrim(p_public_summary_bn), ''),
    NULLIF(btrim(v_preferences->>'publicSummaryBn'), ''),
    CASE
      WHEN v_show_description AND NULLIF(btrim(v_complaint.description), '') IS NOT NULL THEN
        CASE
          WHEN char_length(btrim(v_complaint.description)) > 220
            THEN regexp_replace(left(btrim(v_complaint.description), 220), '\s+\S*$', '') || '…'
          ELSE btrim(v_complaint.description)
        END
      ELSE NULL
    END
  );

  v_public_summary_en := COALESCE(
    NULLIF(btrim(p_public_summary_en), ''),
    NULLIF(btrim(v_preferences->>'publicSummaryEn'), ''),
    CASE
      WHEN v_show_description AND NULLIF(btrim(v_complaint.description_en), '') IS NOT NULL THEN
        CASE
          WHEN char_length(btrim(v_complaint.description_en)) > 220
            THEN regexp_replace(left(btrim(v_complaint.description_en), 220), '\s+\S*$', '') || '…'
          ELSE btrim(v_complaint.description_en)
        END
      ELSE NULL
    END
  );

  v_preferences := v_preferences || jsonb_strip_nulls(
    jsonb_build_object(
      'publicTitleBn', v_public_title_bn,
      'publicTitleEn', v_public_title_en,
      'publicSummaryBn', v_public_summary_bn,
      'publicSummaryEn', v_public_summary_en
    )
  );

  UPDATE public.complaints
  SET
    status = 'published',
    publication_preferences = v_preferences,
    updated_at = now()
  WHERE id = v_complaint.id;

  INSERT INTO public.complaint_updates (
    complaint_id,
    update_type,
    note,
    is_public,
    created_at
  )
  VALUES (
    v_complaint.id,
    'published',
    'Complaint approved and published to public feed.',
    true,
    now()
  );

  INSERT INTO public.admin_audit_logs (
    actor_id,
    action,
    target_type,
    target_id,
    details
  )
  VALUES (
    auth.uid(),
    'complaint.publish',
    'complaint',
    p_complaint_id,
    jsonb_build_object(
      'previous_status', v_complaint.status,
      'new_status', 'published',
      'public_title_bn', v_public_title_bn,
      'public_title_en', v_public_title_en,
      'has_public_summary_bn', v_public_summary_bn IS NOT NULL,
      'has_public_summary_en', v_public_summary_en IS NOT NULL,
      'timestamp', now()
    )
  )
  RETURNING id INTO v_audit_id;

  PERFORM public.admin_emit_notification(
    p_event_key := 'complaint.published',
    p_title_en := 'Complaint published: ' || p_complaint_id,
    p_title_bn := 'অভিযোগ প্রকাশ করা হয়েছে: ' || p_complaint_id,
    p_body_en :=
      'Complaint ' || p_complaint_id ||
      ' was approved and published to the public feed.',
    p_body_bn :=
      'অভিযোগ ' || p_complaint_id ||
      ' অনুমোদন করে পাবলিক ফিডে প্রকাশ করা হয়েছে।',
    p_actor_user_id := auth.uid(),
    p_target_type := 'complaint',
    p_target_id := p_complaint_id,
    p_target_label := p_complaint_id,
    p_metadata := jsonb_build_object(
      'complaint_id', p_complaint_id,
      'previous_status', v_complaint.status,
      'new_status', 'published',
      'actor_user_id', auth.uid(),
      'timestamp', now()
    ),
    p_required_all_permissions := ARRAY['complaints.view'],
    p_required_any_permissions := '{}'::text[],
    p_audience_mode := 'permission',
    p_route := '/complaints/' || p_complaint_id,
    p_dedupe_key := 'complaint.published:oversight:' || v_audit_id::text,
    p_exclude_actor := true,
    p_include_super_admin := true
  );

  RETURN jsonb_build_object(
    'success', true,
    'complaint_id', p_complaint_id,
    'status', 'published',
    'previous_status', v_complaint.status,
    'public_title_bn', v_public_title_bn,
    'public_title_en', v_public_title_en
  );
END;
$function$;

-- Keep the Public API shape backward compatible while adding separate summary fields.
CREATE OR REPLACE FUNCTION public.get_public_published_reports()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'segment', c.segment_id,
        'subcategoryId', c.subcategory_id,
        'subcategoryBn', coalesce((SELECT sc.name_bn FROM public.subcategories sc WHERE sc.id = c.subcategory_id), c.subcategory_id),
        'subcategoryEn', coalesce((SELECT sc.name_en FROM public.subcategories sc WHERE sc.id = c.subcategory_id), c.subcategory_id),
        'titleBn', coalesce(nullif(trim(c.publication_preferences->>'publicTitleBn'), ''), c.title),
        'titleEn', coalesce(nullif(trim(c.publication_preferences->>'publicTitleEn'), ''), nullif(trim(c.title_en), ''), nullif(trim(c.publication_preferences->>'publicTitleBn'), ''), c.title),
        'summaryBn', CASE WHEN (c.publication_preferences->'showDescription') = 'true'::jsonb THEN coalesce(nullif(trim(c.publication_preferences->>'publicSummaryBn'), ''), c.description) ELSE NULL END,
        'summaryEn', CASE WHEN (c.publication_preferences->'showDescription') = 'true'::jsonb THEN coalesce(nullif(trim(c.publication_preferences->>'publicSummaryEn'), ''), nullif(trim(c.description_en), ''), nullif(trim(c.publication_preferences->>'publicSummaryBn'), ''), c.description) ELSE NULL END,
        'descriptionBn', CASE WHEN (c.publication_preferences->'showDescription') = 'true'::jsonb THEN c.description ELSE NULL END,
        'descriptionEn', CASE WHEN (c.publication_preferences->'showDescription') = 'true'::jsonb THEN coalesce(nullif(trim(c.description_en), ''), c.description) ELSE NULL END,
        'reportedSubject', CASE WHEN (c.publication_preferences->'showSubjectName') = 'true'::jsonb THEN party.name ELSE NULL END,
        'organization', CASE WHEN (c.publication_preferences->'showOrganization') = 'true'::jsonb THEN party.organization ELSE NULL END,
        'district', CASE WHEN (c.publication_preferences->'showGeneralLocation') = 'true'::jsonb THEN c.district ELSE NULL END,
        'area', CASE WHEN (c.publication_preferences->'showGeneralLocation') = 'true'::jsonb THEN c.area ELSE NULL END,
        'location', CASE WHEN (c.publication_preferences->'showGeneralLocation') = 'true'::jsonb THEN coalesce(c.formatted_address, c.area, c.district) ELSE NULL END,
        'incidentDate', to_char(c.incident_date, 'YYYY-MM-DD'),
        'affectedPersonAgeGroup', c.affected_person_age_group,
        'allegedAbuserRelationship', c.alleged_abuser_relationship,
        'reportingFor', c.reporting_for,
        'incidentTime', CASE WHEN c.segment_id = 'load_shedding' AND c.subcategory_id IN ('load-shedding-outage', 'gas-shortage') THEN c.incident_time ELSE NULL END,
        'incident_time', CASE WHEN c.segment_id = 'load_shedding' AND c.subcategory_id IN ('load-shedding-outage', 'gas-shortage') THEN c.incident_time ELSE NULL END,
        'publishedAt', to_char(c.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'priority', 'medium',
        'hasSupportingInfo', c.has_supporting_info,
        'status', c.status,
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
      ) ORDER BY c.created_at DESC, c.id DESC
    ),
    '[]'::jsonb
  ) INTO v_result
  FROM public.complaints c
  LEFT JOIN LATERAL (
    SELECT
      CASE WHEN count(*) = 1 THEN max(nullif(trim(cp.name), '')) ELSE NULL END AS name,
      CASE WHEN count(*) = 1 THEN max(nullif(trim(cp.organization), '')) ELSE NULL END AS organization
    FROM public.complaint_parties cp
    WHERE cp.complaint_id = c.id
      AND (
        nullif(trim(cp.name), '') IS NOT NULL
        OR nullif(trim(cp.organization), '') IS NOT NULL
        OR nullif(trim(cp.role_or_designation), '') IS NOT NULL
        OR nullif(trim(cp.phone_or_contact), '') IS NOT NULL
        OR nullif(trim(cp.public_profile_handle), '') IS NOT NULL
        OR nullif(trim(cp.identifying_description), '') IS NOT NULL
        OR nullif(trim(cp.address), '') IS NOT NULL
        OR trim(coalesce(cp.party_type, '')) IN ('individual', 'business', 'group', 'organization')
      )
  ) party ON true
  WHERE c.status = 'published';
  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_published_report(p_report_id text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_result jsonb;
  v_clean_id text;
BEGIN
  v_clean_id := upper(trim(coalesce(p_report_id, '')));
  IF v_clean_id = '' THEN RETURN NULL; END IF;

  SELECT jsonb_build_object(
    'id', c.id,
    'reporterName', CASE WHEN c.privacy_choice = 'public_identity' AND c.confirm_public_identity = true THEN nullif(trim(c.reporter_name), '') ELSE NULL END,
    'segment', c.segment_id,
    'subcategoryId', c.subcategory_id,
    'subcategoryBn', coalesce((SELECT sc.name_bn FROM public.subcategories sc WHERE sc.id = c.subcategory_id), c.subcategory_id),
    'subcategoryEn', coalesce((SELECT sc.name_en FROM public.subcategories sc WHERE sc.id = c.subcategory_id), c.subcategory_id),
    'titleBn', coalesce(nullif(trim(c.publication_preferences->>'publicTitleBn'), ''), c.title),
    'titleEn', coalesce(nullif(trim(c.publication_preferences->>'publicTitleEn'), ''), nullif(trim(c.title_en), ''), nullif(trim(c.publication_preferences->>'publicTitleBn'), ''), c.title),
    'summaryBn', CASE WHEN (c.publication_preferences->'showDescription') = 'true'::jsonb THEN coalesce(nullif(trim(c.publication_preferences->>'publicSummaryBn'), ''), c.description) ELSE NULL END,
    'summaryEn', CASE WHEN (c.publication_preferences->'showDescription') = 'true'::jsonb THEN coalesce(nullif(trim(c.publication_preferences->>'publicSummaryEn'), ''), nullif(trim(c.description_en), ''), nullif(trim(c.publication_preferences->>'publicSummaryBn'), ''), c.description) ELSE NULL END,
    'descriptionBn', CASE WHEN (c.publication_preferences->'showDescription') = 'true'::jsonb THEN c.description ELSE NULL END,
    'descriptionEn', CASE WHEN (c.publication_preferences->'showDescription') = 'true'::jsonb THEN coalesce(nullif(trim(c.description_en), ''), c.description) ELSE NULL END,
    'reportedSubject', CASE WHEN (c.publication_preferences->'showSubjectName') = 'true'::jsonb THEN party.name ELSE NULL END,
    'organization', CASE WHEN (c.publication_preferences->'showOrganization') = 'true'::jsonb THEN party.organization ELSE NULL END,
    'district', CASE WHEN (c.publication_preferences->'showGeneralLocation') = 'true'::jsonb THEN c.district ELSE NULL END,
    'area', CASE WHEN (c.publication_preferences->'showGeneralLocation') = 'true'::jsonb THEN c.area ELSE NULL END,
    'location', CASE WHEN (c.publication_preferences->'showGeneralLocation') = 'true'::jsonb THEN coalesce(c.formatted_address, c.area, c.district) ELSE NULL END,
    'incidentDate', to_char(c.incident_date, 'YYYY-MM-DD'),
    'affectedPersonAgeGroup', c.affected_person_age_group,
    'allegedAbuserRelationship', c.alleged_abuser_relationship,
    'reportingFor', c.reporting_for,
    'incidentTime', CASE WHEN c.segment_id = 'load_shedding' AND c.subcategory_id IN ('load-shedding-outage', 'gas-shortage') THEN c.incident_time ELSE NULL END,
    'incident_time', CASE WHEN c.segment_id = 'load_shedding' AND c.subcategory_id IN ('load-shedding-outage', 'gas-shortage') THEN c.incident_time ELSE NULL END,
    'publishedAt', to_char(c.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'priority', 'medium',
    'hasSupportingInfo', c.has_supporting_info,
    'status', c.status,
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
  ) INTO v_result
  FROM public.complaints c
  LEFT JOIN LATERAL (
    SELECT
      CASE WHEN count(*) = 1 THEN max(nullif(trim(cp.name), '')) ELSE NULL END AS name,
      CASE WHEN count(*) = 1 THEN max(nullif(trim(cp.organization), '')) ELSE NULL END AS organization
    FROM public.complaint_parties cp
    WHERE cp.complaint_id = c.id
      AND (
        nullif(trim(cp.name), '') IS NOT NULL
        OR nullif(trim(cp.organization), '') IS NOT NULL
        OR nullif(trim(cp.role_or_designation), '') IS NOT NULL
        OR nullif(trim(cp.phone_or_contact), '') IS NOT NULL
        OR nullif(trim(cp.public_profile_handle), '') IS NOT NULL
        OR nullif(trim(cp.identifying_description), '') IS NOT NULL
        OR nullif(trim(cp.address), '') IS NOT NULL
        OR trim(coalesce(cp.party_type, '')) IN ('individual', 'business', 'group', 'organization')
      )
  ) party ON true
  WHERE upper(c.id) = v_clean_id
    AND c.status = 'published';
  RETURN v_result;
END;
$function$;

-- Backfill only clearly weak, taxonomy-label-style published titles.
-- Existing editorial/demo headlines remain untouched.
UPDATE public.complaints c
SET publication_preferences = COALESCE(c.publication_preferences, '{}'::jsonb) || jsonb_strip_nulls(
  jsonb_build_object(
    'publicTitleBn', CASE
      WHEN c.subcategory_id = 'bribe-demanded-service' THEN
        CASE WHEN (c.publication_preferences->'showGeneralLocation') = 'true'::jsonb
          THEN COALESCE(NULLIF(btrim(c.area), ''), NULLIF(btrim(c.district), '')) || '-এ ঘুষের অভিযোগ'
          ELSE 'ঘুষের অভিযোগ' END
      WHEN c.subcategory_id = 'shop-business' THEN
        CASE WHEN (c.publication_preferences->'showGeneralLocation') = 'true'::jsonb
          THEN COALESCE(NULLIF(btrim(c.area), ''), NULLIF(btrim(c.district), '')) || '-এ দোকান ও ব্যবসা প্রতিষ্ঠানে চাঁদাবাজির অভিযোগ'
          ELSE 'দোকান ও ব্যবসা প্রতিষ্ঠানে চাঁদাবাজির অভিযোগ' END
      ELSE
        CASE WHEN (c.publication_preferences->'showGeneralLocation') = 'true'::jsonb
          THEN COALESCE(NULLIF(btrim(c.area), ''), NULLIF(btrim(c.district), '')) || '-এ ' || sc.name_bn || ' সংক্রান্ত অভিযোগ'
          ELSE sc.name_bn || ' সংক্রান্ত অভিযোগ' END
    END,
    'publicTitleEn', CASE
      WHEN c.subcategory_id = 'bribe-demanded-service' THEN
        CASE WHEN (c.publication_preferences->'showGeneralLocation') = 'true'::jsonb
          THEN 'Bribery complaint reported in ' || COALESCE(NULLIF(btrim(c.area), ''), NULLIF(btrim(c.district), ''))
          ELSE 'Bribery complaint reported' END
      WHEN c.subcategory_id = 'shop-business' THEN
        CASE WHEN (c.publication_preferences->'showGeneralLocation') = 'true'::jsonb
          THEN 'Extortion from shops and businesses reported in ' || COALESCE(NULLIF(btrim(c.area), ''), NULLIF(btrim(c.district), ''))
          ELSE 'Extortion from shops and businesses reported' END
      ELSE
        CASE WHEN (c.publication_preferences->'showGeneralLocation') = 'true'::jsonb
          THEN sc.name_en || ' complaint reported in ' || COALESCE(NULLIF(btrim(c.area), ''), NULLIF(btrim(c.district), ''))
          ELSE sc.name_en || ' complaint reported' END
    END,
    'publicSummaryBn', CASE
      WHEN (c.publication_preferences->'showDescription') = 'true'::jsonb AND NULLIF(btrim(c.description), '') IS NOT NULL
        THEN CASE WHEN char_length(btrim(c.description)) > 220
          THEN regexp_replace(left(btrim(c.description), 220), '\s+\S*$', '') || '…'
          ELSE btrim(c.description) END
      ELSE NULL
    END,
    'publicSummaryEn', CASE
      WHEN (c.publication_preferences->'showDescription') = 'true'::jsonb AND NULLIF(btrim(c.description_en), '') IS NOT NULL
        THEN CASE WHEN char_length(btrim(c.description_en)) > 220
          THEN regexp_replace(left(btrim(c.description_en), 220), '\s+\S*$', '') || '…'
          ELSE btrim(c.description_en) END
      ELSE NULL
    END
  )
)
FROM public.subcategories sc
WHERE c.status = 'published'
  AND sc.id = c.subcategory_id
  AND NULLIF(btrim(c.publication_preferences->>'publicTitleBn'), '') IS NULL
  AND (
    lower(btrim(c.title)) = lower(btrim(sc.name_bn))
    OR lower(btrim(c.title)) = lower(btrim(sc.name_en))
    OR (c.subcategory_id = 'shop-business' AND lower(btrim(c.title)) IN ('দোকান ও ব্যবসা', 'shops & businesses'))
  );
