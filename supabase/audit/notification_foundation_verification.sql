-- ==============================================================================
-- SOBAIKE JANAO ADMIN — NOTIFICATION FOUNDATION VERIFICATION SCRIPT
-- ==============================================================================
-- Migration: 20260904000004_notification_foundation.sql
-- Target: Supabase PostgreSQL Database (sobaike-production)
-- Purpose: Complete verification of Notification tables, columns, event catalogue keys,
--          audience_mode persistence, read-time visibility re-evaluation, function
--          privileges, and transactional deduplication/resolver runtime safety.
-- Safety: Non-destructive; runtime assertions execute inside a rolled-back transaction.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Verify Tables Exist and RLS is Enabled
-- ------------------------------------------------------------------------------
SELECT 
    c.relname AS table_name,
    c.relrowsecurity AS rls_enabled,
    c.relforcerowsecurity AS rls_enforced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('admin_notification_event_catalogue', 'admin_notifications')
ORDER BY c.relname;

-- ------------------------------------------------------------------------------
-- 2. Verify audience_mode Column and Constraint on admin_notifications
-- ------------------------------------------------------------------------------
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'admin_notifications'
  AND column_name = 'audience_mode';

SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.admin_notifications'::regclass
  AND conname = 'chk_notifications_audience_mode';

-- ------------------------------------------------------------------------------
-- 3. Verify Canonical Event Catalogue Keys (Exactly 12 approved Phase 1 keys)
-- ------------------------------------------------------------------------------
SELECT 
    event_key,
    category,
    default_layer,
    default_severity,
    active,
    description
FROM public.admin_notification_event_catalogue
ORDER BY category, event_key;

SELECT 
    COUNT(*) AS total_event_keys,
    CASE 
        WHEN COUNT(*) = 12 THEN 'PASS (Exactly 12 approved keys)'
        ELSE 'FAIL (Unexpected count)'
    END AS catalogue_status
FROM public.admin_notification_event_catalogue;

-- ------------------------------------------------------------------------------
-- 4. Verify Functions, Security Modes, and Volatility
-- ------------------------------------------------------------------------------
SELECT 
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS arguments,
    CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END AS security_type,
    p.provolatile AS volatility
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'admin_notification_get_effective_permissions',
    'admin_notification_can_view_user_scope',
    'admin_notification_can_view_role_scope',
    'admin_notification_can_currently_view',
    'admin_notification_resolve_recipients',
    'admin_emit_notification',
    'admin_list_notifications',
    'admin_get_unread_notification_count',
    'admin_mark_notification_read',
    'admin_mark_all_notifications_read'
  )
ORDER BY p.proname, arguments;

-- ------------------------------------------------------------------------------
-- 5. Verify Table Privileges
--    (Anon: zero privileges; Authenticated: SELECT only on admin_notifications)
-- ------------------------------------------------------------------------------
SELECT 
    table_name,
    grantee,
    string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privileges
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('admin_notification_event_catalogue', 'admin_notifications')
  AND grantee IN ('anon', 'authenticated', 'PUBLIC')
GROUP BY table_name, grantee
ORDER BY table_name, grantee;

-- ------------------------------------------------------------------------------
-- 6. Verify Function Execution Privileges
--    (User RPCs & Read-time Evaluator: authenticated; Helpers/Emitter: service_role only)
-- ------------------------------------------------------------------------------
SELECT 
    routine_name,
    grantee,
    privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name IN (
    'admin_notification_get_effective_permissions',
    'admin_notification_can_view_user_scope',
    'admin_notification_can_view_role_scope',
    'admin_notification_can_currently_view',
    'admin_notification_resolve_recipients',
    'admin_emit_notification',
    'admin_list_notifications',
    'admin_get_unread_notification_count',
    'admin_mark_notification_read',
    'admin_mark_all_notifications_read'
  )
  AND grantee IN ('anon', 'authenticated', 'PUBLIC')
ORDER BY routine_name, grantee;

-- ------------------------------------------------------------------------------
-- 7. Verify Canonical Permissions (Confirm NO notifications.view was added)
-- ------------------------------------------------------------------------------
SELECT 
    id AS permission_id,
    module,
    action
FROM public.permissions
WHERE id LIKE '%notif%' OR module LIKE '%notif%'
ORDER BY id;

-- ------------------------------------------------------------------------------
-- 8. Transactional Runtime Safety & Assertion Test Suite (Leaves NO persistent data)
-- ------------------------------------------------------------------------------
BEGIN;

DO $$
DECLARE
    v_test_admin_id UUID;
    v_test_super_admin_id UUID;
    v_test_role_id TEXT := 'test-notif-role-' || substr(gen_random_uuid()::text, 1, 8);
    v_event_group UUID := gen_random_uuid();
    v_dedupe_key TEXT := 'test-dedupe-phase1-' || gen_random_uuid()::text;
    v_count_1 INTEGER;
    v_count_2 INTEGER;
    v_total_survived INTEGER;
    v_res JSONB;
    v_resolved_count INTEGER;
    v_is_visible BOOLEAN;
    v_caught_22000 BOOLEAN;
