-- ==============================================================================
-- SOBAIKE JANAO ADMIN — PHASE 3C: ROLE MANAGEMENT BACKEND VERIFICATION SCRIPT
-- ==============================================================================
-- Repository: shihabshajib01-cell/sobaike-janao-admin
-- Target: Supabase PostgreSQL Database (sobaike-production)
-- Purpose: Read-only verification of Role Management RPCs, helper functions,
--          security modes, and execute privileges.
-- Safety: Non-destructive, read-only.
-- ==============================================================================

-- 1. Check RPC function definitions and SECURITY DEFINER status
SELECT 
    n.nspname AS schema_name,
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS arguments,
    CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END AS security_type,
    p.provolatile AS volatility,
    pg_get_userbyid(p.proowner) AS owner
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'has_permission',
    'can_manage_roles',
    'generate_role_slug',
    'admin_get_permission_catalogue',
    'admin_list_roles',
    'admin_get_role_detail',
    'admin_create_role',
    'admin_update_role',
    'admin_replace_role_permissions'
  )
ORDER BY p.proname;

-- 2. Check execute grants on the new RPCs (anon must be revoked, authenticated granted)
SELECT 
    routine_schema,
    routine_name,
    grantee,
    privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name IN (
    'has_permission',
    'can_manage_roles',
    'generate_role_slug',
    'admin_get_permission_catalogue',
    'admin_list_roles',
    'admin_get_role_detail',
    'admin_create_role',
    'admin_update_role',
    'admin_replace_role_permissions'
  )
  AND grantee IN ('anon', 'authenticated', 'PUBLIC')
ORDER BY routine_name, grantee;

-- 3. Check current user_roles assignment count to verify bootstrap mode
SELECT 
    COUNT(*) AS total_user_roles_assignments,
    CASE 
        WHEN COUNT(*) = 0 THEN 'BOOTSTRAP MODE (Active Admin can create initial roles)'
        ELSE 'NORMAL RBAC MODE (requires roles.manage permission)'
    END AS current_role_management_mode
FROM public.user_roles;

-- 4. Check canonical permissions count in database (expecting 15)
SELECT 
    COUNT(*) AS total_permissions,
    ARRAY_AGG(id ORDER BY id) AS permission_ids
FROM public.permissions;
