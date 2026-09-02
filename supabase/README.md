# Sobaike Janao Admin — Phase 3B: Database & RBAC Foundation

## Overview

This directory contains the additive, non-destructive PostgreSQL migration and audit scripts for **Phase 3B (Database & RBAC Foundation)** of the Sobaike Janao Admin Panel.

---

## Files

1. **`supabase/audit/phase_3b_database_inspection.sql`**
   - **Type:** Non-destructive read-only SQL inspection queries (Preflight & Post-migration safe).
   - **Purpose:** Verifies live columns, constraints, foreign keys, RLS status, table grants, and RPC security definitions on `public.admin_users` and related tables before and after applying migrations.
   - **Safety:** Executes cleanly even when RBAC tables do not exist yet. Uses `to_regclass()` and dynamic PL/pgSQL guards.
   - **Execution:** Run in the Supabase SQL Editor.

2. **`supabase/migrations/20260902000000_phase3b_rbac_foundation.sql`**
   - **Type:** Base additive, idempotent database migration.
   - **Purpose:** Creates the relational schema for RBAC (`roles`, `permissions`, `role_permissions`, `user_roles`, `admin_audit_logs`), seeds canonical active permissions, and establishes restrictive Row-Level Security (RLS) policies.

3. **`supabase/migrations/20260902000001_phase3b_rbac_correction.sql`**
   - **Type:** Forward correction migration.
   - **Purpose:** Adds `public.roles.active` (BOOLEAN NOT NULL DEFAULT true) and `public.admin_users.display_name` (TEXT NULL), tightens self-read RLS policies on `admin_users` and `user_roles`, revokes direct client table SELECT on `admin_audit_logs`, and ensures `ON CONFLICT (id) DO NOTHING` for permission seeding.

4. **`supabase/migrations/20260902000002_phase3b_privilege_hardening.sql`**
   - **Type:** Forward privilege hardening migration.
   - **Purpose:** Explicitly revokes `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, `TRIGGER` privileges from `authenticated` and `anon` on all RBAC and security tables (`admin_users`, `roles`, `permissions`, `role_permissions`, `user_roles`, `admin_audit_logs`) for defense-in-depth security.

---

## Target Schema Architecture

```
                      +-------------------+
                      |    auth.users     | (Managed by Supabase Auth)
                      |-------------------|
                      | id (UUID, PK)     |
                      | email (text)      |
                      | encrypted_password|
                      +-------------------+
                                |
                                | 1:1
                                v
+--------------------+        +--------------------+
|       roles        |        |    admin_users     |
|--------------------|        |--------------------|
| id (text, PK)      |        | user_id (UUID, PK) |
| name_en (text)     |        | display_name (text)| (Nullable editable user name)
| name_bn (text)     |        | active (boolean)   | (Platform access gate)
| description (text) |        | created_at (timest)|
| active (boolean)   |        | updated_at (timest)|
| is_system (boolean)|        +--------------------+
| created_at (timest)|                  |
| updated_at (timest)|                  | 1
+--------------------+                  |
        | 1                             |
        |                               | N
        | N                             v
        v                     +--------------------+
+--------------------+        |     user_roles     |
|  role_permissions  |        |--------------------|
|--------------------|        | user_id (FK, PK)   | (UNIQUE 1:1 per admin in Phase 3)
| role_id (FK)       |        | role_id (FK)       |
| permission_id (FK) |        | assigned_by (UUID) |
| created_at (timest)|        | created_at (timest)|
+--------------------+        +--------------------+
        | N
        |
        v 1
+--------------------+
|    permissions     |
|--------------------|
| id (text, PK)      | (e.g. 'complaints.publish')
| module (text)      | (e.g. 'complaints')
| action (text)      | (e.g. 'publish')
| name_en (text)     |
| name_bn (text)     |
| description (text) |
| created_at (timest)|
+--------------------+

