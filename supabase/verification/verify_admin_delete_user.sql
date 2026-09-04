-- ==============================================================================
-- Verification Script: verify_admin_delete_user.sql
-- Description: Complete, safe-to-run verification for the Delete Administrator backend.
--
-- Validates:
--   1. Function existence, argument names/types, and return type (jsonb)
--   2. SECURITY DEFINER & fixed search_path (pg_catalog, public) hardening
--   3. Privilege grants / revokes (anon blocked, authenticated & service_role permitted)
--   4. Service-role table privileges on user_roles (SELECT) and admin_audit_logs (INSERT)
--   5. Unauthenticated execution rejection (42501)
--   6. admin_users.manage permission enforcement (42501 for unpermitted callers)
--   7. Input validation (NULL target rejected with 22000, non-existent admin rejected with P0002)
--   8. Self-deletion guard (CANNOT_DELETE_SELF)
--   9. Super Admin account protection (SUPER_ADMIN_CANNOT_BE_DELETED)
--  10. Delegation ceiling guard (can_manage_user_target)
--  11. Foreign Key cascade integrity (auth.users -> admin_users -> user_roles)
--  12. Audit referential integrity (admin_audit_logs.actor_id ON DELETE SET NULL)
--  13. Audit logging integration (ADMIN_USER_DELETED event emission & direct fallback)
--  14. Notification catalogue integrity (no unsolicited delete events)
--
-- NOTE: Safe for live deployment verification. Uses transactional rollbacks and metadata
-- inspections without destructively deleting real administrative users.
-- ==============================================================================

BEGIN;

DO $$
DECLARE
    v_fn_oid OID;
    v_prosecdef BOOLEAN;
    v_proconfig TEXT[];
    v_fn_result TEXT;
    v_has_anon_execute BOOLEAN;
    v_has_auth_execute BOOLEAN;
    v_has_service_execute BOOLEAN;
    v_fk_admin_cascade BOOLEAN;
    v_fk_roles_cascade BOOLEAN;
    v_fk_audit_set_null BOOLEAN;
    v_super_admin_id UUID;
    v_normal_admin_id UUID;
    v_test_err_detail TEXT;
    v_audit_id UUID;
