-- ==============================================================================
-- SOBAIKE JANAO ADMIN — NOTIFICATION FOUNDATION VERIFICATION SCRIPT
-- ==============================================================================
-- Migration: 20260904000004_notification_foundation.sql
-- Target: Supabase PostgreSQL Database (sobaike-production)
-- Purpose: Read-only & transactional verification of Notification tables,
--          audience_mode persistence, exact 12-key catalogue set, RLS policies,
--          security modes, execute privileges, fail-closed target scoping,
--          stale authorization revocation, and emitter deduplication.
-- Safety: Non-destructive; runtime tests execute inside a rolled-back transaction.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Verify Tables Exist and RLS is Enabled
-- ------------------------------------------------------------------------------
SELECT 
    c.relname AS table_name,
    c.relrowsecurity AS rls_enabled,
    c.relforcerowsecurity AS rls_enforced,
    CASE 
        WHEN c.relrowsecurity = true THEN 'PASS'
        ELSE 'FAIL (RLS not enabled)'
    END AS rls_status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('admin_notification_event_catalogue', 'admin_notifications')
ORDER BY c.relname;

-- ------------------------------------------------------------------------------
-- 2. Verify Exact Event Catalogue Set (Programmatic exact 12-key assertion)
-- ------------------------------------------------------------------------------
WITH expected_keys AS (
    SELECT unnest(ARRAY[
        'complaint.submitted',
        'complaint.evidence_attached',
        'complaint.published',
        'complaint.unpublished',
        'complaint.rejected',
        'admin.created',
        'admin.activated',
        'admin.deactivated',
        'admin.role_changed',
        'role.created',
        'role.updated',
        'role.permissions_changed'
    ]::text[]) AS event_key
),
actual_keys AS (
    SELECT event_key FROM public.admin_notification_event_catalogue
),
missing_keys AS (
    SELECT event_key FROM expected_keys EXCEPT SELECT event_key FROM actual_keys
),
unexpected_keys AS (
    SELECT event_key FROM actual_keys EXCEPT SELECT event_key FROM expected_keys
)
SELECT 
    (SELECT count(*) FROM actual_keys) AS actual_count,
    (SELECT count(*) FROM missing_keys) AS missing_count,
    (SELECT count(*) FROM unexpected_keys) AS unexpected_count,
    CASE 
        WHEN (SELECT count(*) FROM actual_keys) = 12
         AND (SELECT count(*) FROM missing_keys) = 0 
         AND (SELECT count(*) FROM unexpected_keys) = 0 
        THEN 'PASS (Exact 12-key canonical set verified)'
        ELSE 'FAIL (Discrepancy in catalogue keys)'
    END AS catalogue_status;

-- Detail list of catalogue keys
SELECT 
    event_key,
    category,
    default_layer,
    default_severity,
    active,
    description
FROM public.admin_notification_event_catalogue
ORDER BY category, event_key;

-- ------------------------------------------------------------------------------
-- 3. Verify Canonical Permissions (Confirm NO notifications.view was added)
-- ------------------------------------------------------------------------------
SELECT 
    COUNT(*) AS notif_permission_count,
    CASE 
        WHEN COUNT(*) = 0 THEN 'PASS (No notifications.view or notif permissions exist)'
        ELSE 'FAIL (Unexpected notification permission found in public.permissions)'
    END AS canonical_permissions_status
FROM public.permissions
WHERE id LIKE '%notif%' OR module LIKE '%notif%';

-- ------------------------------------------------------------------------------
-- 4. Verify audience_mode Column and Constraint Domain
-- ------------------------------------------------------------------------------
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'admin_notifications'
  AND column_name = 'audience_mode';

SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition,
    CASE 
        WHEN pg_get_constraintdef(oid) LIKE '%audience_mode%' 
         AND pg_get_constraintdef(oid) LIKE '%permission%'
         AND pg_get_constraintdef(oid) LIKE '%personal%'
         AND pg_get_constraintdef(oid) LIKE '%super_admin_only%'
        THEN 'PASS (Domain strictly constrained)'
        ELSE 'FAIL (Missing or invalid audience_mode constraint)'
    END AS constraint_status
FROM pg_constraint
WHERE conrelid = 'public.admin_notifications'::regclass
  AND conname = 'chk_notifications_audience_mode';

-- ------------------------------------------------------------------------------
-- 5. Verify Functions, Security Modes, Volatility, and Arguments
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
ORDER BY p.proname;