BEGIN
    -- 8.1 Setup test fixture administrators if needed
    SELECT user_id INTO v_test_super_admin_id 
    FROM public.admin_users 
    WHERE active = true AND is_super_admin = true 
    LIMIT 1;

    SELECT user_id INTO v_test_admin_id 
    FROM public.admin_users 
    WHERE active = true AND is_super_admin = false 
    LIMIT 1;

    -- If no normal active admin exists in environment, create temporary test admins for this transaction
    IF v_test_admin_id IS NULL THEN
        v_test_admin_id := gen_random_uuid();
        INSERT INTO public.admin_users (user_id, email, display_name, active, is_super_admin)
        VALUES (v_test_admin_id, 'test-notif-normal@example.com', 'Test Normal Admin', true, false);
    END IF;

    IF v_test_super_admin_id IS NULL THEN
        v_test_super_admin_id := gen_random_uuid();
        INSERT INTO public.admin_users (user_id, email, display_name, active, is_super_admin)
        VALUES (v_test_super_admin_id, 'test-notif-super@example.com', 'Test Super Admin', true, true);
    END IF;

    -- 8.2 Test 1: Idempotency & Deduplication
    INSERT INTO public.admin_notifications (
        event_group_id,
        dedupe_key,
        recipient_user_id,
        event_key,
        category,
        layer,
        severity,
        audience_mode,
        title_en,
        title_bn
    ) VALUES (
        v_event_group,
        v_dedupe_key,
        v_test_admin_id,
        'complaint.submitted',
        'complaint',
        'action_required',
        'action_required',
        'permission',
        'Test Notification 1',
        'টেস্ট নোটিফিকেশন ১'
    ) ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS v_count_1 = ROW_COUNT;

    -- Duplicate insert attempt
    INSERT INTO public.admin_notifications (
        event_group_id,
        dedupe_key,
        recipient_user_id,
        event_key,
        category,
        layer,
        severity,
        audience_mode,
        title_en,
        title_bn
    ) VALUES (
        gen_random_uuid(),
        v_dedupe_key,
        v_test_admin_id,
        'complaint.submitted',
        'complaint',
        'action_required',
        'action_required',
        'permission',
        'Test Notification 2',
        'টেস্ট নোটিফিকেশন ২'
    ) ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS v_count_2 = ROW_COUNT;

    SELECT COUNT(*) INTO v_total_survived
    FROM public.admin_notifications
    WHERE recipient_user_id = v_test_admin_id AND dedupe_key = v_dedupe_key;

    IF v_count_1 = 1 AND v_count_2 = 0 AND v_total_survived = 1 THEN
        RAISE NOTICE 'TEST 1 (Deduplication): PASS';
    ELSE
        RAISE EXCEPTION 'TEST 1 (Deduplication) FAILED: v_count_1=%, v_count_2=%, total=%', 
            v_count_1, v_count_2, v_total_survived;
    END IF;

    -- 8.3 Test 2: Actor exclusion in resolver
    SELECT COUNT(*) INTO v_resolved_count
    FROM public.admin_notification_resolve_recipients(
        'permission',
        ARRAY['roles.manage'],
        '{}',
        NULL,
        NULL,
        NULL,
        v_test_super_admin_id,
        true, -- exclude actor
        true  -- include super admin
    ) r
    WHERE r = v_test_super_admin_id;

    IF v_resolved_count = 0 THEN
        RAISE NOTICE 'TEST 2 (Actor Exclusion): PASS';
    ELSE
        RAISE EXCEPTION 'TEST 2 (Actor Exclusion) FAILED: Actor was not excluded';
    END IF;

    -- 8.4 Test 3: Personal audience mode resolution
    SELECT COUNT(*) INTO v_resolved_count
    FROM public.admin_notification_resolve_recipients(
        'personal',
        '{}',
        '{}',
        NULL,
        NULL,
        v_test_admin_id,
        NULL,
        true,
        true
    ) r
    WHERE r = v_test_admin_id;

    IF v_resolved_count = 1 THEN
        RAISE NOTICE 'TEST 3 (Personal Mode Resolution): PASS';
    ELSE
        RAISE EXCEPTION 'TEST 3 (Personal Mode Resolution) FAILED';
    END IF;

    -- 8.5 Test 4: Unknown target type fails closed
    SELECT COUNT(*) INTO v_resolved_count
    FROM public.admin_notification_resolve_recipients(
        'permission',
        '{}',
        '{}',
        'unknown_target_secret',
        'some_id',
        NULL,
        NULL,
        false,
        false
    );

    IF v_resolved_count = 0 THEN
        RAISE NOTICE 'TEST 4 (Unknown Target Type Fail-Closed): PASS';
    ELSE
        RAISE EXCEPTION 'TEST 4 (Unknown Target Type Fail-Closed) FAILED: Resolved % candidates for unknown target', v_resolved_count;
    END IF;

    -- 8.6 Test 5: Emitter Contract Validation (SQLSTATE 22000)
    -- 5a: Invalid audience mode
    v_caught_22000 := false;
    BEGIN
        PERFORM public.admin_emit_notification(
            p_event_key := 'complaint.submitted',
            p_title_en := 'Valid Title',
            p_title_bn := 'বৈধ শিরোনাম',
            p_audience_mode := 'invalid_mode'
        );
    EXCEPTION WHEN SQLSTATE '22000' THEN
        v_caught_22000 := true;
    END;
    IF NOT v_caught_22000 THEN
        RAISE EXCEPTION 'TEST 5a (Invalid Audience Mode 22000) FAILED';
    END IF;

    -- 5b: Personal mode without personal_recipient_id
    v_caught_22000 := false;
    BEGIN
        PERFORM public.admin_emit_notification(
            p_event_key := 'complaint.submitted',
            p_title_en := 'Valid Title',
            p_title_bn := 'বৈধ শিরোনাম',
            p_audience_mode := 'personal',
            p_personal_recipient_id := NULL
        );
    EXCEPTION WHEN SQLSTATE '22000' THEN
        v_caught_22000 := true;
    END;
    IF NOT v_caught_22000 THEN
        RAISE EXCEPTION 'TEST 5b (Missing Personal Recipient 22000) FAILED';
    END IF;

    -- 5c: Invalid target type
    v_caught_22000 := false;
    BEGIN
        PERFORM public.admin_emit_notification(
            p_event_key := 'complaint.submitted',
            p_title_en := 'Valid Title',
            p_title_bn := 'বৈধ শিরোনাম',
            p_target_type := 'unsupported_type'
        );
    EXCEPTION WHEN SQLSTATE '22000' THEN
        v_caught_22000 := true;
    END;
    IF NOT v_caught_22000 THEN
        RAISE EXCEPTION 'TEST 5c (Invalid Target Type 22000) FAILED';
    END IF;

    -- 5d: Invalid UUID for admin_user target
    v_caught_22000 := false;
    BEGIN
        PERFORM public.admin_emit_notification(
            p_event_key := 'admin.created',
            p_title_en := 'Valid Title',
            p_title_bn := 'বৈধ শিরোনাম',
            p_target_type := 'admin_user',
            p_target_id := 'not-a-valid-uuid'
        );
    EXCEPTION WHEN SQLSTATE '22000' THEN
        v_caught_22000 := true;
    END;
    IF NOT v_caught_22000 THEN
        RAISE EXCEPTION 'TEST 5d (Invalid UUID Target ID 22000) FAILED';
    END IF;
    RAISE NOTICE 'TEST 5 (Emitter Contract Validations): PASS';

    -- 8.7 Test 6: Dynamic Read-Time Visibility Re-evaluation
    -- Assign a temporary role with 'roles.manage' to v_test_admin_id
    INSERT INTO public.roles (id, name_en, name_bn, active)
    VALUES (v_test_role_id, 'Temp Role', 'অস্থায়ী রোল', true)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.role_permissions (role_id, permission_id)
    VALUES (v_test_role_id, 'roles.manage')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.user_roles (user_id, role_id)
    VALUES (v_test_admin_id, v_test_role_id)
    ON CONFLICT DO NOTHING;

    -- Emit notification requiring 'roles.manage'
    v_res := public.admin_emit_notification(
        p_event_key := 'role.created',
        p_title_en := 'New Role Created',
        p_title_bn := 'নতুন রোল তৈরি হয়েছে',
        p_required_all_permissions := ARRAY['roles.manage'],
        p_audience_mode := 'permission',
        p_exclude_actor := false
    );

    -- Check that v_test_admin_id can currently view this notification
    v_is_visible := public.admin_notification_can_currently_view(
        v_test_admin_id,
        'permission',
        ARRAY['roles.manage'],
        '{}'::text[],
        NULL,
        NULL,
        v_test_admin_id
    );

    IF v_is_visible IS NOT TRUE THEN
        RAISE EXCEPTION 'TEST 6 (Read-Time Visibility Initial) FAILED: expected true, got false';
    END IF;

    -- Now revoke 'roles.manage' from the test role
    DELETE FROM public.role_permissions 
    WHERE role_id = v_test_role_id AND permission_id = 'roles.manage';

    -- Re-evaluate visibility: MUST dynamically return false!
    v_is_visible := public.admin_notification_can_currently_view(
        v_test_admin_id,
        'permission',
        ARRAY['roles.manage'],
        '{}'::text[],
        NULL,
        NULL,
        v_test_admin_id
    );

    IF v_is_visible IS NOT FALSE THEN
        RAISE EXCEPTION 'TEST 6 (Read-Time Visibility Revocation) FAILED: stale notification did not hide!';
    END IF;

    RAISE NOTICE 'TEST 6 (Dynamic Read-Time Authority Re-evaluation): PASS';
    RAISE NOTICE 'ALL NOTIFICATION FOUNDATION TESTS PASSED SUCCESSFULLY ✅';
END;
$$;

ROLLBACK;
