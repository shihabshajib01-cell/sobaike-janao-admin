-- Admin publication editor contract
-- Adds a safe preview/save layer for the existing public-presentation fields.
-- Raw citizen title/description remain untouched.

CREATE OR REPLACE FUNCTION public.admin_get_publication_draft(p_complaint_id text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_complaint record;
  v_preferences jsonb;
  v_location text;
  v_public_title_bn text;
  v_public_title_en text;
  v_public_summary_bn text;
  v_public_summary_en text;
  v_show_description boolean;
  v_show_location boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_active_admin() THEN
    RAISE EXCEPTION 'Access denied. Active administrative session required.' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_permission('complaints.publish') THEN
    RAISE EXCEPTION 'Access denied. You do not have permission to prepare complaint publication.' USING ERRCODE = '42501';
  END IF;

  SELECT c.*, sc.name_bn AS subcategory_name_bn, sc.name_en AS subcategory_name_en
    INTO v_complaint
    FROM public.complaints c
    LEFT JOIN public.subcategories sc ON sc.id = c.subcategory_id
   WHERE c.id = NULLIF(btrim(p_complaint_id), '');

  IF v_complaint.id IS NULL THEN
    RAISE EXCEPTION 'Complaint with ID % not found', p_complaint_id USING ERRCODE = 'P0002';
  END IF;

  v_preferences := COALESCE(v_complaint.publication_preferences, '{}'::jsonb);
  v_show_description := (v_preferences->'showDescription') = 'true'::jsonb;
  v_show_location := (v_preferences->'showGeneralLocation') = 'true'::jsonb;
  v_location := CASE
    WHEN v_show_location THEN COALESCE(
      NULLIF(btrim(v_complaint.area), ''),
      NULLIF(btrim(v_complaint.upazila_or_thana), ''),
      NULLIF(btrim(v_complaint.district), '')
    )
    ELSE NULL
  END;

  v_public_title_bn := COALESCE(
    NULLIF(btrim(v_preferences->>'publicTitleBn'), ''),
    CASE
      WHEN NULLIF(btrim(v_complaint.title), '') IS NOT NULL
       AND lower(btrim(v_complaint.title)) NOT IN (
         lower(COALESCE(v_complaint.subcategory_name_bn, '')),
         lower(COALESCE(v_complaint.subcategory_name_en, '')),
         'দোকান ও ব্যবসা',
         'shops & businesses'
       ) THEN btrim(v_complaint.title)
      ELSE NULL
    END,
    CASE v_complaint.subcategory_id
      WHEN 'bribe-demanded-service' THEN CASE WHEN v_location IS NOT NULL THEN v_location || '-এ ঘুষের অভিযোগ' ELSE 'ঘুষের অভিযোগ' END
      WHEN 'shop-business' THEN CASE WHEN v_location IS NOT NULL THEN v_location || '-এ দোকান ও ব্যবসা প্রতিষ্ঠানে চাঁদাবাজির অভিযোগ' ELSE 'দোকান ও ব্যবসা প্রতিষ্ঠানে চাঁদাবাজির অভিযোগ' END
      WHEN 'transport-movement' THEN CASE WHEN v_location IS NOT NULL THEN v_location || '-এ পরিবহন খাতে চাঁদাবাজির অভিযোগ' ELSE 'পরিবহন খাতে চাঁদাবাজির অভিযোগ' END
      WHEN 'construction-property' THEN CASE WHEN v_location IS NOT NULL THEN v_location || '-এ নির্মাণ/সম্পত্তি সংক্রান্ত চাঁদাবাজির অভিযোগ' ELSE 'নির্মাণ/সম্পত্তি সংক্রান্ত চাঁদাবাজির অভিযোগ' END
      WHEN 'threat-money-demand' THEN CASE WHEN v_location IS NOT NULL THEN v_location || '-এ হুমকি দিয়ে টাকা দাবির অভিযোগ' ELSE 'হুমকি দিয়ে টাকা দাবির অভিযোগ' END
      ELSE CASE
        WHEN v_location IS NOT NULL AND NULLIF(btrim(v_complaint.subcategory_name_bn), '') IS NOT NULL THEN v_location || '-এ ' || btrim(v_complaint.subcategory_name_bn) || ' সংক্রান্ত অভিযোগ'
        WHEN NULLIF(btrim(v_complaint.subcategory_name_bn), '') IS NOT NULL THEN btrim(v_complaint.subcategory_name_bn) || ' সংক্রান্ত অভিযোগ'
        ELSE COALESCE(NULLIF(btrim(v_complaint.title), ''), NULLIF(btrim(v_complaint.title_en), ''), v_complaint.id)
      END
    END
  );

  v_public_title_en := COALESCE(
    NULLIF(btrim(v_preferences->>'publicTitleEn'), ''),
    CASE
      WHEN NULLIF(btrim(v_complaint.title_en), '') IS NOT NULL
       AND lower(btrim(v_complaint.title_en)) NOT IN (
         lower(COALESCE(v_complaint.subcategory_name_en, '')),
         lower(COALESCE(v_complaint.subcategory_name_bn, '')),
         'shops & businesses'
       ) THEN btrim(v_complaint.title_en)
      ELSE NULL
    END,
    CASE v_complaint.subcategory_id
      WHEN 'bribe-demanded-service' THEN CASE WHEN v_location IS NOT NULL THEN 'Bribery complaint reported in ' || v_location ELSE 'Bribery complaint reported' END
      WHEN 'shop-business' THEN CASE WHEN v_location IS NOT NULL THEN 'Extortion from shops and businesses reported in ' || v_location ELSE 'Extortion from shops and businesses reported' END
      WHEN 'transport-movement' THEN CASE WHEN v_location IS NOT NULL THEN 'Transport extortion complaint reported in ' || v_location ELSE 'Transport extortion complaint reported' END
      WHEN 'construction-property' THEN CASE WHEN v_location IS NOT NULL THEN 'Construction or property extortion reported in ' || v_location ELSE 'Construction or property extortion reported' END
      WHEN 'threat-money-demand' THEN CASE WHEN v_location IS NOT NULL THEN 'Coercive money demand reported in ' || v_location ELSE 'Coercive money demand reported' END
      ELSE CASE
        WHEN v_location IS NOT NULL AND NULLIF(btrim(v_complaint.subcategory_name_en), '') IS NOT NULL THEN btrim(v_complaint.subcategory_name_en) || ' complaint reported in ' || v_location
        WHEN NULLIF(btrim(v_complaint.subcategory_name_en), '') IS NOT NULL THEN btrim(v_complaint.subcategory_name_en) || ' complaint reported'
        ELSE COALESCE(NULLIF(btrim(v_complaint.title_en), ''), NULLIF(btrim(v_complaint.title), ''), v_complaint.id)
      END
    END
  );

  v_public_summary_bn := COALESCE(
    NULLIF(btrim(v_preferences->>'publicSummaryBn'), ''),
    CASE WHEN v_show_description AND NULLIF(btrim(v_complaint.description), '') IS NOT NULL THEN
      CASE WHEN char_length(btrim(v_complaint.description)) > 220
        THEN regexp_replace(left(btrim(v_complaint.description), 220), '\s+\S*$', '') || '…'
        ELSE btrim(v_complaint.description)
      END
    ELSE NULL END
  );

  v_public_summary_en := COALESCE(
    NULLIF(btrim(v_preferences->>'publicSummaryEn'), ''),
    CASE WHEN v_show_description AND NULLIF(btrim(v_complaint.description_en), '') IS NOT NULL THEN
      CASE WHEN char_length(btrim(v_complaint.description_en)) > 220
        THEN regexp_replace(left(btrim(v_complaint.description_en), 220), '\s+\S*$', '') || '…'
        ELSE btrim(v_complaint.description_en)
      END
    ELSE NULL END,
    CASE WHEN v_show_description THEN v_public_summary_bn ELSE NULL END
  );

  RETURN jsonb_build_object(
    'publicTitleBn', COALESCE(v_public_title_bn, ''),
    'publicTitleEn', COALESCE(v_public_title_en, ''),
    'publicSummaryBn', COALESCE(v_public_summary_bn, ''),
    'publicSummaryEn', COALESCE(v_public_summary_en, ''),
    'locationLabel', COALESCE(v_location, ''),
    'showDescription', v_show_description,
    'showGeneralLocation', v_show_location
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_save_publication_draft(
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
  v_preferences jsonb;
  v_title_bn text;
  v_title_en text;
  v_summary_bn text;
  v_summary_en text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_active_admin() THEN
    RAISE EXCEPTION 'Access denied. Active administrative session required.' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_permission('complaints.publish') THEN
    RAISE EXCEPTION 'Access denied. You do not have permission to prepare complaint publication.' USING ERRCODE = '42501';
  END IF;

  SELECT id, status, publication_preferences
    INTO v_complaint
    FROM public.complaints
   WHERE id = NULLIF(btrim(p_complaint_id), '')
   FOR UPDATE;

  IF v_complaint.id IS NULL THEN
    RAISE EXCEPTION 'Complaint with ID % not found', p_complaint_id USING ERRCODE = 'P0002';
  END IF;

  IF v_complaint.status NOT IN ('submitted', 'unpublished') THEN
    RAISE EXCEPTION 'Publication drafts can only be saved for submitted or unpublished complaints.' USING ERRCODE = '22023';
  END IF;

  v_title_bn := NULLIF(btrim(p_public_title_bn), '');
  v_title_en := NULLIF(btrim(p_public_title_en), '');
  v_summary_bn := NULLIF(btrim(p_public_summary_bn), '');
  v_summary_en := NULLIF(btrim(p_public_summary_en), '');

  IF COALESCE(v_title_bn, v_title_en) IS NULL THEN
    RAISE EXCEPTION 'At least one public headline is required.' USING ERRCODE = '22023';
  END IF;

  v_preferences := COALESCE(v_complaint.publication_preferences, '{}'::jsonb)
    - 'publicTitleBn' - 'publicTitleEn' - 'publicSummaryBn' - 'publicSummaryEn';

  v_preferences := v_preferences || jsonb_strip_nulls(jsonb_build_object(
    'publicTitleBn', v_title_bn,
    'publicTitleEn', v_title_en,
    'publicSummaryBn', v_summary_bn,
    'publicSummaryEn', v_summary_en
  ));

  UPDATE public.complaints
     SET publication_preferences = v_preferences,
         updated_at = now()
   WHERE id = v_complaint.id;

  INSERT INTO public.complaint_updates (complaint_id, update_type, note, is_public, created_at)
  VALUES (v_complaint.id, 'publication_draft_saved', 'Public presentation draft saved by administrator.', false, now());

  INSERT INTO public.admin_audit_logs (actor_id, action, target_type, target_id, details, created_at)
  VALUES (
    auth.uid(),
    'complaint.publication_draft.save',
    'complaint',
    v_complaint.id,
    jsonb_build_object(
      'has_public_title_bn', v_title_bn IS NOT NULL,
      'has_public_title_en', v_title_en IS NOT NULL,
      'has_public_summary_bn', v_summary_bn IS NOT NULL,
      'has_public_summary_en', v_summary_en IS NOT NULL,
      'status_preserved', v_complaint.status
    ),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'complaint_id', v_complaint.id,
    'status', v_complaint.status,
    'publicTitleBn', COALESCE(v_title_bn, ''),
    'publicTitleEn', COALESCE(v_title_en, ''),
    'publicSummaryBn', COALESCE(v_summary_bn, ''),
    'publicSummaryEn', COALESCE(v_summary_en, '')
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_get_publication_draft(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_get_publication_draft(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_get_publication_draft(text) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_save_publication_draft(text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_save_publication_draft(text, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_save_publication_draft(text, text, text, text, text) TO authenticated;
