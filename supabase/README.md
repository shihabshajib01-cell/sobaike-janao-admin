# Sobaike Janao Admin — Supabase Migrations & Backend Architecture

## Overview

This directory contains the database migrations, audit scripts, and security definitions for the **Sobaike Janao Admin Panel**.

---

## Migration Sequence

1. **`20260902000000_phase3b_rbac_foundation.sql`**
   - **Phase:** 3B Base Schema Foundation
   - **Contents:** Creates relational RBAC tables (`roles`, `permissions`, `role_permissions`, `user_roles`, `admin_audit_logs`), seeds 15 canonical permissions, and establishes restrictive Row-Level Security (RLS) policies.

2. **`20260902000001_phase3b_rbac_correction.sql`**
   - **Phase:** 3B Forward Correction
   - **Contents:** Adds `public.roles.active` (BOOLEAN NOT NULL DEFAULT true) and `public.admin_users.display_name` (TEXT NULL), tightens self-read RLS policies on `admin_users` and `user_roles`, revokes direct client table SELECT on `admin_audit_logs`, and ensures `ON CONFLICT (id) DO NOTHING` for permission seeding.

3. **`20260902000002_phase3b_privilege_hardening.sql`**
   - **Phase:** 3B Defense-in-Depth Hardening
   - **Contents:** Explicitly revokes `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, `TRIGGER` privileges on all RBAC & admin security tables from `authenticated` and `anon`.

4. **`20260902000003_phase3c_role_management_backend.sql`**
   - **Phase:** Role Management Phase 1 (Secure RPC Backend)
   - **Contents:** 
     - Reusable permission check: `public.has_permission(p_permission_id)`
     - Bootstrap authorization resolver: `public.can_manage_roles()`
       - *Bootstrap Mode (`COUNT(user_roles) = 0`):* Any active administrator can create/update roles.
       - *Normal Mode (`COUNT(user_roles) > 0`):* Requires active administrator status AND effective `roles.manage` permission.
     - Role slug generator: `public.generate_role_slug(p_name)`
     - Read RPCs: `public.admin_list_roles()`, `public.admin_get_role_detail()`, `public.admin_get_permission_catalogue()`
     - Write RPCs (Atomic, Audited, Strict Validation):
       - `public.admin_create_role(p_name, p_active, p_permission_ids, p_description)`
       - `public.admin_update_role(p_role_id, p_name, p_active, p_permission_ids, p_description)`
       - `public.admin_replace_role_permissions(p_role_id, p_permission_ids)`

---

## Role Management Backend API Specification

| RPC Function | Type | Parameters | Access Requirement | Description |
| :--- | :--- | :--- | :--- | :--- |
| `public.admin_get_permission_catalogue()` | STABLE | *(none)* | `can_manage_roles()` | Returns 15 canonical permissions sorted by module & action. |
| `public.admin_list_roles()` | STABLE | *(none)* | `can_manage_roles()` | Returns role summaries with permission counts and assigned user counts. |
| `public.admin_get_role_detail(p_role_id)` | STABLE | `p_role_id: text` | `can_manage_roles()` | Returns full role detail, assigned permission IDs array, and user count. |
| `public.admin_create_role(...)` | VOLATILE | `p_name: text, p_active: boolean, p_permission_ids: text[], p_description: text` | `can_manage_roles()` | Atomically creates role, inserts mappings, records audit log, and returns created role JSON. Enforces case-insensitive uniqueness on visible name. |
| `public.admin_update_role(...)` | VOLATILE | `p_role_id: text, p_name: text, p_active: boolean, p_permission_ids: text[], p_description: text` | `can_manage_roles()` | Updates role name, active state, description, and atomically replaces permission mappings if provided. Technical ID remains immutable. Rejects duplicate visible names. |
| `public.admin_replace_role_permissions(...)` | VOLATILE | `p_role_id: text, p_permission_ids: text[]` | `can_manage_roles()` | Dedicated atomic RPC to replace a role's permission set with audit logging. |

---

## Security Boundaries

1. **Direct Table Mutations:** Direct browser `INSERT`, `UPDATE`, `DELETE` operations on `roles`, `role_permissions`, `permissions`, `user_roles`, `admin_users`, and `admin_audit_logs` remain strictly revoked. All writes are mediated via `SECURITY DEFINER` RPCs.
2. **Anonymous Access:** Revoked across all RBAC tables and RPC functions.
3. **Role ID Stability:** Role technical IDs (e.g. `admin-2`, `moderator`) are generated upon creation and remain immutable on subsequent role renames.
4. **Permission Set Validation:** RPCs reject unknown permission identifiers with clear transaction rollbacks (`22000`).
5. **Audit Logging:** Every role creation and update writes an immutable event into `public.admin_audit_logs` with the authenticated `actor_id` (`auth.uid()`).
6. **No Service Role or Edge Functions in Client:** Zero secret keys in client bundles.

---

## Verification & Audit Scripts

- `supabase/audit/phase_3b_database_inspection.sql` — Schema and table constraint inspection (safe pre- and post-migration).
- `supabase/audit/phase_3c_role_backend_verification.sql` — Verifies Role Management RPCs, function security definer modes, and execution grants.
