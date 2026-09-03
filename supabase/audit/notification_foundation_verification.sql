-- ==============================================================================
-- SOBAIKE JANAO ADMIN — NOTIFICATION FOUNDATION VERIFICATION SCRIPT
-- ==============================================================================
-- Migration: 20260904000004_notification_foundation.sql
-- Target: Supabase PostgreSQL Database (sobaike-production)
-- Purpose: Read-only verification of Notification tables, event catalogue keys,
--          security modes, execute privileges, and transactional deduplication.
-- Safety: Non-destructive; runtime tests execute inside a rolled-back transaction.
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
-- 2. Verify Canonical Event Catalogue Keys (Exactly 12 approved Phase 1 keys)
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
-- 3. Verify Functions, Security Modes, and Arguments
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
    'admin_notification_resolve_recipients',
    'admin_emit_notification',
    'admin_list_notifications',
    'admin_get_unread_notification_count',
    'admin_mark_notification_read',
    'admin_mark_all_notifications_read'
  )
ORDER BY p.proname;

-- ------------------------------------------------------------------------------
-- 4. Verify Table Privileges (Anon must have zero privileges; Authenticated SELECT only)
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
-- 5. Verify Function Execution Privileges
--    (User RPCs: authenticated; Internal helpers/emitter: revoked from anon/authenticated)
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
-- 6. Verify Canonical Permissions (Confirm NO notifications.view was added)
-- ------------------------------------------------------------------------------
SELECT 
    id AS permission_id,
    module,
    action
FROM public.permissions
WHERE id LIKE '%notif%' OR module LIKE '%notif%'
ORDER BY id;

-- ------------------------------------------------------------------------------
-- 7. Transactional Deduplication & Emitter Verification (Leaves NO persistent data)
-- ------------------------------------------------------------------------------
BEGIN;

DO $$
DECLARE
    v_test_admin_id UUID;
    v_event_group UUID := gen_random_uuid();
    v_dedupe_key TEXT := 'test-dedupe-phase1-' || gen_random_uuid()::text;
    v_count_1 INTEGER;
    v_count_2 INTEGER;
    v_total_survived INTEGER;
BEGIN
    -- Select first active admin for test assertion
    SELECT user_id INTO v_test_admin_id FROM public.admin_users WHERE active = true LIMIT 1;

    IF v_test_admin_id IS NOT NULL THEN
        -- Insert initial notification
        INSERT INTO public.admin_notifications (
            event_group_id,
            dedupe_key,
            recipient_user_id,
            event_key,
            category,
            layer,
            severity,
            title_en,
            title_bn
        ) VALUES (
            v_event_group_id,
            v_dedupe_key,
            v_test_admin_id,
            'complaint.submitted',
            'complaint',
            'action_required',
            'action_required',
            'Test Notification 1',
            'টেস্ট নোটিফিকেশন ১'
        ) ON CONFLICT DO NOTHING;
        GET DIAGNOSTICS v_count_1 = ROW_COUNT;

        -- Attempt duplicate insert with same (recipient_user_id, dedupe_key)
        INSERT INTO public.admin_notifications (
            event_group_id,
            dedupe_key,
            recipient_user_id,
            event_key,
            category,
            layer,
            severity,
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
            'Test Notification 2',
            'টেস্ট নোটিফিকেশন ২'
        ) ON CONFLICT DO NOTHING;
        GET DIAGNOSTICS v_count_2 = ROW_COUNT;

        SELECT COUNT(*) INTO v_total_survived
        FROM public.admin_notifications
        WHERE recipient_user_id = v_test_admin_id AND dedupe_key = v_dedupe_key;

        RAISE NOTICE 'Dedupe verification: Initial insert row count = %, Duplicate insert row count = %, Total records survived = %',
            v_count_1, v_count_2, v_total_survived;

        IF v_count_1 = 1 AND v_count_2 = 0 AND v_total_survived = 1 THEN
            RAISE NOTICE 'DEDUPE TEST: PASS (Idempotency and unique constraint verified successfully)';
        ELSE
            RAISE EXCEPTION 'DEDUPE TEST: FAIL (Unexpected row count: %, %, %)', v_count_1, v_count_2, v_total_survived;
        END IF;
    ELSE
        RAISE NOTICE 'Dedupe verification: No active admin found in public.admin_users; skipped runtime insert assertion.';
    END IF;
END;
$$;

ROLLBACK;
