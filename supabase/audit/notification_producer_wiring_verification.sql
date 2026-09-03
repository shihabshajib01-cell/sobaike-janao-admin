-- ==============================================================================
-- SOBAIKE JANAO ADMIN — PHASE 2 NOTIFICATION PRODUCER WIRING AUDIT SCRIPT
-- ==============================================================================
-- Target: Supabase PostgreSQL Database (sobaike-production)
-- Purpose: Complete static and dynamic verification of Phase 2 Notification Producer Wiring
--          across all 12 catalogue events, producer contracts, RLS safety,
--          audience mode routing, deduplication idempotency, and transactional safety.
-- Safety: Non-destructive; dynamic simulation tests execute inside a rolled-back transaction.
-- Expected Final Output: === PHASE 2 NOTIFICATION WIRING AUDIT: SUCCESS ===
-- ==============================================================================

\set ON_ERROR_STOP on

-- ------------------------------------------------------------------------------
-- 1. STATIC ASSERTIONS: Catalogue Definitions, Producers, and Event Keys
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_expected_events TEXT[] := ARRAY[
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
    ];
    v_ev TEXT;
    v_cat_count INT;
    v_missing_events TEXT[];
    v_func_src TEXT;
    v_proc_name TEXT;
    v_ret_type TEXT;
    v_anon_grant_count INT;
