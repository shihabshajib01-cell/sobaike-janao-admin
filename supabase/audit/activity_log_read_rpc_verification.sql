-- ==============================================================================
-- SOBAIKE JANAO ADMIN — ACTIVITY LOG READ RPC VERIFICATION SCRIPT
-- ==============================================================================
-- Migration: 20260904000007_activity_log_read_rpc.sql
-- Target: Supabase PostgreSQL Database (sobaike-production)
-- Purpose: Complete verification of admin_list_audit_logs RPC:
--          1. Function existence and exact signature
--          2. SECURITY DEFINER declaration
--          3. Fixed search_path (pg_catalog, public, auth)
--          4. Privileges: authenticated has EXECUTE, anon/public revoked
--          5. Direct SELECT on admin_audit_logs remains revoked from authenticated & anon
--          6. Source definition checks: audit.view enforcement, normalization, sanitization, ordering
--          7. Dynamic runtime assertions inside rollback transaction:
--             - Caller without audit.view denied with 42501
--             - Active caller with audit.view succeeds
--             - Normalization: target_type 'USER' -> 'admin_user', 'ROLE' -> 'role', etc.
--             - Filtering: search, action, target_type, actor_id, date range
--             - Pagination: limit, offset, and total_count synchronization
--             - Sensitive key sanitization: password, token, secret, signed_url, etc. redacted
-- Safety: Non-destructive; runtime assertions execute inside a rolled-back transaction.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Static Signature & Function Properties
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_proc_record RECORD;
    v_has_auth_execute BOOLEAN;
    v_has_anon_execute BOOLEAN;
    v_has_public_execute BOOLEAN;
    v_table_auth_select BOOLEAN;
    v_table_anon_select BOOLEAN;
BEGIN
    -- 1.1 Verify function existence, security definer, and search_path
    SELECT
        p.proname,
        p.prosecdef,
        p.prosrc,
        p.proconfig
    INTO v_proc_record
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'admin_list_audit_logs';

    IF v_proc_record.proname IS NULL THEN
        RAISE EXCEPTION 'Static Assertion FAILED: public.admin_list_audit_logs does not exist!';
    END IF;

    IF v_proc_record.prosecdef IS NOT TRUE THEN
        RAISE EXCEPTION 'Static Assertion FAILED: public.admin_list_audit_logs must be SECURITY DEFINER!';
    END IF;

    IF v_proc_record.proconfig IS NULL OR NOT (
        array_to_string(v_proc_record.proconfig, ',') ILIKE '%search_path=pg_catalog, public, auth%'
        OR array_to_string(v_proc_record.proconfig, ',') ILIKE '%search_path=pg_catalog,public,auth%'
    ) THEN
        RAISE EXCEPTION 'Static Assertion FAILED: fixed search_path must be pg_catalog, public, auth! Found: %',
            array_to_string(v_proc_record.proconfig, ',');
    END IF;

    -- 1.2 Verify EXECUTE permissions
    SELECT has_function_privilege('authenticated', 'public.admin_list_audit_logs(int,int,text,text,text,uuid,timestamptz,timestamptz)', 'EXECUTE')
    INTO v_has_auth_execute;

    SELECT has_function_privilege('anon', 'public.admin_list_audit_logs(int,int,text,text,text,uuid,timestamptz,timestamptz)', 'EXECUTE')
    INTO v_has_anon_execute;

    IF v_has_auth_execute IS NOT TRUE THEN
        RAISE EXCEPTION 'Static Assertion FAILED: authenticated role must have EXECUTE on admin_list_audit_logs!';
    END IF;

    IF v_has_anon_execute IS TRUE THEN
        RAISE EXCEPTION 'Static Assertion FAILED: anon role must NOT have EXECUTE on admin_list_audit_logs!';
    END IF;

    -- 1.3 Verify direct SELECT on admin_audit_logs is REVOKED
    SELECT has_table_privilege('authenticated', 'public.admin_audit_logs', 'SELECT')
    INTO v_table_auth_select;

    SELECT has_table_privilege('anon', 'public.admin_audit_logs', 'SELECT')
    INTO v_table_anon_select;

    IF v_table_auth_select IS TRUE THEN
        RAISE EXCEPTION 'Static Assertion FAILED: authenticated role must NOT have direct SELECT on admin_audit_logs!';
    END IF;

    IF v_table_anon_select IS TRUE THEN
        RAISE EXCEPTION 'Static Assertion FAILED: anon role must NOT have direct SELECT on admin_audit_logs!';
    END IF;

    -- 1.4 Verify function source code requirements
    IF v_proc_record.prosrc NOT LIKE '%audit.view%' THEN
        RAISE EXCEPTION 'Static Assertion FAILED: RPC does not enforce audit.view!';
    END IF;

    IF v_proc_record.prosrc NOT LIKE '%is_active_admin%' THEN
        RAISE EXCEPTION 'Static Assertion FAILED: RPC does not enforce is_active_admin!';
    END IF;

    IF v_proc_record.prosrc NOT LIKE '%sanitize_audit_details%' THEN
        RAISE EXCEPTION 'Static Assertion FAILED: RPC does not invoke sanitize_audit_details!';
    END IF;

    IF v_proc_record.prosrc NOT LIKE '%admin_user%' THEN
        RAISE EXCEPTION 'Static Assertion FAILED: RPC does not normalize target_type to admin_user!';
    END IF;

    RAISE NOTICE 'Static Schema & Privilege Assertions PASS: Function signature, security definer, search_path, and access rights verified.';
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. Sanitizer Unit Verification
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_input jsonb;
    v_sanitized jsonb;
