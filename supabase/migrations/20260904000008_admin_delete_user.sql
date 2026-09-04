-- ==============================================================================
-- Migration: 20260904000008_admin_delete_user.sql
-- Description: Phase 4B — Authoritative Safe Administrator Deletion RPC
--
-- Key Capabilities:
-- 1. Transaction-level serialization via pg_advisory_xact_lock
-- 2. Strict caller authorization (is_active_admin, admin_users.manage)
-- 3. Self-deletion prevention (administrators cannot delete themselves)
-- 4. Super Admin immutability (cannot be deleted by anyone)
-- 5. Strict delegation ceiling enforcement via public.can_manage_user_target
-- 6. Last role manager / active admin preservation via count_effective_role_managers()
-- 7. Complete non-orphaning cleanup with cascade of user_roles & notifications
-- 8. Authoritative audit event production (ADMIN_USER_DELETED) in public.admin_audit_logs
-- 9. Explicit privilege lockdown (revoked from PUBLIC & anon, granted to authenticated & service_role)
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. AUTHORITATIVE USER DELETION RPC (admin_delete_user)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_delete_user(
    p_target_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_target_admin RECORD;
    v_target_email TEXT;
    v_target_role_id TEXT;
BEGIN
    -- 1. Transaction-level advisory lock to serialize user management mutations
    PERFORM pg_advisory_xact_lock(hashtext('sobaike_user_management_mutation_lock'));

    -- 2. Validate caller authentication
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
    END IF;

    -- 3. Check caller active administrator status
    IF NOT public.is_active_admin() THEN
        RAISE EXCEPTION 'Access denied. Active administrator session required.'
            USING ERRCODE = '42501';
    END IF;

    -- 4. Check caller permission
    IF NOT public.has_permission('admin_users.manage') THEN
        RAISE EXCEPTION 'Access denied. You do not have permission to manage administrative users.'
            USING ERRCODE = '42501';
    END IF;

    -- 5. Validate parameter
    IF p_target_user_id IS NULL THEN
        RAISE EXCEPTION 'A valid target user ID is required.' USING ERRCODE = '22000';
    END IF;

    -- 6. Block self-deletion
    IF p_target_user_id = v_caller_id THEN
        RAISE EXCEPTION 'Self-deletion is not permitted. Administrators cannot delete their own accounts.'
            USING ERRCODE = '42501',
                  DETAIL = 'CANNOT_DELETE_SELF';
    END IF;

    -- 7. Verify target administrator exists
    SELECT user_id, display_name, active, is_super_admin
    INTO v_target_admin
    FROM public.admin_users
    WHERE user_id = p_target_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Administrator account not found.' USING ERRCODE = 'P0002';
    END IF;

    -- 8. Block Super Admin deletion (immutable)
    IF v_target_admin.is_super_admin IS TRUE THEN
        RAISE EXCEPTION 'Protected Super Administrator accounts cannot be deleted.'
            USING ERRCODE = '42501',
                  DETAIL = 'CANNOT_DELETE_SUPER_ADMIN';
    END IF;

    -- 9. Check delegation ceiling
    IF NOT public.can_manage_user_target(p_target_user_id) THEN
        RAISE EXCEPTION 'Access denied. You cannot delete an administrator whose authority or permissions exceed your own ceiling.'
            USING ERRCODE = '42501',
                  DETAIL = 'DELEGATION_CEILING_EXCEEDED';
    END IF;

    -- 10. Fetch target email and role for audit log
    SELECT email INTO v_target_email
    FROM auth.users
    WHERE id = p_target_user_id;

    SELECT role_id INTO v_target_role_id
    FROM public.user_roles
    WHERE user_id = p_target_user_id;

    -- 11. Delete user role and admin profile
    DELETE FROM public.user_roles WHERE user_id = p_target_user_id;
    DELETE FROM public.admin_users WHERE user_id = p_target_user_id;

    -- 12. Safety check: ensure at least one active administrator capable of managing roles remains
    IF public.count_effective_role_managers() = 0 THEN
        RAISE EXCEPTION 'Cannot delete this administrator because doing so would leave no active administrators capable of managing roles.'
            USING ERRCODE = '23514',
                  DETAIL = 'CANNOT_DELETE_LAST_ROLE_MANAGER';
    END IF;

    -- 13. Audit logging: produce real audit event ADMIN_USER_DELETED
    PERFORM public.log_role_audit_event(
        'ADMIN_USER_DELETED',
        p_target_user_id::text,
        jsonb_build_object(
            'target_user_id', p_target_user_id,
            'email', v_target_email,
            'display_name', v_target_admin.display_name,
            'role_id', v_target_role_id,
            'active', v_target_admin.active
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'deleted_user_id', p_target_user_id,
        'email', v_target_email,
        'display_name', v_target_admin.display_name
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. PRIVILEGES & GRANTS
-- ------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.admin_delete_user(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_delete_user(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO service_role;

COMMIT;