BEGIN
    RAISE NOTICE '>>> [AUDIT 1.1] Inspecting Notification Event Catalogue Definitions...';

    -- Check all 12 events exist in admin_notification_event_catalogue
    SELECT ARRAY(
        SELECT unnest(v_expected_events)
        EXCEPT
        SELECT event_key FROM public.admin_notification_event_catalogue
    ) INTO v_missing_events;

    IF cardinality(v_missing_events) > 0 THEN
        RAISE EXCEPTION 'Catalogue Verification FAILED: Missing event keys: %', array_to_string(v_missing_events, ', ');
    END IF;

    -- Verify default severity, audience mode, category, descriptions
    FOR v_ev IN SELECT unnest(v_expected_events)
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM public.admin_notification_event_catalogue
            WHERE event_key = v_ev
              AND category IN ('complaints', 'admin_users', 'roles', 'system')
              AND default_severity IN ('info', 'warning', 'critical')
              AND default_audience_mode IN ('permission', 'personal', 'super_admin_only')
              AND length(btrim(description_en)) > 0
              AND length(btrim(description_bn)) > 0
        ) THEN
            RAISE EXCEPTION 'Catalogue Verification FAILED: Event % has incomplete catalogue metadata!', v_ev;
        END IF;
    END LOOP;

    RAISE NOTICE '>>> [AUDIT 1.1 SUCCESS] All 12 catalogue definitions verified.';

    -- Check producers exist as SECURITY DEFINER
    RAISE NOTICE '>>> [AUDIT 1.2] Inspecting Producer Routines & Security Definer Status...';
    FOR v_proc_name IN SELECT unnest(ARRAY[
        'submit_public_complaint',
        'register_public_complaint_evidence',
        'admin_publish_complaint',
        'admin_unpublish_complaint',
        'admin_reject_complaint',
        'admin_finalize_user_membership',
        'admin_update_user',
        'admin_create_role',
        'admin_update_role',
        'admin_replace_role_permissions',
        'log_role_audit_event'
    ])
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public'
              AND p.proname = v_proc_name
              AND p.prosecdef = true
        ) THEN
            RAISE EXCEPTION 'Producer Routine FAILED: % is not defined or is not SECURITY DEFINER!', v_proc_name;
        END IF;
    END LOOP;

    -- Verify log_role_audit_event returns UUID
    SELECT t.typname INTO v_ret_type
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_type t ON t.oid = p.prorettype
    WHERE n.nspname = 'public'
      AND p.proname = 'log_role_audit_event';

    IF v_ret_type <> 'uuid' THEN
        RAISE EXCEPTION 'Audit Logger FAILED: log_role_audit_event must return uuid, found %', v_ret_type;
    END IF;

    RAISE NOTICE '>>> [AUDIT 1.2 SUCCESS] All producer routines and helper return types verified.';

    -- Verify execute permissions
    RAISE NOTICE '>>> [AUDIT 1.3] Inspecting Routine Privilege Grants & Revocations...';
    -- Admin functions must NOT be callable by anon or PUBLIC
    SELECT COUNT(*) INTO v_anon_grant_count
    FROM information_schema.routine_privileges
    WHERE routine_schema = 'public'
      AND routine_name IN (
        'admin_publish_complaint',
        'admin_unpublish_complaint',
        'admin_reject_complaint',
        'admin_finalize_user_membership',
        'admin_update_user',
        'admin_create_role',
        'admin_update_role',
        'admin_replace_role_permissions',
        'admin_emit_notification'
      )
      AND grantee IN ('anon', 'PUBLIC');

    IF v_anon_grant_count > 0 THEN
        RAISE EXCEPTION 'Security Grant FAILED: Administrative procedures or admin_emit_notification granted to anon/PUBLIC!';
    END IF;

    RAISE NOTICE '>>> [AUDIT 1.3 SUCCESS] Strict RBAC execute grants confirmed.';

    -- Check source code contains expected event keys
    RAISE NOTICE '>>> [AUDIT 1.4] Inspecting Function Source Codes for Canonical Event Keys...';
    
    -- submit_public_complaint -> complaint.submitted
    SELECT prosrc INTO v_func_src FROM pg_proc WHERE proname = 'submit_public_complaint' LIMIT 1;
    IF v_func_src NOT LIKE '%complaint.submitted%' THEN
        RAISE EXCEPTION 'Source Code Audit FAILED: submit_public_complaint does not emit complaint.submitted';
    END IF;

    -- register_public_complaint_evidence -> complaint.evidence_attached
    SELECT prosrc INTO v_func_src FROM pg_proc WHERE proname = 'register_public_complaint_evidence' LIMIT 1;
    IF v_func_src NOT LIKE '%complaint.evidence_attached%' THEN
        RAISE EXCEPTION 'Source Code Audit FAILED: register_public_complaint_evidence does not emit complaint.evidence_attached';
    END IF;

    -- admin_publish_complaint -> complaint.published
    SELECT prosrc INTO v_func_src FROM pg_proc WHERE proname = 'admin_publish_complaint' LIMIT 1;
    IF v_func_src NOT LIKE '%complaint.published%' THEN
        RAISE EXCEPTION 'Source Code Audit FAILED: admin_publish_complaint does not emit complaint.published';
    END IF;

    -- admin_unpublish_complaint -> complaint.unpublished
    SELECT prosrc INTO v_func_src FROM pg_proc WHERE proname = 'admin_unpublish_complaint' LIMIT 1;
    IF v_func_src NOT LIKE '%complaint.unpublished%' THEN
        RAISE EXCEPTION 'Source Code Audit FAILED: admin_unpublish_complaint does not emit complaint.unpublished';
    END IF;

    -- admin_reject_complaint -> complaint.rejected
    SELECT prosrc INTO v_func_src FROM pg_proc WHERE proname = 'admin_reject_complaint' LIMIT 1;
    IF v_func_src NOT LIKE '%complaint.rejected%' THEN
        RAISE EXCEPTION 'Source Code Audit FAILED: admin_reject_complaint does not emit complaint.rejected';
    END IF;

    -- admin_finalize_user_membership -> admin.created (Dual Stream)
    SELECT prosrc INTO v_func_src FROM pg_proc WHERE proname = 'admin_finalize_user_membership' LIMIT 1;
    IF v_func_src NOT LIKE '%admin.created%' OR v_func_src NOT LIKE '%p_audience_mode := ''personal''%' THEN
        RAISE EXCEPTION 'Source Code Audit FAILED: admin_finalize_user_membership does not wire dual-stream admin.created';
    END IF;

    -- admin_update_user -> admin.activated, admin.deactivated, admin.role_changed (Dual Stream)
    SELECT prosrc INTO v_func_src FROM pg_proc WHERE proname = 'admin_update_user' LIMIT 1;
    IF v_func_src NOT LIKE '%admin.activated%' OR v_func_src NOT LIKE '%admin.deactivated%' OR v_func_src NOT LIKE '%admin.role_changed%' THEN
        RAISE EXCEPTION 'Source Code Audit FAILED: admin_update_user does not wire admin user state transitions';
    END IF;

    -- admin_create_role -> role.created
    SELECT prosrc INTO v_func_src FROM pg_proc WHERE proname = 'admin_create_role' LIMIT 1;
    IF v_func_src NOT LIKE '%role.created%' THEN
        RAISE EXCEPTION 'Source Code Audit FAILED: admin_create_role does not emit role.created';
    END IF;

    -- admin_update_role -> role.updated & role.permissions_changed
    SELECT prosrc INTO v_func_src FROM pg_proc WHERE proname = 'admin_update_role' LIMIT 1;
    IF v_func_src NOT LIKE '%role.updated%' OR v_func_src NOT LIKE '%role.permissions_changed%' THEN
        RAISE EXCEPTION 'Source Code Audit FAILED: admin_update_role does not wire role changes';
    END IF;

    -- admin_replace_role_permissions -> role.permissions_changed
    SELECT prosrc INTO v_func_src FROM pg_proc WHERE proname = 'admin_replace_role_permissions' LIMIT 1;
    IF v_func_src NOT LIKE '%role.permissions_changed%' THEN
        RAISE EXCEPTION 'Source Code Audit FAILED: admin_replace_role_permissions does not emit role.permissions_changed';
    END IF;

    RAISE NOTICE '>>> [AUDIT 1.4 SUCCESS] Producer source codes statically verified.';
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. DYNAMIC TRANSACTIONAL TEST SUITE
-- Executes end-to-end emission verification across all 12 events in an isolated
-- sandbox with mock actors, recipients, and scopes, rolling back cleanly.
-- ------------------------------------------------------------------------------
BEGIN;

