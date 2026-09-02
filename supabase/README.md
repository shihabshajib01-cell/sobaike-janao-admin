# Sobaike Janao Admin — Phase 3B: Database & RBAC Foundation

## Overview

This directory contains the additive, non-destructive PostgreSQL migration and audit scripts for **Phase 3B (Database & RBAC Foundation)** of the Sobaike Janao Admin Panel.

---

## Files

1. **`supabase/audit/phase_3b_database_inspection.sql`**
   - **Type:** Non-destructive read-only SQL inspection queries.
   - **Purpose:** Verifies live columns, constraints, foreign keys, RLS status, existing grants, and RPC security definitions on `public.admin_users` and related tables before/after migration execution.
   - **Safety:** Contains only `SELECT` queries against `information_schema` and `pg_catalog`.

2. **`supabase/migrations/20260902000000_phase3b_rbac_foundation.sql`**
   - **Type:** Additive, idempotent database migration.
   - **Purpose:** Creates the relational schema for RBAC (`roles`, `permissions`, `role_permissions`, `user_roles`, `admin_audit_logs`), seeds canonical active permissions, and establishes restrictive Row-Level Security (RLS) policies.
   - **Safety:** Transaction-wrapped (`BEGIN ... COMMIT`), utilizes `IF NOT EXISTS` / `DO UPDATE`, preserves verified `admin_users` login flow, and denies direct client table mutations.

---

## Schema Architecture

```
                      +-------------------+
                      |    auth.users     | (Managed by Supabase Auth)
                      |-------------------|
                      | id (UUID, PK)     |
                      | email (text)      |
                      +-------------------+
                                |
                                | 1:1
                                v
+--------------------+        +--------------------+
|       roles        |        |    admin_users     |
|--------------------|        |--------------------|
| id (text, PK)      |        | user_id (UUID, PK) |
| name_en (text)     |        | active (boolean)   |
| name_bn (text)     |        | created_at (timest)|
| description (text) |        | updated_at (timest)|
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

## Seeded Canonical Permissions (15)

| Permission ID | Module | Action | Description |
| :--- | :--- | :--- | :--- |
| `dashboard.view` | `dashboard` | `view` | View dashboard KPIs and statistics |
| `complaints.view` | `complaints` | `view` | View complaint registry and details |
| `complaints.evidence_view` | `complaints` | `evidence_view` | View sensitive citizen photos/videos |
| `complaints.export` | `complaints` | `export` | Export complaints to CSV/PDF |
| `complaints.publish` | `complaints` | `publish` | Publish complaints to public feed |
| `complaints.unpublish` | `complaints` | `unpublish` | Retract complaints from public feed |
| `complaints.reject` | `complaints` | `reject` | Reject complaints with reason code |
| `categories.view` | `categories` | `view` | View taxonomy hierarchy |
| `location_activity.view` | `location_activity` | `view` | View visitor location telemetry |
| `map.view` | `map` | `view` | View geospatial incident map |
| `responses.view` | `responses` | `view` | View official responses module |
| `admin_users.view` | `admin_users` | `view` | View administrator directory (Phase 3D) |
| `admin_users.manage` | `admin_users` | `manage` | Manage admin accounts & invites (Phase 3D) |
| `roles.manage` | `roles` | `manage` | Manage custom roles & permissions (Phase 3E) |
| `audit.view` | `audit` | `view` | View security audit log (Phase 3H) |

*Note: Roles remain unseeded in Phase 3B pending formal role catalogue approval from the product owner.*

---

## Rollback & Recovery Guide

If required to revert Phase 3B database changes:

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