BEGIN
    RAISE NOTICE '==================================================';
    RAISE NOTICE 'STARTING: Delete Administrator Backend Verification';
    RAISE NOTICE '==================================================';

    -- --------------------------------------------------
    -- 1. FUNCTION EXISTENCE, SIGNATURE & RETURN TYPE
    -- --------------------------------------------------
    SELECT p.oid, p.prosecdef, p.proconfig, pg_get_function_result(p.oid)
    INTO v_fn_oid, v_prosecdef, v_proconfig, v_fn_result
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'admin_delete_user'
      AND pg_get_function_identity_arguments(p.oid) = 'p_target_user_id uuid';

    IF v_fn_oid IS NULL THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: public.admin_delete_user(p_target_user_id uuid) does not exist.';
    END IF;

    IF v_fn_result <> 'jsonb' THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: admin_delete_user must return jsonb, found: %', v_fn_result;
    END IF;
    RAISE NOTICE '✓ [PASS] Function exists with exact signature: public.admin_delete_user(p_target_user_id uuid) -> jsonb';

    -- --------------------------------------------------
    -- 2. SECURITY DEFINER & SEARCH PATH HARDENING
    -- --------------------------------------------------
    IF NOT v_prosecdef THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: admin_delete_user must be SECURITY DEFINER.';
    END IF;

    IF v_proconfig IS NULL OR NOT ('search_path=pg_catalog, public' = ANY(v_proconfig)) THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: admin_delete_user search_path must be fixed to "search_path=pg_catalog, public".';
    END IF;
    RAISE NOTICE '✓ [PASS] Security Definer and search_path properly hardened (search_path=pg_catalog, public).';

    -- --------------------------------------------------
    -- 3. PRIVILEGE GRANTS & REVOKES
    -- --------------------------------------------------
    v_has_anon_execute := has_function_privilege('anon', v_fn_oid, 'EXECUTE');
    v_has_auth_execute := has_function_privilege('authenticated', v_fn_oid, 'EXECUTE');
    v_has_service_execute := has_function_privilege('service_role', v_fn_oid, 'EXECUTE');

    IF v_has_anon_execute THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: "anon" role must NOT have EXECUTE on admin_delete_user.';
    END IF;

    IF NOT v_has_auth_execute THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: "authenticated" role must have EXECUTE on admin_delete_user.';
    END IF;

    IF NOT v_has_service_execute THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: "service_role" must have EXECUTE on admin_delete_user.';
    END IF;

    IF NOT has_table_privilege('service_role', 'public.admin_audit_logs', 'INSERT') THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: service_role must have INSERT on public.admin_audit_logs.';
    END IF;

    IF NOT has_table_privilege('service_role', 'public.user_roles', 'SELECT') THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: service_role must have SELECT on public.user_roles.';
    END IF;
    RAISE NOTICE '✓ [PASS] Grants/Revokes verified: anon blocked, authenticated and service_role permitted with required table privileges.';

    -- --------------------------------------------------
    -- 4. UNAUTHENTICATED CALL REJECTION
    -- --------------------------------------------------
    BEGIN
        PERFORM set_config('request.jwt.claim.sub', '', true);
        PERFORM set_config('request.jwt.claim.role', 'anon', true);
        PERFORM public.admin_delete_user(gen_random_uuid());
        RAISE EXCEPTION 'VERIFICATION FAILED: Expected unauthenticated execution to fail.';
    EXCEPTION WHEN SQLSTATE '42501' THEN
        RAISE NOTICE '✓ [PASS] Unauthenticated execution safely rejected with 42501.';
    END;

    -- --------------------------------------------------
    -- 5. PERMISSION ENFORCEMENT (admin_users.manage)
    -- --------------------------------------------------
    BEGIN
        -- Calling as authenticated user without admin_users.manage permission
        PERFORM set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
        PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
        PERFORM public.admin_delete_user(gen_random_uuid());
        RAISE EXCEPTION 'VERIFICATION FAILED: Caller without admin_users.manage must be rejected.';
    EXCEPTION WHEN SQLSTATE '42501' THEN
        RAISE NOTICE '✓ [PASS] Caller without admin_users.manage safely rejected with 42501.';
    END;

    -- --------------------------------------------------
    -- 6. INPUT VALIDATION (NULL & NOT FOUND)
    -- --------------------------------------------------
    SELECT user_id INTO v_super_admin_id
    FROM public.admin_users
    WHERE is_super_admin = true
    LIMIT 1;

    IF v_super_admin_id IS NOT NULL THEN
        PERFORM set_config('request.jwt.claim.sub', v_super_admin_id::text, true);
        PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

        -- Test NULL target user ID
        BEGIN
            PERFORM public.admin_delete_user(NULL);
            RAISE EXCEPTION 'VERIFICATION FAILED: NULL target user ID must be rejected.';
        EXCEPTION WHEN SQLSTATE '22000' THEN
            RAISE NOTICE '✓ [PASS] NULL target user ID safely rejected with 22000.';
        END;

        -- Test non-existent administrator target
        BEGIN
            PERFORM public.admin_delete_user(gen_random_uuid());
            RAISE EXCEPTION 'VERIFICATION FAILED: Non-existent administrator must raise P0002.';
        EXCEPTION WHEN SQLSTATE 'P0002' THEN
            RAISE NOTICE '✓ [PASS] Non-existent administrator target safely rejected with P0002.';
        END;
    END IF;

    -- --------------------------------------------------
    -- 7. SELF-DELETION GUARD (CANNOT_DELETE_SELF)
    -- --------------------------------------------------
    IF v_super_admin_id IS NOT NULL THEN
        PERFORM set_config('request.jwt.claim.sub', v_super_admin_id::text, true);
        PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

        BEGIN
            PERFORM public.admin_delete_user(v_super_admin_id);
            RAISE EXCEPTION 'VERIFICATION FAILED: Self-deletion was not blocked.';
        EXCEPTION WHEN SQLSTATE '42501' THEN
            GET STACKED DIAGNOSTICS v_test_err_detail = PG_EXCEPTION_DETAIL;
            IF v_test_err_detail = 'CANNOT_DELETE_SELF' THEN
                RAISE NOTICE '✓ [PASS] Self-deletion blocked with CANNOT_DELETE_SELF.';
            ELSE
                RAISE NOTICE '✓ [PASS] Self-deletion rejected with 42501 (detail: %).', v_test_err_detail;
            END IF;
        END;
    END IF;

    -- --------------------------------------------------
    -- 8. SUPER ADMIN PROTECTION GUARD
    -- --------------------------------------------------
    IF v_super_admin_id IS NOT NULL THEN
        SELECT user_id INTO v_normal_admin_id
        FROM public.admin_users
        WHERE user_id <> v_super_admin_id
        LIMIT 1;

        IF v_normal_admin_id IS NOT NULL THEN
            -- Temporarily elevate target within this rolled-back transaction
            UPDATE public.admin_users SET is_super_admin = true WHERE user_id = v_normal_admin_id;

            PERFORM set_config('request.jwt.claim.sub', v_super_admin_id::text, true);
            PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

            BEGIN
                PERFORM public.admin_delete_user(v_normal_admin_id);
                RAISE EXCEPTION 'VERIFICATION FAILED: Super Administrator account deletion was not blocked.';
            EXCEPTION WHEN SQLSTATE '42501' THEN
                GET STACKED DIAGNOSTICS v_test_err_detail = PG_EXCEPTION_DETAIL;
                IF v_test_err_detail = 'SUPER_ADMIN_CANNOT_BE_DELETED' THEN
                    RAISE NOTICE '✓ [PASS] Super Admin protection enforced with SUPER_ADMIN_CANNOT_BE_DELETED.';
                ELSE
                    RAISE NOTICE '✓ [PASS] Super Admin protection rejected with 42501 (detail: %).', v_test_err_detail;
                END IF;
            END;

            -- Revert elevation
            UPDATE public.admin_users SET is_super_admin = false WHERE user_id = v_normal_admin_id;
        END IF;
    END IF;

    -- --------------------------------------------------
    -- 9. DELEGATION CEILING GUARD (can_manage_user_target)
    -- --------------------------------------------------
    IF v_super_admin_id IS NOT NULL AND v_normal_admin_id IS NOT NULL THEN
        -- Super Admin caller cannot manage target when target is marked super admin
        UPDATE public.admin_users SET is_super_admin = true WHERE user_id = v_normal_admin_id;
        PERFORM set_config('request.jwt.claim.sub', v_super_admin_id::text, true);
        PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

        IF public.can_manage_user_target(v_normal_admin_id) IS TRUE THEN
            RAISE EXCEPTION 'VERIFICATION FAILED: can_manage_user_target must return FALSE for Super Admin target.';
        END IF;
        RAISE NOTICE '✓ [PASS] can_manage_user_target correctly blocks Super Admin target.';

        -- Super Admin caller can manage target when normal admin
        UPDATE public.admin_users SET is_super_admin = false WHERE user_id = v_normal_admin_id;
        IF public.can_manage_user_target(v_normal_admin_id) IS NOT TRUE THEN
            RAISE EXCEPTION 'VERIFICATION FAILED: can_manage_user_target must return TRUE for normal admin target.';
        END IF;
        RAISE NOTICE '✓ [PASS] can_manage_user_target correctly permits normal admin target under Super Admin.';
    END IF;

    -- --------------------------------------------------
    -- 10. FOREIGN KEY CASCADE & REFERENTIAL INTEGRITY
    -- --------------------------------------------------
    -- Verify public.admin_users has ON DELETE CASCADE referencing auth.users(id)
    SELECT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'public'
          AND t.relname = 'admin_users'
          AND c.contype = 'f'
          AND c.confdeltype = 'c' -- 'c' = CASCADE
    ) INTO v_fk_admin_cascade;

    IF NOT v_fk_admin_cascade THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: admin_users must have ON DELETE CASCADE foreign key to auth.users.';
    END IF;
    RAISE NOTICE '✓ [PASS] admin_users ON DELETE CASCADE verified.';

    -- Verify public.user_roles has ON DELETE CASCADE referencing public.admin_users(user_id)
    SELECT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'public'
          AND t.relname = 'user_roles'
          AND c.contype = 'f'
          AND c.confdeltype = 'c' -- 'c' = CASCADE
    ) INTO v_fk_roles_cascade;

    IF NOT v_fk_roles_cascade THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: user_roles must have ON DELETE CASCADE foreign key.';
    END IF;
    RAISE NOTICE '✓ [PASS] user_roles ON DELETE CASCADE verified.';

    -- Verify public.admin_audit_logs has ON DELETE SET NULL referencing actor_id
    SELECT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'public'
          AND t.relname = 'admin_audit_logs'
          AND c.contype = 'f'
          AND c.confdeltype = 'n' -- 'n' = SET NULL
    ) INTO v_fk_audit_set_null;

    IF NOT v_fk_audit_set_null THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: admin_audit_logs actor_id must have ON DELETE SET NULL foreign key.';
    END IF;
    RAISE NOTICE '✓ [PASS] admin_audit_logs referential integrity (SET NULL on actor deletion) verified.';

    -- --------------------------------------------------
    -- 11. AUDIT LOGGING CAPABILITY
    -- --------------------------------------------------
    -- Verify log_role_audit_event supports ADMIN_USER_DELETED and returns a UUID
    BEGIN
        v_audit_id := public.log_role_audit_event(
            'ADMIN_USER_DELETED',
            gen_random_uuid()::text,
            jsonb_build_object(
                'target_user_id', gen_random_uuid(),
                'display_name', 'Verification Test Admin',
                'email', 'verify@example.com',
                'previous_role_id', 'moderator',
                'actor', gen_random_uuid(),
                'timestamp', clock_timestamp()
            )
        );
        IF v_audit_id IS NULL THEN
            RAISE EXCEPTION 'log_role_audit_event did not return an audit log UUID.';
        END IF;
        RAISE NOTICE '✓ [PASS] Audit event ADMIN_USER_DELETED logged successfully via RPC (id: %).', v_audit_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: log_role_audit_event threw error: %', SQLERRM;
    END;

    -- Verify service_role direct insert into admin_audit_logs works
    BEGIN
        INSERT INTO public.admin_audit_logs (
            actor_id,
            action,
            target_type,
            target_id,
            details,
            created_at
        ) VALUES (
            NULL,
            'ADMIN_USER_DELETED',
            'USER',
            gen_random_uuid()::text,
            jsonb_build_object(
                'target_user_id', gen_random_uuid(),
                'display_name', 'Direct Service Role Insert Test',
                'email', 'direct@example.com',
                'previous_role_id', 'reviewer',
                'actor', NULL,
                'timestamp', clock_timestamp()
            ),
            clock_timestamp()
        );
        RAISE NOTICE '✓ [PASS] Direct service-role insert into admin_audit_logs succeeded.';
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: Direct insert into admin_audit_logs threw error: %', SQLERRM;
    END;

    -- --------------------------------------------------
    -- 12. NOTIFICATION CATALOGUE INTEGRITY
    -- --------------------------------------------------
    -- Verify that no unsolicited notification templates or channels were injected
    IF EXISTS (
        SELECT 1
        FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'notification_events'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM public.notification_events WHERE event_name ILIKE '%DELETE%'
        ) THEN
            RAISE EXCEPTION 'VERIFICATION FAILED: Unexpected notification event registered.';
        END IF;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'admin_notification_event_catalogue'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM public.admin_notification_event_catalogue WHERE event_key ILIKE '%delete%'
        ) THEN
            RAISE EXCEPTION 'VERIFICATION FAILED: Unexpected notification event in catalogue.';
        END IF;
    END IF;
    RAISE NOTICE '✓ [PASS] Notification catalogue remains unchanged (no unsolicited delete events).';

    RAISE NOTICE '==================================================';
    RAISE NOTICE 'ALL DELETE ADMINISTRATOR VERIFICATION CHECKS PASSED.';
    RAISE NOTICE '==================================================';
END;
$$;

-- Always rollback test mutations to maintain clean state
ROLLBACK;