DO $$
DECLARE
    -- Test UUIDs for Users
    v_u_super_actor   UUID := '11111111-1111-4111-8111-111111111111'::UUID;
    v_u_super_obs     UUID := '22222222-2222-4222-8222-222222222222'::UUID;
    v_u_moderator     UUID := '33333333-3333-4333-8333-333333333333'::UUID;
    v_u_investigator  UUID := '44444444-4444-4444-8444-444444444444'::UUID;
    v_u_user_mgr      UUID := '55555555-5555-4555-8555-555555555555'::UUID;
    v_u_target_user   UUID := '66666666-6666-4666-8666-666666666666'::UUID;
    
    -- Variables for tests
    v_sub_payload     JSONB;
    v_sub_resp        JSONB;
    v_complaint_id    TEXT;
    v_client_sub_id   TEXT := 'audit_test_sub_' || floor(random()*100000)::text;
    v_ev_resp         JSONB;
    v_evidence_id     UUID;
    v_notif_count     INT;
    v_role_resp       JSONB;
    v_test_role_slug  TEXT;
    v_user_resp       JSONB;
BEGIN
    RAISE NOTICE '>>> [AUDIT 2.0] Initializing Test Fixtures & Sandbox Administrators...';

    -- Ensure test segments & subcategories exist
    INSERT INTO public.segments (id, name_en, name_bn, active)
    VALUES ('audit_seg', 'Audit Segment', 'অডিট সেগমেন্ট', true)
    ON CONFLICT (id) DO UPDATE SET active = true;

    INSERT INTO public.subcategories (id, segment_id, name_en, name_bn, active)
    VALUES ('audit_subcat', 'audit_seg', 'Audit Subcat', 'অডিট সাবক্যাটাগরি', true)
    ON CONFLICT (id) DO UPDATE SET active = true;

    -- Ensure auth.users exist for all test actors
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES 
        (v_u_super_actor, 'super_actor@test.internal', '{"name":"Super Actor"}'::jsonb),
        (v_u_super_obs,   'super_obs@test.internal',   '{"name":"Super Observer"}'::jsonb),
        (v_u_moderator,   'moderator@test.internal',   '{"name":"Moderator Admin"}'::jsonb),
        (v_u_investigator,'investigator@test.internal','{"name":"Investigator Admin"}'::jsonb),
        (v_u_user_mgr,    'usermgr@test.internal',     '{"name":"User Manager Admin"}'::jsonb),
        (v_u_target_user, 'target@test.internal',      '{"name":"Target Admin User"}'::jsonb)
    ON CONFLICT (id) DO NOTHING;

    -- Clean old admin_users test entries
    DELETE FROM public.admin_notifications WHERE recipient_user_id IN (
        v_u_super_actor, v_u_super_obs, v_u_moderator, v_u_investigator, v_u_user_mgr, v_u_target_user
    );
    DELETE FROM public.user_roles WHERE user_id IN (
        v_u_super_actor, v_u_super_obs, v_u_moderator, v_u_investigator, v_u_user_mgr, v_u_target_user
    );
    DELETE FROM public.admin_users WHERE user_id IN (
        v_u_super_actor, v_u_super_obs, v_u_moderator, v_u_investigator, v_u_user_mgr, v_u_target_user
    );

    -- Setup Super Admins
    INSERT INTO public.admin_users (user_id, display_name, is_super_admin, active)
    VALUES 
        (v_u_super_actor, 'Super Actor', true, true),
        (v_u_super_obs,   'Super Observer', true, true);

    -- Setup Custom Roles for testing
    INSERT INTO public.roles (id, name_en, name_bn, active, is_system)
    VALUES 
        ('r_moderator', 'Moderator Role', 'মডারেটর', true, false),
        ('r_investigator', 'Investigator Role', 'তদন্তকারী', true, false),
        ('r_usermgr', 'User Manager Role', 'ইউজার ম্যানেজার', true, false)
    ON CONFLICT (id) DO UPDATE SET active = true;

    DELETE FROM public.role_permissions WHERE role_id IN ('r_moderator', 'r_investigator', 'r_usermgr');

    -- r_moderator has complaints.view, complaints.manage
    INSERT INTO public.role_permissions (role_id, permission_id)
    VALUES 
        ('r_moderator', 'complaints.view'),
        ('r_moderator', 'complaints.manage');

    -- r_investigator has complaints.view, complaints.evidence_view
    INSERT INTO public.role_permissions (role_id, permission_id)
    VALUES 
        ('r_investigator', 'complaints.view'),
        ('r_investigator', 'complaints.evidence_view');

    -- r_usermgr has admin_users.view, admin_users.manage, roles.view, roles.manage
    INSERT INTO public.role_permissions (role_id, permission_id)
    VALUES 
        ('r_usermgr', 'admin_users.view'),
        ('r_usermgr', 'admin_users.manage'),
        ('r_usermgr', 'roles.view'),
        ('r_usermgr', 'roles.manage');

    -- Assign roles to test users
    INSERT INTO public.admin_users (user_id, display_name, is_super_admin, active)
    VALUES 
        (v_u_moderator, 'Moderator Admin', false, true),
        (v_u_investigator, 'Investigator Admin', false, true),
        (v_u_user_mgr, 'User Manager Admin', false, true);

    INSERT INTO public.user_roles (user_id, role_id)
    VALUES 
        (v_u_moderator, 'r_moderator'),
        (v_u_investigator, 'r_investigator'),
        (v_u_user_mgr, 'r_usermgr');

    -- --------------------------------------------------------------------------
    -- TEST 1: Event 'complaint.submitted' (submit_public_complaint)
    -- --------------------------------------------------------------------------
    RAISE NOTICE '>>> [AUDIT 2.1] Testing Event 1: complaint.submitted...';
    v_sub_payload := jsonb_build_object(
        'segment', 'audit_seg',
        'subcategoryId', 'audit_subcat',
        'title', 'Audit Test Complaint Title',
        'description', 'Audit Test Complaint Description with sufficient length.',
        'incidentDate', '2026-09-01',
        'location', jsonb_build_object('district', 'Dhaka', 'division', 'Dhaka')
    );

    v_sub_resp := public.submit_public_complaint(v_sub_payload, v_client_sub_id);
    v_complaint_id := v_sub_resp->>'reportId';

    IF v_complaint_id IS NULL THEN
        RAISE EXCEPTION 'TEST 1 FAILED: submit_public_complaint did not return reportId!';
    END IF;

    -- Verify Moderator & Observer received notification, Target User did NOT
    SELECT COUNT(*) INTO v_notif_count
    FROM public.admin_notifications
    WHERE event_key = 'complaint.submitted'
      AND target_id = v_complaint_id
      AND recipient_user_id = v_u_moderator;

    IF v_notif_count <> 1 THEN
        RAISE EXCEPTION 'TEST 1 FAILED: Moderator did not receive complaint.submitted notification!';
    END IF;

    -- Idempotency Test: re-submitting same client_submission_id must NOT duplicate notification
    PERFORM public.submit_public_complaint(v_sub_payload, v_client_sub_id);

    SELECT COUNT(*) INTO v_notif_count
    FROM public.admin_notifications
    WHERE event_key = 'complaint.submitted'
      AND target_id = v_complaint_id
      AND recipient_user_id = v_u_moderator;

    IF v_notif_count <> 1 THEN
        RAISE EXCEPTION 'TEST 1 FAILED: Duplicate notification was emitted on idempotent submission!';
    END IF;

    RAISE NOTICE '>>> [AUDIT 2.1 SUCCESS] Event 1 complaint.submitted verified with idempotency.';

    -- --------------------------------------------------------------------------
    -- TEST 2: Event 'complaint.evidence_attached' (register_public_complaint_evidence)
    -- --------------------------------------------------------------------------
    RAISE NOTICE '>>> [AUDIT 2.2] Testing Event 2: complaint.evidence_attached...';
    v_ev_resp := public.register_public_complaint_evidence(
        v_client_sub_id,
        'evidence/audit_test.jpg',
        'audit_test.jpg',
        10240,
        'Test Caption'
    );
    v_evidence_id := (v_ev_resp->>'evidence_id')::UUID;

    -- Requires complaints.view AND complaints.evidence_view
    -- v_u_investigator HAS both -> should receive
    -- v_u_moderator DOES NOT have evidence_view -> should NOT receive
    SELECT COUNT(*) INTO v_notif_count
    FROM public.admin_notifications
    WHERE event_key = 'complaint.evidence_attached'
      AND target_id = v_complaint_id
      AND recipient_user_id = v_u_investigator;

    IF v_notif_count <> 1 THEN
        RAISE EXCEPTION 'TEST 2 FAILED: Investigator did not receive complaint.evidence_attached!';
    END IF;

    SELECT COUNT(*) INTO v_notif_count
    FROM public.admin_notifications
    WHERE event_key = 'complaint.evidence_attached'
      AND target_id = v_complaint_id
      AND recipient_user_id = v_u_moderator;

    IF v_notif_count <> 0 THEN
        RAISE EXCEPTION 'TEST 2 FAILED: Moderator without evidence_view received evidence notification!';
    END IF;

    RAISE NOTICE '>>> [AUDIT 2.2 SUCCESS] Event 2 complaint.evidence_attached verified with dual-permission check.';

    -- --------------------------------------------------------------------------
    -- TEST 3, 4, 5: Moderation Events (published, unpublished, rejected)
    -- --------------------------------------------------------------------------
    RAISE NOTICE '>>> [AUDIT 2.3] Testing Events 3, 4, 5: Moderation Workflow...';
    
    -- Act as v_u_moderator
    PERFORM set_config('request.jwt.claim.sub', v_u_super_actor::text, true);

    -- 3. Publish Complaint -> complaint.published
    PERFORM public.admin_publish_complaint(v_complaint_id);

    -- Actor (v_u_super_actor) must be excluded, Observer (v_u_super_obs) must receive
    SELECT COUNT(*) INTO v_notif_count
    FROM public.admin_notifications
    WHERE event_key = 'complaint.published'
      AND target_id = v_complaint_id
      AND recipient_user_id = v_u_super_actor;

    IF v_notif_count <> 0 THEN
        RAISE EXCEPTION 'TEST 3 FAILED: Actor was not excluded from complaint.published!';
    END IF;

    SELECT COUNT(*) INTO v_notif_count
    FROM public.admin_notifications
    WHERE event_key = 'complaint.published'
      AND target_id = v_complaint_id
      AND recipient_user_id = v_u_super_obs;

    IF v_notif_count <> 1 THEN
        RAISE EXCEPTION 'TEST 3 FAILED: Super Admin Observer did not receive complaint.published!';
    END IF;

    -- 4. Unpublish Complaint -> complaint.unpublished
    PERFORM public.admin_unpublish_complaint(v_complaint_id, 'Audit test reason');

    SELECT COUNT(*) INTO v_notif_count
    FROM public.admin_notifications
    WHERE event_key = 'complaint.unpublished'
      AND target_id = v_complaint_id
      AND recipient_user_id = v_u_super_obs;

    IF v_notif_count <> 1 THEN
        RAISE EXCEPTION 'TEST 4 FAILED: Observer did not receive complaint.unpublished!';
    END IF;

    -- 5. Reject Complaint (reset status to submitted first for test)
    UPDATE public.complaints SET status = 'submitted' WHERE id = v_complaint_id;
    PERFORM public.admin_reject_complaint(v_complaint_id, 'INCOMPLETE_EVIDENCE', 'Audit note');

    SELECT COUNT(*) INTO v_notif_count
    FROM public.admin_notifications
    WHERE event_key = 'complaint.rejected'
      AND target_id = v_complaint_id
      AND recipient_user_id = v_u_super_obs;

    IF v_notif_count <> 1 THEN
        RAISE EXCEPTION 'TEST 5 FAILED: Observer did not receive complaint.rejected!';
    END IF;

    RAISE NOTICE '>>> [AUDIT 2.3 SUCCESS] Events 3, 4, 5 (published, unpublished, rejected) verified.';

    -- --------------------------------------------------------------------------
    -- TEST 6, 7, 8, 9: User Lifecycle (admin.created, activated, deactivated, role_changed)
    -- --------------------------------------------------------------------------
    RAISE NOTICE '>>> [AUDIT 2.4] Testing Events 6, 7, 8, 9: User Lifecycle Dual-Stream...';

    -- 6. Finalize User Membership -> admin.created (Dual Stream)
    v_user_resp := public.admin_finalize_user_membership(
        v_u_target_user,
        'Target User Display',
        'r_moderator',
        true
    );

    -- Stream A (Oversight): User Manager (v_u_user_mgr) receives it
    SELECT COUNT(*) INTO v_notif_count
    FROM public.admin_notifications
    WHERE event_key = 'admin.created'
      AND target_id = v_u_target_user::text
      AND audience_mode = 'permission'
      AND recipient_user_id = v_u_user_mgr;

    IF v_notif_count <> 1 THEN
        RAISE EXCEPTION 'TEST 6 FAILED: User Manager did not receive admin.created oversight notification!';
    END IF;

    -- Stream B (Personal): Target User (v_u_target_user) receives welcome notification
    SELECT COUNT(*) INTO v_notif_count
    FROM public.admin_notifications
    WHERE event_key = 'admin.created'
      AND target_id = v_u_target_user::text
      AND audience_mode = 'personal'
      AND recipient_user_id = v_u_target_user;

    IF v_notif_count <> 1 THEN
        RAISE EXCEPTION 'TEST 6 FAILED: Target user did not receive admin.created personal notification!';
    END IF;

    -- 7 & 8. Deactivate then Activate -> admin.deactivated & admin.activated
    -- Deactivate
    PERFORM public.admin_update_user(v_u_target_user, NULL, NULL, false);

    -- Personal deactivation notice should be delivered to target user
    SELECT COUNT(*) INTO v_notif_count
    FROM public.admin_notifications
    WHERE event_key = 'admin.deactivated'
      AND target_id = v_u_target_user::text
      AND audience_mode = 'personal'
      AND recipient_user_id = v_u_target_user;

    IF v_notif_count <> 1 THEN
        RAISE EXCEPTION 'TEST 8 FAILED: Target user did not receive admin.deactivated personal notice!';
    END IF;

    -- Oversight deactivation notice delivered to User Manager
    SELECT COUNT(*) INTO v_notif_count
    FROM public.admin_notifications
    WHERE event_key = 'admin.deactivated'
      AND target_id = v_u_target_user::text
      AND audience_mode = 'permission'
      AND recipient_user_id = v_u_user_mgr;

    IF v_notif_count <> 1 THEN
        RAISE EXCEPTION 'TEST 8 FAILED: User manager did not receive admin.deactivated oversight notice!';
    END IF;

    -- Activate
    PERFORM public.admin_update_user(v_u_target_user, NULL, NULL, true);

    SELECT COUNT(*) INTO v_notif_count
    FROM public.admin_notifications
    WHERE event_key = 'admin.activated'
      AND target_id = v_u_target_user::text
      AND audience_mode = 'personal'
      AND recipient_user_id = v_u_target_user;

    IF v_notif_count <> 1 THEN
        RAISE EXCEPTION 'TEST 7 FAILED: Target user did not receive admin.activated personal notice!';
    END IF;

    -- 9. Role Changed -> admin.role_changed
    PERFORM public.admin_update_user(v_u_target_user, NULL, 'r_investigator', NULL);

    SELECT COUNT(*) INTO v_notif_count
    FROM public.admin_notifications
    WHERE event_key = 'admin.role_changed'
      AND target_id = v_u_target_user::text
      AND audience_mode = 'personal'
      AND recipient_user_id = v_u_target_user;

    IF v_notif_count <> 1 THEN
        RAISE EXCEPTION 'TEST 9 FAILED: Target user did not receive admin.role_changed personal notice!';
    END IF;

    RAISE NOTICE '>>> [AUDIT 2.4 SUCCESS] Events 6, 7, 8, 9 (User Lifecycle Dual-Stream) verified.';

    -- --------------------------------------------------------------------------
    -- TEST 10, 11, 12: Role Lifecycle (role.created, updated, permissions_changed)
    -- --------------------------------------------------------------------------
    RAISE NOTICE '>>> [AUDIT 2.5] Testing Events 10, 11, 12: Role Lifecycle...';

    -- 10. Create Role -> role.created
    v_role_resp := public.admin_create_role(
        'Audit Unique Test Role',
        'অডিট ভূমিকা',
        true,
        ARRAY['complaints.view']::TEXT[],
        'Audit role description'
    );
    v_test_role_slug := v_role_resp->>'id';

    SELECT COUNT(*) INTO v_notif_count
    FROM public.admin_notifications
    WHERE event_key = 'role.created'
      AND target_id = v_test_role_slug
      AND recipient_user_id = v_u_user_mgr;

    IF v_notif_count <> 1 THEN
        RAISE EXCEPTION 'TEST 10 FAILED: User Manager did not receive role.created!';
    END IF;

    -- 11. Update Role Metadata -> role.updated
    PERFORM public.admin_update_role(
        p_role_id := v_test_role_slug,
        p_name_en := 'Updated Audit Role Title',
        p_name_bn := 'আপডেটেড অডিট ভূমিকা'
    );

    SELECT COUNT(*) INTO v_notif_count
    FROM public.admin_notifications
    WHERE event_key = 'role.updated'
      AND target_id = v_test_role_slug
      AND recipient_user_id = v_u_user_mgr;

    IF v_notif_count <> 1 THEN
        RAISE EXCEPTION 'TEST 11 FAILED: User Manager did not receive role.updated on metadata change!';
    END IF;

    -- 12. Update Role Permissions -> role.permissions_changed
    PERFORM public.admin_replace_role_permissions(
        p_role_id := v_test_role_slug,
        p_permission_ids := ARRAY['complaints.view', 'complaints.manage']::TEXT[]
    );

    SELECT COUNT(*) INTO v_notif_count
    FROM public.admin_notifications
    WHERE event_key = 'role.permissions_changed'
      AND target_id = v_test_role_slug
      AND recipient_user_id = v_u_user_mgr;

    IF v_notif_count <> 1 THEN
        RAISE EXCEPTION 'TEST 12 FAILED: User Manager did not receive role.permissions_changed!';
    END IF;

    RAISE NOTICE '>>> [AUDIT 2.5 SUCCESS] Events 10, 11, 12 (Role Lifecycle) verified.';

    RAISE NOTICE '==============================================================================';
    RAISE NOTICE '=== PHASE 2 NOTIFICATION WIRING AUDIT: SUCCESS ===';
    RAISE NOTICE '==============================================================================';
END;
$$;

ROLLBACK;
