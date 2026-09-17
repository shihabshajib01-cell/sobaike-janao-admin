-- Dedicated admin-only publication draft persistence.
-- Keeps citizen-submitted title/description immutable while allowing editorial
-- public presentation fields to be saved before the complaint is published.

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
  v_complaint public.complaints%ROWTYPE;
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
    RAISE EXCEPTION 'Access denied. Publish permission required.' USING ERRCODE = '42501';
  END IF;

  SELECT *
    INTO v_complaint
    FROM public.complaints
   WHERE id = NULLIF(btrim(p_complaint_id), '')
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Complaint with ID % not found.', p_complaint_id USING ERRCODE = 'P0002';
  END IF;

  IF v_complaint.status NOT IN ('submitted', 'unpublished') THEN
    RAISE EXCEPTION
      'Publication drafts can only be saved for submitted or unpublished complaints.'
      USING ERRCODE = '22023';
  END IF;

  v_title_bn := NULLIF(btrim(p_public_title_bn), '');
  v_title_en := NULLIF(btrim(p_public_title_en), '');
  v_summary_bn := NULLIF(btrim(p_public_summary_bn), '');
  v_summary_en := NULLIF(btrim(p_public_summary_en), '');

  IF char_length(COALESCE(v_title_bn, '')) > 180
     OR char_length(COALESCE(v_title_en, '')) > 180 THEN
    RAISE EXCEPTION 'Public headline must be 180 characters or fewer.' USING ERRCODE = '22023';
  END IF;

  IF char_length(COALESCE(v_summary_bn, '')) > 220
     OR char_length(COALESCE(v_summary_en, '')) > 220 THEN
    RAISE EXCEPTION 'Public summary must be 220 characters or fewer.' USING ERRCODE = '22023';
  END IF;

  -- Remove previous draft values first so clearing an editor field really clears it.
  -- Citizen-selected visibility/consent keys and all unrelated preferences are preserved.
  v_preferences := COALESCE(v_complaint.publication_preferences, '{}'::jsonb)
    - 'publicTitleBn'
    - 'publicTitleEn'
    - 'publicSummaryBn'
    - 'publicSummaryEn';

  v_preferences := v_preferences || jsonb_strip_nulls(
    jsonb_build_object(
      'publicTitleBn', v_title_bn,
      'publicTitleEn', v_title_en,
      'publicSummaryBn', v_summary_bn,
      'publicSummaryEn', v_summary_en
    )
  );

  UPDATE public.complaints
     SET publication_preferences = v_preferences,
         updated_at = now()
   WHERE id = v_complaint.id;

  INSERT INTO public.admin_audit_logs (
    actor_id,
    action,
    target_type,
    target_id,
    details,
    created_at
  ) VALUES (
    auth.uid(),
    'complaint.publication_draft.save',
    'complaint',
    v_complaint.id,
    jsonb_build_object(
      'status_preserved', v_complaint.status,
      'has_public_title_bn', v_title_bn IS NOT NULL,
      'has_public_title_en', v_title_en IS NOT NULL,
      'has_public_summary_bn', v_summary_bn IS NOT NULL,
      'has_public_summary_en', v_summary_en IS NOT NULL
    ),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'complaint_id', v_complaint.id,
    'status', v_complaint.status,
    'message', 'Publication draft saved.'
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_save_publication_draft(text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_save_publication_draft(text, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_save_publication_draft(text, text, text, text, text) TO authenticated;