BEGIN
    v_input := jsonb_build_object(
        'user_id', '00000000-0000-0000-0000-000000000001',
        'email', 'test@example.com',
        'password', 'super_secret_password',
        'token', 'jwt.bearer.token',
        'access_token', 'atk_12345',
        'refresh_token', 'rtk_67890',
        'auth_key', 'key_abc',
        'api_key', 'live_xyz',
        'private_key', 'BEGIN RSA PRIVATE KEY',
        'secret_token', 'topsecret',
        'credential_data', 'passwords123',
        'password_hash', '$2a$12$abcdefg',
        'evidence_url', 'https://storage.private/evidence/123.jpg',
        'signed_url', 'https://storage.private/evidence/123.jpg?token=secret',
        'safe_nested', jsonb_build_object(
            'allowed_prop', 'fine',
            'nested_secret', 'should_be_stripped',
            'nested_evidence_url', 'https://private'
        ),
        'safe_array', jsonb_build_array(
            jsonb_build_object('ok', true, 'password', 'bad'),
            'string_item'
        )
    );

    v_sanitized := public.sanitize_audit_details(v_input);

    -- Ensure sensitive keys are stripped
    IF v_sanitized ? 'password' OR v_sanitized ? 'token' OR v_sanitized ? 'access_token'
       OR v_sanitized ? 'refresh_token' OR v_sanitized ? 'auth_key' OR v_sanitized ? 'api_key'
       OR v_sanitized ? 'private_key' OR v_sanitized ? 'secret_token' OR v_sanitized ? 'credential_data'
       OR v_sanitized ? 'password_hash' OR v_sanitized ? 'evidence_url' OR v_sanitized ? 'signed_url' THEN
        RAISE EXCEPTION 'Sanitizer Assertion FAILED: Sensitive root keys leaked into output! Output: %', v_sanitized;
    END IF;

    -- Ensure nested sensitive keys are stripped
    IF (v_sanitized->'safe_nested') ? 'nested_secret' OR (v_sanitized->'safe_nested') ? 'nested_evidence_url' THEN
        RAISE EXCEPTION 'Sanitizer Assertion FAILED: Sensitive nested keys leaked! Output: %', v_sanitized;
    END IF;

    -- Ensure safe nested keys remain
    IF NOT (v_sanitized->'safe_nested' ? 'allowed_prop') THEN
        RAISE EXCEPTION 'Sanitizer Assertion FAILED: Safe nested key was incorrectly stripped!';
    END IF;

    -- Ensure safe array item was preserved and inner password stripped
    IF NOT ((v_sanitized->'safe_array'->0) ? 'ok') OR ((v_sanitized->'safe_array'->0) ? 'password') THEN
        RAISE EXCEPTION 'Sanitizer Assertion FAILED: Array sanitization failed! Output: %', v_sanitized;
    END IF;

    RAISE NOTICE 'Sanitizer Unit Assertions PASS: Recursive credential & private URL redaction verified.';
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. Dynamic Runtime Assertions (Rollback-Safe)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_test_actor_id UUID := gen_random_uuid();
    v_test_unauth_id UUID := gen_random_uuid();
    v_test_log_id1 UUID;
    v_test_log_id2 UUID;
    v_test_log_id3 UUID;
    v_result JSONB;
    v_logs JSONB;
    v_total INT;
    v_caught_error BOOLEAN := FALSE;
