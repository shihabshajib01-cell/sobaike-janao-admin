-- ==============================================================================
-- SOBAIKE JANAO ADMIN — COMPLAINT EDITING BACKEND CONTRACT
-- ==============================================================================
-- Migration: 20260907000003_admin_edit_complaint.sql
-- Description:
--   1. Authoritative implementation of public.admin_edit_complaint RPC.
--   2. Enables production live Supabase complaint editing from the Admin UI.
--   3. Enforces RBAC permissions: is_active_admin() AND (complaints.edit OR
--      complaints.publish OR complaints.unpublish OR complaints.reject).
--   4. Validates taxonomy dynamically against active public.segments and
--      public.subcategories tables.
--   5. Enforces valid priority ('low', 'medium', 'high', 'urgent').
--   6. Preserves immutable/sensitive columns: status, coordinates (latitude,
--      longitude), reporter metadata, submission context, created_at.
--   7. Records lifecycle update in public.complaint_updates ('edited' type)
--      and audit log in public.admin_audit_logs ('complaint.edit').
--   8. Function is SECURITY DEFINER with fixed search_path = pg_catalog, public.
--   9. Pre-commit catalog assertions verify security definer and RBAC grants.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. PREREQUISITE VALIDATION & SCHEMA PREPARATION
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF to_regclass('public.complaints') IS NULL THEN
        RAISE EXCEPTION 'Prerequisite failed: public.complaints table does not exist.'
            USING ERRCODE = '42P01';
    END IF;

    IF to_regclass('public.complaint_updates') IS NULL THEN
        RAISE EXCEPTION 'Prerequisite failed: public.complaint_updates table does not exist.'
            USING ERRCODE = '42P01';
    END IF;

    IF to_regclass('public.admin_audit_logs') IS NULL THEN
        RAISE EXCEPTION 'Prerequisite failed: public.admin_audit_logs table does not exist.'
            USING ERRCODE = '42P01';
    END IF;
END $$;

-- Ensure bilingual and priority columns exist idempotently
ALTER TABLE public.complaints
    ADD COLUMN IF NOT EXISTS title_en text,
    ADD COLUMN IF NOT EXISTS description_en text,
    ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium';