+--------------------+
|  admin_audit_logs  |
|--------------------|
| id (UUID, PK)      |
| actor_id (UUID, FK)|
| action (text)      |
| target_type (text) |
| target_id (text)   |
| details (jsonb)    |
| created_at (timest)|
+--------------------+
```

---

## Security Boundaries & Credential Policy

1. **Passwords & Authentication:**
   - Passwords exist ONLY within `auth.users` managed by Supabase Auth.
   - There is **NO** password column in `public.admin_users` or any application table.
   - Passwords must never be stored in logs, audits, localStorage, or frontend state.

2. **Email & Identity:**
   - Email is authoritative in `auth.users`.
   - `public.admin_users.display_name` stores the editable User Name in the Admin domain.

3. **Row-Level Security (RLS) & Grant Posture:**
   - **`public.admin_users`**: Strict self-read (`user_id = auth.uid()`). Authenticated admins cannot directly query other admins' records. Global admin directory querying is deferred to Phase 3D via authenticated RPCs requiring `admin_users.view`. Direct mutation privileges revoked from `authenticated`.
   - **`public.user_roles`**: Strict self-read (`user_id = auth.uid()`). Authenticated admins read only their own active role assignment. Direct mutation privileges revoked from `authenticated`.
   - **`public.roles` / `public.permissions` / `public.role_permissions`**: Read-only access for active administrators (`public.is_active_admin()`). Direct mutation privileges revoked from `authenticated`.
   - **`public.admin_audit_logs`**: Direct client table SELECT is denied (`REVOKE ALL`). Audit log inspection will be mediated via controlled RPCs with `audit.view` in Phase 3H.
   - **Direct Browser Mutations**: EXPLICITLY REVOKED on all RBAC tables (`INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, `TRIGGER` are revoked for `authenticated` and `anon`).

---

## Seeded Canonical Permissions (15)

| Permission ID | Module | Action | Description |
| :--- | :--- | :--- | :--- |
| `dashboard.view` | `dashboard` | `view` | View aggregate analytics, KPI statistics, and platform overview metrics. |
| `complaints.view` | `complaints` | `view` | View complaint dossier registry, search, filter, and read details. |
| `complaints.evidence_view` | `complaints` | `evidence_view` | View citizen-submitted private photographic and video evidence media. |
| `complaints.export` | `complaints` | `export` | Export filtered complaint registries to CSV and PDF documents. |
| `complaints.publish` | `complaints` | `publish` | Publish approved complaints to the public citizen feed. |
| `complaints.unpublish` | `complaints` | `unpublish` | Retract published complaints from the public citizen feed. |
| `complaints.reject` | `complaints` | `reject` | Reject invalid complaints with reason codes and administrative notes. |
| `categories.view` | `categories` | `view` | View complaint taxonomy segments and subcategories. |
| `location_activity.view` | `location_activity` | `view` | View visitor telemetry, permission grant analytics, and session logs. |
| `map.view` | `map` | `view` | View geospatial incident mapping, district distributions, and location markers. |
| `responses.view` | `responses` | `view` | View official agency response module (Reserved). |
| `admin_users.view` | `admin_users` | `view` | View administrative user directory and active statuses (Phase 3D). |
| `admin_users.manage` | `admin_users` | `manage` | Invite, activate, deactivate, and manage administrative user accounts (Phase 3D). |
| `roles.manage` | `roles` | `manage` | Create, update, and configure role definitions and permission sets (Phase 3E). |
| `audit.view` | `audit` | `view` | Inspect administrative security audit trail and historical logs (Phase 3H). |

*Note: Roles remain unseeded in Phase 3B. Real role records will be created through the Role Creation UI in Phase 3E.*

---

## Execution Instructions for Supabase

1. Open your **Supabase Dashboard** > **SQL Editor**.
2. Run `supabase/audit/phase_3b_database_inspection.sql` to inspect current tables (safe before migration).
3. If running migrations manually in order:
   - Run `supabase/migrations/20260902000000_phase3b_rbac_foundation.sql`.
   - Run `supabase/migrations/20260902000001_phase3b_rbac_correction.sql`.
   - Run `supabase/migrations/20260902000002_phase3b_privilege_hardening.sql`.
4. Re-run `supabase/audit/phase_3b_database_inspection.sql` to verify that all 6 tables, indexes, constraints, 15 permissions, revoked mutation grants, and tightened RLS policies exist.

---

## Rollback & Recovery Warnings

> ⚠️ **CRITICAL WARNING:**
> The `DROP TABLE ... CASCADE` statements below are **ONLY SAFE FOR AN EMPTY / PRE-PRODUCTION** testing environment before production data exists.
> Once production roles, user assignments, or audit logs have been recorded, **DO NOT DROP TABLES**. Instead, apply forward corrective migrations to alter schema or adjust policies safely.

### Pre-Production Emergency Reset Script:
```sql
BEGIN;

-- 1. Drop junction & child tables first
DROP TABLE IF EXISTS public.admin_audit_logs CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.role_permissions CASCADE;
DROP TABLE IF EXISTS public.permissions CASCADE;
DROP TABLE IF EXISTS public.roles CASCADE;

-- 2. Drop helper function
DROP FUNCTION IF EXISTS public.is_active_admin() CASCADE;

-- 3. Restore simple admin_users self-read policy if needed
DROP POLICY IF EXISTS "Users can read own admin membership" ON public.admin_users;
CREATE POLICY "Users can read own admin membership"
    ON public.admin_users
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

COMMIT;
```