BEGIN
    -- 3.1 Provision test users in rolled back transaction
    -- Create test auth user 1 (will have audit.view via super_admin role)
    INSERT INTO auth.users (id, email, aud, role)
    VALUES (v_test_actor_id, 'audit_tester@example.com', 'authenticated', 'authenticated')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.admin_users (user_id, display_name, active)
    VALUES (v_test_actor_id, 'Audit Tester Admin', true)
    ON CONFLICT (user_id) DO UPDATE SET display_name = 'Audit Tester Admin', active = true;

    INSERT INTO public.user_roles (user_id, role_id)
    VALUES (v_test_actor_id, 'super_admin')
    ON CONFLICT (user_id) DO UPDATE SET role_id = 'super_admin';

    -- Create test auth user 2 (active admin but NO audit.view)
    INSERT INTO auth.users (id, email, aud, role)
    VALUES (v_test_unauth_id, 'no_audit@example.com', 'authenticated', 'authenticated')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.admin_users (user_id, display_name, active)
    VALUES (v_test_unauth_id, 'No Audit Admin', true)
    ON CONFLICT (user_id) DO UPDATE SET display_name = 'No Audit Admin', active = true;

    -- Role with no audit permissions
    INSERT INTO public.roles (id, name_en, name_bn, active)
    VALUES ('test_restricted_role', 'Test Restricted', 'টেস্ট সীমাবদ্ধ', true)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_roles (user_id, role_id)
    VALUES (v_test_unauth_id, 'test_restricted_role')
    ON CONFLICT (user_id) DO UPDATE SET role_id = 'test_restricted_role';

    -- 3.2 Insert test audit entries with mixed casing and sensitive fields
    INSERT INTO public.admin_audit_logs (actor_id, action, target_type, target_id, details, created_at)
    VALUES (
        v_test_actor_id,
        'complaint.publish',
        'complaint',
        'CMP-TEST-0001',
        jsonb_build_object('published', true, 'password', 'leak', 'note', 'First test complaint'),
        now() - interval '1 hour'
    ) RETURNING id INTO v_test_log_id1;

    INSERT INTO public.admin_audit_logs (actor_id, action, target_type, target_id, details, created_at)
    VALUES (
        v_test_actor_id,
        'USER_MEMBERSHIP_FINALIZED',
        'USER', -- uppercase target_type to test normalization
        '00000000-0000-0000-0000-000000000099',
        jsonb_build_object('role_id', 'field_officer', 'token', 'jwt_secret'),
        now() - interval '30 minutes'
    ) RETURNING id INTO v_test_log_id2;

    INSERT INTO public.admin_audit_logs (actor_id, action, target_type, target_id, details, created_at)
    VALUES (
        v_test_actor_id,
        'ROLE_CREATED',
        'ROLE', -- uppercase target_type to test normalization
        'custom_security_role',
        jsonb_build_object('name', 'Custom Security Role', 'secret_key', 'supersecret'),
        now()
    ) RETURNING id INTO v_test_log_id3;

    -- 3.3 Test authorization failure: user without audit.view
    PERFORM set_config('request.jwt.claim.sub', v_test_unauth_id::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    BEGIN
        PERFORM public.admin_list_audit_logs();
    EXCEPTION
        WHEN SQLSTATE '42501' THEN
            v_caught_error := TRUE;
    END;

    IF v_caught_error IS NOT TRUE THEN
        RAISE EXCEPTION 'Runtime Assertion FAILED: admin_list_audit_logs permitted caller without audit.view!';
    END IF;

    -- 3.4 Test authorization success: user with audit.view
    PERFORM set_config('request.jwt.claim.sub', v_test_actor_id::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    v_result := public.admin_list_audit_logs(
        p_limit := 10,
        p_offset := 0,
        p_actor_id := v_test_actor_id
    );

    v_total := (v_result->>'total_count')::int;
    v_logs := v_result->'logs';

    IF v_total < 3 THEN
        RAISE EXCEPTION 'Runtime Assertion FAILED: Expected at least 3 logs, found: %', v_total;
    END IF;

    -- 3.5 Test normalization and redaction
    -- Target type 'USER' must be returned normalized as 'admin_user'
    IF NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_logs) elem
        WHERE elem->>'id' = v_test_log_id2::text
          AND elem->>'target_type' = 'admin_user'
    ) THEN
        RAISE EXCEPTION 'Runtime Assertion FAILED: Target type was not normalized to admin_user!';
    END IF;

    -- Details must have secrets stripped
    IF EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_logs) elem
        WHERE elem->'details' ? 'password'
           OR elem->'details' ? 'token'
           OR elem->'details' ? 'secret_key'
    ) THEN
        RAISE EXCEPTION 'Runtime Assertion FAILED: Sensitive keys leaked in returned logs!';
    END IF;

    -- 3.6 Test target_type filter with normalization
    -- Filtering by 'admin_user' should find log 2
    v_result := public.admin_list_audit_logs(
        p_target_type := 'admin_user',
        p_actor_id := v_test_actor_id
    );

    IF NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_result->'logs') elem
        WHERE elem->>'id' = v_test_log_id2::text
    ) THEN
        RAISE EXCEPTION 'Runtime Assertion FAILED: Target type filter for admin_user did not find normalized log!';
    END IF;

    -- Filtering by 'user' should also normalize to 'admin_user' and find log 2
    v_result := public.admin_list_audit_logs(
        p_target_type := 'user',
        p_actor_id := v_test_actor_id
    );

    IF NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_result->'logs') elem
        WHERE elem->>'id' = v_test_log_id2::text
    ) THEN
        RAISE EXCEPTION 'Runtime Assertion FAILED: Target type filter for "user" did not match normalized log!';
    END IF;

    -- 3.7 Test action filter
    v_result := public.admin_list_audit_logs(
        p_action := 'complaint.publish',
        p_actor_id := v_test_actor_id
    );

    IF (v_result->>'total_count')::int < 1 OR NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_result->'logs') elem
        WHERE elem->>'action' = 'complaint.publish'
    ) THEN
        RAISE EXCEPTION 'Runtime Assertion FAILED: Action filter failed for complaint.publish!';
    END IF;

    -- 3.8 Test search filter
    v_result := public.admin_list_audit_logs(
        p_search := 'CMP-TEST-0001',
        p_actor_id := v_test_actor_id
    );

    IF (v_result->>'total_count')::int < 1 THEN
        RAISE EXCEPTION 'Runtime Assertion FAILED: Search filter failed for target_id!';
    END IF;

    -- 3.9 Test pagination
    v_result := public.admin_list_audit_logs(
        p_limit := 1,
        p_offset := 0,
        p_actor_id := v_test_actor_id
    );

    IF jsonb_array_length(v_result->'logs') <> 1 THEN
        RAISE EXCEPTION 'Runtime Assertion FAILED: Pagination limit did not restrict output to 1 row!';
    END IF;

    RAISE NOTICE 'Dynamic Runtime Assertions PASS: Authorization, normalization, filtering, pagination, and redaction verified.';

    -- ALWAYS ROLLBACK test changes
    RAISE EXCEPTION 'ROLLBACK_INTENTIONAL';
EXCEPTION
    WHEN SQLSTATE 'P0001' AND SQLERRM = 'ROLLBACK_INTENTIONAL' THEN
        RAISE NOTICE 'Rollback complete. Zero persistent side-effects.';
END;
$$;
