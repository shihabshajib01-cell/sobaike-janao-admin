-- ==============================================================================
-- SOBAIKE JANAO ADMIN — PHASE 3B: NON-DESTRUCTIVE DATABASE AUDIT SCRIPT
-- ==============================================================================
-- Repository: shihabshajib01-cell/sobaike-janao-admin
-- Target: Supabase PostgreSQL Database
-- Purpose: Read-only inspection of existing public.admin_users schema, RLS policies,
--          RPC security definer status, constraints, and tables before applying RBAC.
-- Safe: Performs ONLY SELECT queries against information_schema and pg_catalog.
-- ==============================================================================

-- 1. Check existing columns of public.admin_users
SELECT 
    table_schema,
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'admin_users'
ORDER BY ordinal_position;

-- 2. Check primary keys, unique constraints, and foreign keys on public.admin_users
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public' 
  AND tc.table_name = 'admin_users';

-- 3. Check Row-Level Security (RLS) status on public.admin_users and related tables
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('admin_users', 'roles', 'permissions', 'role_permissions', 'user_roles', 'admin_audit_logs', 'complaints');

-- 4. Check existing RLS policies on public.admin_users
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'admin_users';

-- 5. Check existing grants on public.admin_users
SELECT 
    grantee,
    table_schema,
    table_name,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'admin_users';

-- 6. Check existing Moderation RPC functions and their security context (SECURITY DEFINER / INVOKER)
SELECT 
    n.nspname AS schema_name,
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS arguments,
    CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END AS security_type,
    p.proleakproof AS is_leakproof,
    pg_get_userbyid(p.proowner) AS owner
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'admin_publish_complaint',
    'admin_unpublish_complaint',
    'admin_reject_complaint',
    'is_active_admin',
    'has_permission'
  );

-- 7. Check if any RBAC tables already exist
SELECT 
    table_schema,
    table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'roles',
    'permissions',
    'role_permissions',
    'user_roles',
    'admin_audit_logs'
  );
