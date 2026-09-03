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

5. **`20260902000007_phase2a_role_backend_safety.sql`**
   - **Phase:** Phase 2A Role Management Backend Safety
   - **Contents:** Introduces `count_effective_role_managers()`, advisory transaction locks, system-role protection, and last-manager protection.

6. **`20260902000008_phase2a_role_update_correction.sql`**
   - **Phase:** Phase 2A Role Update Correction
   - **Contents:** Preserves existing Bengali role names (`name_bn`) during English renames, preserves omitted descriptions, and supports explicit description updates.

7. **`20260903000004_phase2e_dashboard_complaint_read_authorization.sql`**
   - **Phase:** Phase 2E Dashboard & Complaint Read Authorization
   - **Contents:** Enforces Row-Level Security (RLS) on `public.complaints` requiring `complaints.view` for administrative table queries; preserves anonymous public feed (`anon` can read `status = 'published'`); and introduces controlled `SECURITY DEFINER` aggregate RPC `public.admin_get_dashboard_aggregates()` requiring `dashboard.view`.

8. **`20260903000005_phase2e_map_authorization_correction.sql`**
   - **Phase:** Phase 2E Map Authorization Correction
   - **Contents:** Provides controlled `SECURITY DEFINER` RPC `public.admin_get_map_dataset()` requiring active admin session and `map.view` permission; returns sanitized geospatial fields and taxonomy filters; avoids broad complaint table exposure; and idempotently reaffirms explicit RLS policies on `public.complaints`.

9. **`20260903000006_phase2e_map_status_and_navigation_correction.sql`**
   - **Phase:** Phase 2E Map Status Filter & Navigation Correction
   - **Contents:** Updates `public.admin_get_map_dataset()` to filter complaints server-side to supported lifecycle statuses only, and returns server-computed `unsupportedStatusCount` numeric aggregate without returning unsupported row content.

10. **`20260904000001_phase4a_delegation_ceiling_and_scoping.sql`**
    - **Phase:** Phase 4A Authorization Delegation Ceiling & Scoping
    - **Contents:** Enforces server-authoritative delegation ceiling where callers can only grant permissions they effectively possess; enforces target user and role manageability scoping; implements `can_manage_role_scope`, `can_manage_user_target`, and safe role assignment ceilings.

11. **`20260904000002_phase4a_delegation_ceiling_correction.sql`**
    - **Phase:** Phase 4A Delegation Ceiling Parameter Correction
    - **Contents:** Aligns `public.admin_finalize_user_membership` signature defaults (`p_display_name TEXT DEFAULT NULL, p_role_id TEXT DEFAULT NULL, p_active BOOLEAN DEFAULT TRUE`) with production runtime.

12. **`20260904000003_phase2e_edge_function_service_privileges.sql`**
    - **Phase:** Phase 2E Edge Function Service Privileges
    - **Contents:** Grants narrow `USAGE` on schema `public` and `SELECT` on `public.admin_users` and `public.roles` to `service_role` for server-side user provisioning verification.

13. **`20260904000004_notification_foundation.sql`**
    - **Phase:** Notification Project Phase 1 — Notification Backend Foundation & Recipient Engine (Targeted Correction Pass)
    - **Contents:** Establishes canonical notification event catalogue (12 approved keys), per-recipient notifications table with persisted `audience_mode` ('permission', 'super_admin_only', 'personal'), partial unread index, idempotency deduplication, fail-closed server-side recipient resolution (`admin_notification_resolve_recipients`), dedicated read-time authority evaluator (`admin_notification_can_currently_view`) ensuring revoked permissions dynamically hide stale notifications, canonical internal emitter (`admin_emit_notification`) with strict contract validation (SQLSTATE `22000`), and user-facing protected RPCs (`admin_list_notifications`, `admin_get_unread_notification_count`, `admin_mark_notification_read`, `admin_mark_all_notifications_read`) with defense-in-depth RLS.

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
- `supabase/audit/notification_foundation_verification.sql` — Verifies Notification event catalogue keys, tables, RLS policies, execute privileges, and transactional deduplication.