-- ------------------------------------------------------------------------------
-- 2. HARDENED ADMIN EDIT COMPLAINT RPC
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_edit_complaint(
    p_complaint_id text,
    p_title_en text DEFAULT NULL,
    p_title_bn text DEFAULT NULL,
    p_description_en text DEFAULT NULL,
    p_description_bn text DEFAULT NULL,
    p_segment_id text DEFAULT NULL,
    p_subcategory_id text DEFAULT NULL,
    p_priority text DEFAULT NULL,
    p_ward text DEFAULT NULL,
    p_zone text DEFAULT NULL,
    p_address_en text DEFAULT NULL,
    p_address_bn text DEFAULT NULL,
    p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_complaint public.complaints%ROWTYPE;
    v_clean_complaint_id text;
    v_new_title text;
    v_new_title_en text;
    v_new_desc text;
    v_new_desc_en text;
    v_new_segment text;
    v_new_subcategory text;
    v_new_priority text;
    v_new_address text;
    v_new_area text;
    v_new_district text;
    v_audit_id uuid;
    v_clean_notes text;
BEGIN
    -- 1. Security Check: Must be an authenticated active administrator
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
    END IF;

    IF NOT public.is_active_admin() THEN
        RAISE EXCEPTION 'Access denied. Active administrative session required.' USING ERRCODE = '42501';
    END IF;

    -- 2. Authorization Check: Caller must hold administrative complaint privileges
    IF NOT (
        public.has_permission('complaints.edit') OR
        public.has_permission('complaints.publish') OR
        public.has_permission('complaints.unpublish') OR
        public.has_permission('complaints.reject')
    ) THEN
        RAISE EXCEPTION 'Access denied. You do not have permission to edit complaints.' USING ERRCODE = '42501';
    END IF;

    -- 3. Validate Complaint Existence & Lock Row
    v_clean_complaint_id := NULLIF(TRIM(p_complaint_id), '');
    IF v_clean_complaint_id IS NULL THEN
        RAISE EXCEPTION 'Complaint ID cannot be empty.' USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_complaint
    FROM public.complaints
    WHERE id = v_clean_complaint_id
    FOR UPDATE;

    IF v_complaint.id IS NULL THEN
        RAISE EXCEPTION 'Complaint with ID % not found', v_clean_complaint_id USING ERRCODE = 'P0002';
    END IF;

    -- 4. Dynamic Taxonomy Validation (against public.segments & public.subcategories)
    v_new_segment := COALESCE(NULLIF(TRIM(p_segment_id), ''), v_complaint.segment_id);

    IF v_new_segment IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.segments
            WHERE id = v_new_segment
              AND (active IS NULL OR active = true)
        ) THEN
            RAISE EXCEPTION 'Invalid category/segment "%": does not exist in active taxonomy.', v_new_segment
                USING ERRCODE = '22023';
        END IF;
    END IF;

    v_new_subcategory := COALESCE(NULLIF(TRIM(p_subcategory_id), ''), v_complaint.subcategory_id);

    IF v_new_subcategory IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.subcategories
            WHERE id = v_new_subcategory
              AND segment_id = v_new_segment
              AND (active IS NULL OR active = true)
        ) THEN
            RAISE EXCEPTION 'Invalid subcategory "%": does not belong to segment "%".', v_new_subcategory, v_new_segment
                USING ERRCODE = '22023';
        END IF;
    END IF;

    -- 5. Priority Validation
    v_new_priority := COALESCE(NULLIF(LOWER(TRIM(p_priority)), ''), LOWER(COALESCE(v_complaint.priority, 'medium')));
    IF v_new_priority NOT IN ('low', 'medium', 'high', 'urgent') THEN
        RAISE EXCEPTION 'Invalid priority "%". Must be one of: low, medium, high, urgent.', v_new_priority
            USING ERRCODE = '22023';
    END IF;

    -- 6. Content Resolution (Title & Description)
    v_new_title := COALESCE(NULLIF(TRIM(p_title_bn), ''), NULLIF(TRIM(p_title_en), ''), v_complaint.title);
    IF v_new_title IS NULL OR length(trim(v_new_title)) = 0 THEN
        RAISE EXCEPTION 'Title cannot be empty.' USING ERRCODE = '22000';
    END IF;

    v_new_title_en := COALESCE(NULLIF(TRIM(p_title_en), ''), NULLIF(TRIM(p_title_bn), ''), v_complaint.title_en, v_complaint.title);

    v_new_desc := COALESCE(NULLIF(TRIM(p_description_bn), ''), NULLIF(TRIM(p_description_en), ''), v_complaint.description);
    IF v_new_desc IS NULL OR length(trim(v_new_desc)) = 0 THEN
        RAISE EXCEPTION 'Description cannot be empty.' USING ERRCODE = '22000';
    END IF;

    v_new_desc_en := COALESCE(NULLIF(TRIM(p_description_en), ''), NULLIF(TRIM(p_description_bn), ''), v_complaint.description_en, v_complaint.description);

    -- 7. Location & Address Resolution (Preserving coordinates and submission contexts)
    v_new_address := COALESCE(NULLIF(TRIM(p_address_bn), ''), NULLIF(TRIM(p_address_en), ''), v_complaint.formatted_address);
    v_new_area := COALESCE(NULLIF(TRIM(p_ward), ''), v_complaint.area);
    v_new_district := COALESCE(NULLIF(TRIM(p_zone), ''), v_complaint.district);

    -- 8. Perform Mutation (Strictly preserving status, reporter metadata, coordinates, and created_at)
    UPDATE public.complaints
    SET
        title = v_new_title,
        title_en = v_new_title_en,
        description = v_new_desc,
        description_en = v_new_desc_en,
        segment_id = v_new_segment,
        subcategory_id = v_new_subcategory,
        priority = v_new_priority,
        formatted_address = v_new_address,
        area = v_new_area,
        district = v_new_district,
        updated_at = now()
    WHERE id = v_complaint.id;

    -- 9. Record Timeline Event in public.complaint_updates
    v_clean_notes := NULLIF(TRIM(p_notes), '');
    INSERT INTO public.complaint_updates (
        complaint_id,
        update_type,
        note,
        is_public,
        created_at
    ) VALUES (
        v_complaint.id,
        'edited',
        COALESCE(v_clean_notes, 'Complaint details updated by administrator.'),
        false,
        now()
    );

    -- 10. Record Audit Log in public.admin_audit_logs
    INSERT INTO public.admin_audit_logs (
        actor_id,
        action,
        target_type,
        target_id,
        details
    ) VALUES (
        auth.uid(),
        'complaint.edit',
        'complaint',
        v_complaint.id,
        jsonb_build_object(
            'complaint_id', v_complaint.id,
            'status', v_complaint.status,
            'title_en', v_new_title_en,
            'title_bn', v_new_title,
            'segment_id', v_new_segment,
            'subcategory_id', v_new_subcategory,
            'priority', v_new_priority,
            'ward', v_new_area,
            'address', v_new_address,
            'notes', v_clean_notes,
            'timestamp', now()
        )
    )
    RETURNING id INTO v_audit_id;

    -- 11. Return Success Result
    RETURN jsonb_build_object(
        'success', true,
        'complaint_id', v_complaint.id,
        'status', v_complaint.status,
        'message', 'Complaint updated successfully'
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. PERMISSION & ACCESS ENFORCEMENT
-- ------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.admin_edit_complaint(text, text, text, text, text, text, text, text, text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_edit_complaint(text, text, text, text, text, text, text, text, text, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_edit_complaint(text, text, text, text, text, text, text, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_edit_complaint(text, text, text, text, text, text, text, text, text, text, text, text, text) TO service_role;

-- ------------------------------------------------------------------------------
-- 4. PRE-COMMIT CATALOG ASSERTIONS
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_secdef boolean;
    v_schema text;
    v_has_anon_execute boolean;
    v_has_auth_execute boolean;
BEGIN
    SELECT 
        p.prosecdef,
        n.nspname
    INTO
        v_secdef,
        v_schema
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'admin_edit_complaint'
      AND n.nspname = 'public';

    IF v_secdef IS DISTINCT FROM true THEN
        RAISE EXCEPTION 'Assertion failed: admin_edit_complaint must be SECURITY DEFINER'
            USING ERRCODE = '28000';
    END IF;

    SELECT has_function_privilege('anon', 'public.admin_edit_complaint(text, text, text, text, text, text, text, text, text, text, text, text, text)', 'EXECUTE')
    INTO v_has_anon_execute;

    IF v_has_anon_execute THEN
        RAISE EXCEPTION 'Assertion failed: anon must not have EXECUTE on admin_edit_complaint'
            USING ERRCODE = '42501';
    END IF;

    SELECT has_function_privilege('authenticated', 'public.admin_edit_complaint(text, text, text, text, text, text, text, text, text, text, text, text, text)', 'EXECUTE')
    INTO v_has_auth_execute;

    IF NOT v_has_auth_execute THEN
        RAISE EXCEPTION 'Assertion failed: authenticated must have EXECUTE on admin_edit_complaint'
            USING ERRCODE = '42501';
    END IF;
END $$;

COMMIT;