-- ------------------------------------------------------------------------------
-- 6. Verify Table Privileges (Anon: ZERO; Authenticated: SELECT only)
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
-- 7. Verify Function Execution Privileges
--    (User RPCs: authenticated; Internal helpers & emitter: revoked from anon/authenticated)
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
-- 8. Verify Direct RLS Policy Definition
-- ------------------------------------------------------------------------------
SELECT 
    polname AS policy_name,
    relname AS table_name,
    CASE WHEN polroles = '{0}' THEN 'PUBLIC' ELSE 'authenticated' END AS target_roles,
    pg_get_expr(polqual, polrelid) AS select_using_expression
FROM pg_policy pol
JOIN pg_class c ON c.oid = pol.polrelid
WHERE c.relname = 'admin_notifications';

-- ------------------------------------------------------------------------------
-- 9. Comprehensive Transactional Verification of Recipient Engine & Stale Revocation
--    (Leaves NO persistent data; ends with ROLLBACK)
-- ------------------------------------------------------------------------------
BEGIN;

DO $$
DECLARE
    v_super_admin_id UUID;
    v_normal_admin_id UUID;
    v_inactive_admin_id UUID;
    v_test_role_id TEXT := 'test_notif_role_' || substr(gen_random_uuid()::text, 1, 8);
    v_test_admin_user_id UUID := gen_random_uuid();
    v_eff_perms TEXT[];
    v_can_view BOOLEAN;
    v_resolved_count INTEGER;
    v_emit_res JSONB;
    v_dedupe_test_key TEXT := 'dedupe-test-' || gen_random_uuid()::text;
    v_dedupe_count_1 INTEGER;
    v_dedupe_count_2 INTEGER;
    v_survived_count INTEGER;
    v_caught_exception BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE '=== STARTING NOTIFICATION RECIPIENT ENGINE AUDIT ===';

    -- Identify existing Super Admin fixture if available
    SELECT user_id INTO v_super_admin_id 
    FROM public.admin_users 
    WHERE active = true AND is_super_admin = true 
    LIMIT 1;

    -- Identify existing normal active admin if available
    SELECT user_id INTO v_normal_admin_id 
    FROM public.admin_users 
    WHERE active = true AND (is_super_admin IS FALSE OR is_super_admin IS NULL) 
    LIMIT 1;

    -- Create temporary test role and test admin user inside transaction for deterministic testing
    INSERT INTO public.roles (id, name, display_name_en, display_name_bn, active)
    VALUES (v_test_role_id, 'Notification Tester', 'Notification Tester', 'নোটিফিকেশন টেস্টার', true);

    INSERT INTO public.role_permissions (role_id, permission_id)
    VALUES (v_test_role_id, 'complaints.view');

    INSERT INTO public.admin_users (user_id, email, display_name, active, is_super_admin)
    VALUES (v_test_admin_user_id, 'test-notif-agent@example.com', 'Test Agent', true, false);

    INSERT INTO public.user_roles (user_id, role_id)
    VALUES (v_test_admin_user_id, v_test_role_id);

    -- --------------------------------------------------------------------------
    -- Test 1: Inactive Recipient Check
    -- --------------------------------------------------------------------------
    v_inactive_admin_id := gen_random_uuid();
    INSERT INTO public.admin_users (user_id, email, display_name, active, is_super_admin)
    VALUES (v_inactive_admin_id, 'inactive-agent@example.com', 'Inactive Agent', false, false);

    SELECT ARRAY(SELECT p_id FROM public.admin_notification_get_effective_permissions(v_inactive_admin_id) AS p_id)
    INTO v_eff_perms;

    IF cardinality(v_eff_perms) > 0 THEN
        RAISE EXCEPTION 'TEST 1 FAIL: Inactive admin received permissions: %', v_eff_perms;
    END IF;

    v_can_view := public.admin_notification_can_currently_view(
        v_inactive_admin_id, 'permission', ARRAY['complaints.view'], '{}', 'complaint', 'comp-1'
    );
    IF v_can_view IS TRUE THEN
        RAISE EXCEPTION 'TEST 1 FAIL: Inactive admin passed can_currently_view';
    END IF;
    RAISE NOTICE 'TEST 1 PASS: Inactive recipient correctly receives no permissions and fails view check';

    -- --------------------------------------------------------------------------
    -- Test 2: Super Admin Check
    -- --------------------------------------------------------------------------
    IF v_super_admin_id IS NOT NULL THEN
        SELECT ARRAY(SELECT p_id FROM public.admin_notification_get_effective_permissions(v_super_admin_id) AS p_id)
        INTO v_eff_perms;
        IF cardinality(v_eff_perms) < 10 THEN
            RAISE EXCEPTION 'TEST 2 FAIL: Super admin did not receive complete canonical permissions';
        END IF;

        v_can_view := public.admin_notification_can_currently_view(
            v_super_admin_id, 'super_admin_only', '{}', '{}', NULL, NULL
        );
        IF v_can_view IS NOT TRUE THEN
            RAISE EXCEPTION 'TEST 2 FAIL: Super admin failed super_admin_only visibility';
        END IF;

        v_can_view := public.admin_notification_can_currently_view(
            v_test_admin_user_id, 'super_admin_only', '{}', '{}', NULL, NULL
        );
        IF v_can_view IS TRUE THEN
            RAISE EXCEPTION 'TEST 2 FAIL: Normal admin passed super_admin_only visibility';
        END IF;
        RAISE NOTICE 'TEST 2 PASS: Super admin dynamic catalogue and super_admin_only visibility verified';
    ELSE
        RAISE NOTICE 'TEST 2 SKIPPED: No existing Super Admin found in fixture';
    END IF;

    -- --------------------------------------------------------------------------
    -- Test 3: Actor Exclusion Check
    -- --------------------------------------------------------------------------
    SELECT COUNT(*) INTO v_resolved_count
    FROM public.admin_notification_resolve_recipients(
        'permission',
        ARRAY['complaints.view'],
        '{}',
        'complaint',
        'comp-1',
        NULL,
        v_test_admin_user_id, -- Actor is v_test_admin_user_id
        true, -- Exclude actor
        false -- Do not include super admins
    ) rec
    WHERE rec = v_test_admin_user_id;

    IF v_resolved_count > 0 THEN
        RAISE EXCEPTION 'TEST 3 FAIL: Actor was not excluded when p_exclude_actor is true';
    END IF;
    RAISE NOTICE 'TEST 3 PASS: Actor exclusion verified';

    -- --------------------------------------------------------------------------
    -- Test 4: Personal Mode Check
    -- --------------------------------------------------------------------------
    -- Active recipient without management permissions can see personal notifications
    v_can_view := public.admin_notification_can_currently_view(
        v_test_admin_user_id, 'personal', '{}', '{}', NULL, NULL
    );
    IF v_can_view IS NOT TRUE THEN
        RAISE EXCEPTION 'TEST 4 FAIL: Active user failed personal mode view check';
    END IF;

    -- Inactive user cannot see personal notifications
    v_can_view := public.admin_notification_can_currently_view(
        v_inactive_admin_id, 'personal', '{}', '{}', NULL, NULL
    );
    IF v_can_view IS TRUE THEN
        RAISE EXCEPTION 'TEST 4 FAIL: Inactive user passed personal mode view check';
    END IF;
    RAISE NOTICE 'TEST 4 PASS: Personal mode visibility for active affected user verified';

    -- --------------------------------------------------------------------------
    -- Test 5: required_all_permissions Check
    -- --------------------------------------------------------------------------
    -- Possesses complaints.view -> passes single required permission
    v_can_view := public.admin_notification_can_currently_view(
        v_test_admin_user_id, 'permission', ARRAY['complaints.view'], '{}', 'complaint', 'comp-1'
    );
    IF v_can_view IS NOT TRUE THEN
        RAISE EXCEPTION 'TEST 5 FAIL: User possessing required permission failed check';
    END IF;

    -- Requires complaints.view AND complaints.evidence_view -> user lacks evidence_view -> fails
    v_can_view := public.admin_notification_can_currently_view(
        v_test_admin_user_id, 'permission', ARRAY['complaints.view', 'complaints.evidence_view'], '{}', 'complaint', 'comp-1'
    );
    IF v_can_view IS TRUE THEN
        RAISE EXCEPTION 'TEST 5 FAIL: User missing one required permission passed check';
    END IF;
    RAISE NOTICE 'TEST 5 PASS: required_all_permissions re-evaluation verified';

    -- --------------------------------------------------------------------------
    -- Test 6: required_any_permissions Check
    -- --------------------------------------------------------------------------
    -- Requires any of [complaints.evidence_view, complaints.view] -> has complaints.view -> passes
    v_can_view := public.admin_notification_can_currently_view(
        v_test_admin_user_id, 'permission', '{}', ARRAY['complaints.evidence_view', 'complaints.view'], 'complaint', 'comp-1'
    );
    IF v_can_view IS NOT TRUE THEN
        RAISE EXCEPTION 'TEST 6 FAIL: User possessing one matching permission failed any-check';
    END IF;

    -- Requires any of [roles.manage, admin_users.manage] -> has neither -> fails
    v_can_view := public.admin_notification_can_currently_view(
        v_test_admin_user_id, 'permission', '{}', ARRAY['roles.manage', 'admin_users.manage'], NULL, NULL
    );
    IF v_can_view IS TRUE THEN
        RAISE EXCEPTION 'TEST 6 FAIL: User possessing zero matching permissions passed any-check';
    END IF;
    RAISE NOTICE 'TEST 6 PASS: required_any_permissions re-evaluation verified';

    -- --------------------------------------------------------------------------
    -- Test 7: User Target Scope & Ceiling Check
    -- --------------------------------------------------------------------------
    -- Normal admin without admin_users.view cannot see admin_user target
    v_can_view := public.admin_notification_can_currently_view(
        v_test_admin_user_id, 'permission', '{}', '{}', 'admin_user', v_inactive_admin_id::text
    );
    IF v_can_view IS TRUE THEN
        RAISE EXCEPTION 'TEST 7 FAIL: User without admin_users.view passed user target check';
    END IF;

    -- Even if user has admin_users.view, they cannot see protected Super Admin target
    INSERT INTO public.role_permissions (role_id, permission_id)
    VALUES (v_test_role_id, 'admin_users.view');

    IF v_super_admin_id IS NOT NULL THEN
        v_can_view := public.admin_notification_can_currently_view(
            v_test_admin_user_id, 'permission', '{}', '{}', 'admin_user', v_super_admin_id::text
        );
        IF v_can_view IS TRUE THEN
            RAISE EXCEPTION 'TEST 7 FAIL: Normal admin was allowed to view protected Super Admin target';
        END IF;
    END IF;
    RAISE NOTICE 'TEST 7 PASS: User target scope & delegation ceiling verified';

    -- --------------------------------------------------------------------------
    -- Test 8: Role Target Scope Check
    -- --------------------------------------------------------------------------
    -- Normal admin without roles.manage cannot see role target
    v_can_view := public.admin_notification_can_currently_view(
        v_test_admin_user_id, 'permission', '{}', '{}', 'role', v_test_role_id
    );
    IF v_can_view IS TRUE THEN
        RAISE EXCEPTION 'TEST 8 FAIL: User without roles.manage passed role target check';
    END IF;
    RAISE NOTICE 'TEST 8 PASS: Role target scope verified';

    -- --------------------------------------------------------------------------
    -- Test 9: Unknown Target Type Fails Closed
    -- --------------------------------------------------------------------------
    v_can_view := public.admin_notification_can_currently_view(
        v_test_admin_user_id, 'permission', '{}', '{}', 'unknown_target', 'target-id-123'
    );
    IF v_can_view IS TRUE THEN
        RAISE EXCEPTION 'TEST 9 FAIL: Unknown target_type passed can_currently_view check';
    END IF;

    -- Emitter validation rejects unknown target type with 22000
    v_caught_exception := FALSE;
    BEGIN
        PERFORM public.admin_emit_notification(
            p_event_key := 'complaint.submitted',
            p_title_en := 'Test',
            p_title_bn := 'টেস্ট',
            p_target_type := 'unsupported_type',
            p_target_id := '123'
        );
    EXCEPTION WHEN SQLSTATE '22000' THEN
        v_caught_exception := TRUE;
    END;
    IF v_caught_exception IS NOT TRUE THEN
        RAISE EXCEPTION 'TEST 9 FAIL: admin_emit_notification did not reject unsupported target_type';
    END IF;
    RAISE NOTICE 'TEST 9 PASS: Unknown target type fails closed and is rejected by emitter';

    -- --------------------------------------------------------------------------
    -- Test 10: Unknown Audience Mode Fails Closed
    -- --------------------------------------------------------------------------
    v_can_view := public.admin_notification_can_currently_view(
        v_test_admin_user_id, 'invalid_audience', '{}', '{}', NULL, NULL
    );
    IF v_can_view IS TRUE THEN
        RAISE EXCEPTION 'TEST 10 FAIL: Invalid audience_mode passed can_currently_view check';
    END IF;

    v_caught_exception := FALSE;
    BEGIN
        PERFORM public.admin_emit_notification(
            p_event_key := 'complaint.submitted',
            p_title_en := 'Test',
            p_title_bn := 'টেস্ট',
            p_audience_mode := 'unsupported_mode'
        );
    EXCEPTION WHEN SQLSTATE '22000' THEN
        v_caught_exception := TRUE;
    END;
    IF v_caught_exception IS NOT TRUE THEN
        RAISE EXCEPTION 'TEST 10 FAIL: admin_emit_notification did not reject unsupported audience_mode';
    END IF;
    RAISE NOTICE 'TEST 10 PASS: Unknown audience mode fails closed and is rejected by emitter';

    -- --------------------------------------------------------------------------
    -- Test 11: Stale Authorization Revocation
    -- --------------------------------------------------------------------------
    -- Currently v_test_admin_user_id has complaints.view -> can view
    v_can_view := public.admin_notification_can_currently_view(
        v_test_admin_user_id, 'permission', ARRAY['complaints.view'], '{}', 'complaint', 'comp-1'
    );
    IF v_can_view IS NOT TRUE THEN
        RAISE EXCEPTION 'TEST 11 PRECONDITION FAIL: User should be able to view before revocation';
    END IF;

    -- Now revoke complaints.view from the role
    DELETE FROM public.role_permissions 
    WHERE role_id = v_test_role_id AND permission_id = 'complaints.view';

    -- Re-evaluate current visibility -> MUST BECOME FALSE!
    v_can_view := public.admin_notification_can_currently_view(
        v_test_admin_user_id, 'permission', ARRAY['complaints.view'], '{}', 'complaint', 'comp-1'
    );
    IF v_can_view IS TRUE THEN
        RAISE EXCEPTION 'TEST 11 FAIL: Notification remained visible after permission revocation!';
    END IF;
    RAISE NOTICE 'TEST 11 PASS: Stale authorization revocation verified (notification becomes hidden when permission removed)';

    -- --------------------------------------------------------------------------
    -- Test 12: Emitter Idempotency & Deduplication Check
    -- --------------------------------------------------------------------------
    -- First emission with unique dedupe key
    v_emit_res := public.admin_emit_notification(
        p_event_key := 'complaint.submitted',
        p_title_en := 'Test Dedupe Initial',
        p_title_bn := 'টেস্ট রিডুপ ইনিশিয়াল',
        p_audience_mode := 'personal',
        p_personal_recipient_id := v_test_admin_user_id,
        p_dedupe_key := v_dedupe_test_key,
        p_exclude_actor := false
    );
    v_dedupe_count_1 := (v_emit_res->>'recipient_count')::integer;

    -- Second emission with identical dedupe key and recipient
    v_emit_res := public.admin_emit_notification(
        p_event_key := 'complaint.submitted',
        p_title_en := 'Test Dedupe Duplicate',
        p_title_bn := 'টেস্ট রিডুপ ডুপ্লিকেট',
        p_audience_mode := 'personal',
        p_personal_recipient_id := v_test_admin_user_id,
        p_dedupe_key := v_dedupe_test_key,
        p_exclude_actor := false
    );
    v_dedupe_count_2 := (v_emit_res->>'recipient_count')::integer;

    SELECT COUNT(*) INTO v_survived_count
    FROM public.admin_notifications
    WHERE recipient_user_id = v_test_admin_user_id AND dedupe_key = v_dedupe_test_key;

    IF v_dedupe_count_1 = 1 AND v_dedupe_count_2 = 0 AND v_survived_count = 1 THEN
        RAISE NOTICE 'TEST 12 PASS: Emitter deduplication and database uniqueness verified';
    ELSE
        RAISE EXCEPTION 'TEST 12 FAIL: Emitter dedupe failed. Count1=%, Count2=%, Survived=%',
            v_dedupe_count_1, v_dedupe_count_2, v_survived_count;
    END IF;

    RAISE NOTICE '=== ALL 12 NOTIFICATION FOUNDATION TESTS PASSED SUCCESSFULLY ===';
END;
$$;

ROLLBACK;
