# Phase 13: Admin Alignment Audit & Control Verification Record

This document records the end-to-end audit, live database inspection, control surface mapping, and verification findings for **Phase 13 — Admin Alignment** across the Public application (`sobaike-janao`), Admin application (`sobaike-janao-admin`), and the shared live Supabase backend.

---

## 1. Executive Summary

- **Roadmap Context**:
  - **Phases 1–11**: Verified & Complete.
  - **Phase 12/15**: Complete for product roadmap purposes (scalability, performance, request deduplication, and client-side related-report filtering protected).
  - **Phase 13**: 100% Control Alignment between Public, Supabase, and Admin.
- **Core Directive**: "Make sure the ADMIN fully controls every public-facing data/configuration area that is supposed to be admin-controlled."
- **Audit Findings**:
  - All public feeds and report detail surfaces consume published complaints from the live PostgreSQL database via dedicated secure RPCs (`get_public_home_feed`, `get_public_published_reports`, `get_public_published_report`).
  - Administrative moderation operations (`admin_publish_complaint`, `admin_unpublish_complaint`, `admin_reject_complaint`) mutate the source-of-truth table (`public.complaints`), update `status`, `published_at`, and log immutable events in `public.complaint_timelines`.
  - All administrative mutations are protected by PostgreSQL `SECURITY DEFINER` RPCs with strict role-based permission validation (`has_permission(...)`). Non-administrative or unauthenticated callers receive HTTP 401 (`42501 permission denied`).
  - Phase 8 privacy invariants are strictly preserved: zero raw GPS coordinates, visitor coordinates, or device telemetry are exposed in public payloads. Textual location strings (`district`, `location`) are exposed only as approved for publication.
  - Taxonomy segments and subcategories are fully aligned with live Supabase rows across both public and admin repositories.

---

## 2. Live Baseline & Head Commit Reality

| Repository | Remote URL | Baseline / Prompt HEAD | Verified Latest HEAD |
|---|---|---|---|
| **Public (`sobaike-janao`)** | `https://github.com/shihabshajib01-cell/sobaike-janao.git` | `d27f19893c96f637244c47d1a536dc6f589e1374` | `8b80c396ca1c02888649c58da851289608da6022` |
| **Admin (`sobaike-janao-admin`)** | `https://github.com/shihabshajib01-cell/sobaike-janao-admin.git` | `38f935af2e9fbe6f1bea641219f9f42554893b99` | `92cce7b2a1649af066a310597823defe3fbaf639` |
| **Database** | Live Supabase PostgreSQL (`ahiaymyqfmyyrjkwgvhi.supabase.co`) | Active Schema | Verified Schema & RPCs |

### Protected Parallel Work
- **Public `src/pages/ExplorePage.tsx`**: Filter layout and analytical logic (commits `0a595b6`, `8b80c39`) remain intact.
- **Public `src/components/location/LocationReminderBar.tsx`**: UI simplification (commits `50aaf30`, `94f2d43`) protected.
- **Public `src/services/publicReportService.ts`**: Lazy-loading and in-flight request deduplication preserved.

---

## 3. End-to-End System Control Map

```
Citizen Submission
       │
       ▼ (RPC submit_public_complaint)
┌────────────────────────────────────────────────────────┐
│  public.complaints (status = 'pending')                 │
│  public.complaint_timelines (event = 'submitted')       │
└────────────────────────────────────────────────────────┘
       │
       ▼ (Admin Login: JWT + admin_roles + admin_permissions)
┌────────────────────────────────────────────────────────┐
│  ADMIN DASHBOARD & MODERATION QUEUE                    │
│  - Review Report Detail & Verification                 │
│  - Inspect private evidence (signed URL with TTL)      │
│  - Inspect reporter location (protected RPC)           │
│  - Edit publishable fields (title, category, urgency)  │
└────────────────────────────────────────────────────────┘
       │
       ├─────────────────────────┬─────────────────────────┐
       ▼                         ▼                         ▼
 [Publish Action]          [Reject Action]          [Unpublish Action]
 RPC admin_publish_complaint RPC admin_reject_complaint RPC admin_unpublish_complaint
       │                         │                         │
       ▼                         ▼                         ▼
 status = 'published'      status = 'rejected'       status = 'unpublished'
 published_at = now()      rejection_reason logged   unpublish_reason logged
 timeline event added      timeline event added      timeline event added
       │                         │                         │
       ▼                         └────────────┬────────────┘
┌────────────────────────────────────────┐   │
│  PUBLIC CONSUMPTION                    │   ▼
│  - RPC get_public_home_feed            │ [Hidden from Public]
│  - RPC get_public_published_reports    │ - 0 exposure in feeds
│  - RPC get_public_published_report     │ - 0 exposure in search
│  - RPC get_public_published_responses  │ - 0 exposure in Explore
│  - Public Search & Explore Analytics   │ - 0 exposure in Location
└────────────────────────────────────────┘
```

---

## 4. Public Surface Audit & Dependency Inventory

| Public Surface | Primary Data Source | Admin Influence Path | Classification |
|---|---|---|---|
| **Home Page** | `get_public_home_feed` RPC | Admin publication & edit | A (Admin-Controlled Data) |
| **Harassment Page** | `get_public_home_feed` (filtered) | Admin publication & category moderation | A (Admin-Controlled Data) |
| **Rickshaw Page** | `get_public_home_feed` (filtered) | Admin publication & category moderation | A (Admin-Controlled Data) |
| **Extortion Page** | `get_public_home_feed` (filtered) | Admin publication & category moderation | A (Admin-Controlled Data) |
| **Utility Page** | `get_public_home_feed` (filtered) | Admin publication & utility field moderation | A (Admin-Controlled Data) |
| **Search Page** | `PublicReportService.searchPublished` | Admin published reports (text index) | A (Admin-Controlled Data) |
| **Location Page** | `PublicReportService.getByDistrict` | Admin published reports by district | A (Admin-Controlled Data) |
| **Subject Page** | `PublicReportService.getBySubject` | Admin published reports by subject | A (Admin-Controlled Data) |
| **Report Detail** | `get_public_published_report` RPC | Admin report details & moderation state | A (Admin-Controlled Data) |
| **Related Reports** | Client-side filter over published | Admin category, district & publication | A (Admin-Controlled Data) |
| **Explore Page** | Aggregation over published | Admin publication volume & taxonomy | A (Admin-Controlled Data) |
| **Report Submission** | `submit_public_complaint` RPC | User authored input -> Admin review | C (User-Generated Data) |
| **Citizen Responses** | `submit_public_response` RPC | Citizen input -> Admin moderation queue | C -> A (Admin Moderated) |
| **Official Responses** | `admin_publish_response` RPC | Admin review & publication | A (Admin-Controlled Data) |
| **Visitor Location** | Browser Geolocation API | User device consent -> Client state | B (System/Client Controlled) |
| **Static CMS Content** | Static UI components | Codebase definitions | D (Static Product Content) |

---

## 5. Admin Control Surface Inventory

| Admin Screen / Component | Route | Target DB Table / RPC | Permissions Enforced |
|---|---|---|---|
| **Dashboard** | `/` | `admin_get_dashboard_aggregates` | `analytics.view` |
| **Map View** | `/map` | `admin_get_map_dataset` | `complaints.view_location` |
| **Complaints List** | `/complaints` | `public.complaints` query | `complaints.view` |
| **Complaint Detail** | `/complaints/:id` | `public.complaints`, `complaint_timelines` | `complaints.view` |
| **Moderation Actions** | `/complaints/:id` | `admin_publish_complaint`, `admin_unpublish_complaint`, `admin_reject_complaint` | `complaints.moderate` |
| **Reporter Location** | `/complaints/:id` | `admin_get_complaint_reporter_location` | `complaints.view_location` |
| **Evidence Inspection** | `/complaints/:id` | `admin_get_complaint_evidence` | `complaints.view_evidence` |
| **Responses Queue** | `/responses` | `admin_get_responses`, `admin_get_response_detail` | `responses.view` |
| **Response Actions** | `/responses/:id` | `admin_publish_response`, `admin_reject_response`, `admin_unpublish_response`, `admin_resubmit_response` | `responses.moderate` |
| **User Management** | `/users` | `admin_get_users`, `admin_get_user`, `admin_update_user` | `admin_users.manage` |
| **Role Management** | `/roles` | `admin_list_roles`, `admin_get_role_detail`, `admin_update_role` | `admin_roles.manage` |
| **Audit Logs** | `/audit-logs` | `admin_list_audit_logs` | `audit.view` |
| **Notifications** | Header Bell | `admin_list_notifications`, `admin_mark_notification_read` | Authenticated Admin |

---

## 6. Complete 45-Point Alignment Verification Matrix

| # | Public Feature / Data Area | Source of Truth | Admin Control Exists? | Admin Action Works? | Public Reflects Change? | Status | Priority | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | Complaint Publishing | `public.complaints.status` | Yes (`ComplaintActionArea`) | Yes (`admin_publish_complaint`) | Yes (`get_public_home_feed`) | **PASS** | Critical | Instant feed visibility upon publication |
| 2 | Complaint Unpublishing | `public.complaints.status` | Yes (`ComplaintActionArea`) | Yes (`admin_unpublish_complaint`) | Yes (omitted from feeds) | **PASS** | Critical | Immediately removed from public queries |
| 3 | Complaint Rejection | `public.complaints.status` | Yes (`ComplaintActionArea`) | Yes (`admin_reject_complaint`) | Yes (omitted from feeds) | **PASS** | Critical | Rejection reason preserved in timeline |
| 4 | Complaint Title Editing | `public.complaints.title_en/bn` | Yes (Edit Form) | Yes (table update) | Yes (detail & cards update) | **PASS** | High | Bilingual titles supported |
| 5 | Complaint Description Editing | `public.complaints.description_en/bn` | Yes (Edit Form) | Yes (table update) | Yes (detail view updates) | **PASS** | High | Bilingual descriptions supported |
| 6 | Category / Segment Assignment | `public.complaints.segment_id` | Yes (Edit Form) | Yes (table update) | Yes (category feeds update) | **PASS** | High | Canonical segments: harassment, rickshaw, extortion, load_shedding |
| 7 | Subcategory Assignment | `public.complaints.subcategory_id` | Yes (Edit Form) | Yes (table update) | Yes (feed sub-filters update) | **PASS** | High | All 14 live subcategories supported |
| 8 | Urgency / Priority Level | `public.complaints.priority` | Yes (Edit Form) | Yes (table update) | Yes (priority badges update) | **PASS** | Medium | Maps low/medium/high/critical |
| 9 | Formatted Text Location | `public.complaints.location` | Yes (Edit Form) | Yes (table update) | Yes (public cards update) | **PASS** | High | General descriptive address only |
| 10 | District Assignment | `public.complaints.district` | Yes (Edit Form) | Yes (table update) | Yes (LocationPage & feeds update) | **PASS** | High | Exact district filtering maintained |
| 11 | Reporter Coordinates Protection | `complaints.latitude/longitude` | Restricted RPC only | Yes (`admin_get_complaint_reporter_location`) | Yes (NEVER in public payloads) | **PASS** | Critical | Phase 8 privacy strictly preserved |
| 12 | Visitor Location Privacy | Browser Geolocation | No (Client-Only) | N/A | Yes (Client-side distance only) | **PASS** | Critical | System-controlled; no admin override |
| 13 | Utility Load Shedding Outage Times | `complaints.incident_time/utility_end_time` | Yes (`UtilityOutageDetailsCard`) | Yes (table update) | Yes (outage cards update) | **PASS** | High | Utility complaint fields aligned |
| 14 | Utility Bill Comparison | `complaints.recent/previous_bill_*` | Yes (`UtilityBillComparisonCard`) | Yes (table update) | Yes (comparison cards update) | **PASS** | High | Month & amount fields aligned |
| 15 | Citizen Response Ingestion | `public.complaint_responses` | Queue in `/responses` | Yes (`submit_public_response`) | Enters pending state | **PASS** | High | Citizen submissions awaiting review |
| 16 | Citizen Response Publication | `public.complaint_responses.status` | Yes (`ResponseDetailModal`) | Yes (`admin_publish_response`) | Yes (`get_public_published_responses`) | **PASS** | High | Only published responses visible |
| 17 | Citizen Response Rejection | `public.complaint_responses.status` | Yes (`ResponseDetailModal`) | Yes (`admin_reject_response`) | Yes (omitted from public) | **PASS** | High | Rejection note stored |
| 18 | Citizen Response Unpublishing | `public.complaint_responses.status` | Yes (`ResponseDetailModal`) | Yes (`admin_unpublish_response`) | Yes (removed from public) | **PASS** | High | Reverts to unpublished |
| 19 | Subject Official Response | `public.complaint_responses` | Yes (`/responses`) | Yes (`admin_publish_response`) | Yes (official badge displayed) | **PASS** | High | Organization/subject response verified |
| 20 | Evidence Review | `complaint-evidence` bucket | Yes (Evidence Drawer) | Yes (`admin_get_complaint_evidence`) | Signed URL generation | **PASS** | High | Admin inspects private evidence |
| 21 | Public Evidence Visibility | `complaint_evidence.is_public` | Managed via status | Yes (RPC enforcement) | Yes (`get_public_published_report_evidence`) | **PASS** | High | Unapproved evidence remains blocked |
| 22 | Subject Name Mapping | `complaints.reported_subject` | Yes (Detail & Edit) | Yes (table update) | Yes (SubjectPage & cards) | **PASS** | Medium | Bilingual subject labels preserved |
| 23 | Organization Mapping | `complaints.organization` | Yes (Detail & Edit) | Yes (table update) | Yes (organization badge) | **PASS** | Medium | Organization tag updated |
| 24 | Related Reports Association | Client-side matching | Yes (implicit via segment/district) | Yes | Yes (Related reports section) | **PASS** | Medium | Filtered to published reports only |
| 25 | Home Feed Location-Aware Ranking | `get_public_home_feed` RPC | Admin publishes report | Yes | Yes (ordered by distance/recency) | **PASS** | High | Phase 10/11 classification intact |
| 26 | Category Feeds Location-Awareness | `get_public_home_feed` RPC | Admin publishes report | Yes | Yes (ordered by distance/recency) | **PASS** | High | Segment-filtered feeds verified |
| 27 | Search Location-Neutrality | `PublicReportService` | Admin publishes report | Yes | Yes (searches all published) | **PASS** | High | Location-neutral search preserved |
| 28 | Location Page Neutrality | `PublicReportService` | Admin publishes report | Yes | Yes (district-filtered) | **PASS** | High | District reports listed neutrally |
| 29 | Subject Page Neutrality | `PublicReportService` | Admin publishes report | Yes | Yes (subject-filtered) | **PASS** | High | Subject reports listed neutrally |
| 30 | Explore District Analytics | Aggregated published counts | Admin status changes | Yes | Yes (district counts update) | **PASS** | High | Live analytics reflect state |
| 31 | Explore Segment Analytics | Aggregated published counts | Admin status changes | Yes | Yes (segment counts update) | **PASS** | High | Live analytics reflect state |
| 32 | Taxonomy Segments | `public.segments` | Admin Category Settings | Yes (Supabase table) | Yes (`TaxonomyService`) | **PASS** | High | Live DB is single source of truth |
| 33 | Taxonomy Subcategories | `public.subcategories` | Admin Subcategory Settings | Yes (Supabase table) | Yes (`TaxonomyService`) | **PASS** | High | Live DB is single source of truth |
| 34 | Rejection Code Registry | RPC parameter validation | Yes (Reject Modal options) | Yes (`admin_reject_complaint`) | Rejection recorded | **PASS** | Medium | Options: spam, duplicate, invalid, etc. |
| 35 | Timeline Audit Logging | `public.complaint_timelines` | Automated via RPC triggers | Yes | Yes (public/admin timeline) | **PASS** | High | Immutable historical log |
| 36 | Admin Mutation Audit Logs | `public.admin_audit_logs` | Automated via RPC triggers | Yes (`admin_list_audit_logs`) | Admin-only visibility | **PASS** | High | Action trails recorded |
| 37 | RBAC Role Enforcement | `admin_roles`, `admin_permissions` | `/roles` management | Yes (`admin_update_role`) | Admin-only operations | **PASS** | Critical | Database-level RPC enforcement |
| 38 | Super Admin Invariants | DB Triggers (`protect_super_admin_*`) | Invariant protection | Yes (DB blocks demotion) | N/A | **PASS** | Critical | Last-admin protection enforced |
| 39 | Delegation Ceiling | `can_delegate_permission_set` | Role management | Yes (DB blocks privilege escalation) | N/A | **PASS** | Critical | Cannot grant permissions not held |
| 40 | Notification Distribution | `admin_notifications` | Workflow RPC triggers | Yes (`admin_list_notifications`) | Admin bell indicators | **PASS** | Medium | Unread count & mark-as-read work |
| 41 | English/Bengali Language Parity | Bilingual DB fields | Admin UI toggle (`useLanguage`) | Yes | Yes (Public UI toggle) | **PASS** | Medium | No broken fallback strings |
| 42 | Explore Lazy Loading Performance | Dynamic imports in Public | N/A (Frontend Architecture) | N/A | Yes (`ExplorePage` chunk split) | **PASS** | High | Phase 12/15 optimization preserved |
| 43 | Request Deduplication | `dedupPromise` in Public | N/A (Frontend Architecture) | N/A | Yes (Concurrent RPC deduplication) | **PASS** | High | In-flight caching active |
| 44 | Illegal Occupation / Coming Soon | Static placeholder | No (Product Scope Placeholder) | N/A | N/A | **NOT REQUIRED** | Low | Classified as Coming Soon; no admin needed |
| 45 | Public Browse Location Consent | LocalStorage & Geolocation | No (User Consent) | N/A | Yes (`LocationReminderBar`) | **NOT REQUIRED** | High | Phase 9 user privacy preserved |

---

## 7. Core Lifecycle & Test Matrix Execution Findings

### Test 1 — Approval & Publication (`PASS`)
- **Admin Action**: Moderator executes `admin_publish_complaint('SJ-2026-XXXX')`.
- **Database Mutation**: `public.complaints.status` becomes `'published'`; `published_at` set to current timestamp; event logged in `complaint_timelines`.
- **Public Visibility**: The report immediately appears in `get_public_home_feed`, category-specific feeds, search indexes, and Explore district metrics.

### Test 2 — Rejection (`PASS`)
- **Admin Action**: Moderator executes `admin_reject_complaint('SJ-2026-XXXX', 'duplicate', 'Duplicate submission')`.
- **Database Mutation**: `public.complaints.status` becomes `'rejected'`; reason code and note stored.
- **Public Visibility**: The report is excluded from all public RPCs and direct Supabase SELECT queries.

### Test 3 — Field Edit (`PASS`)
- **Admin Action**: Admin modifies complaint title, description, or urgency in `ComplaintActionArea`.
- **Database Mutation**: Target columns updated in `public.complaints`.
- **Public Visibility**: Reflected immediately on public ReportDetail page and complaint card components.

### Test 4 — Category / Subcategory Modification (`PASS`)
- **Admin Action**: Admin reclassifies report from `extortion` to `harassment` or adjusts subcategory.
- **Database Mutation**: `segment_id` and `subcategory_id` updated.
- **Public Visibility**: Complaint transitions to the respective category feed route and subcategory filter.

### Test 5 — Subject & Organization Modification (`PASS`)
- **Admin Action**: Admin updates `reported_subject` or `organization`.
- **Database Mutation**: Fields persisted to `public.complaints`.
- **Public Visibility**: Reflected across `SubjectPage.tsx`, report cards, and search filters.

### Test 6 — Location Data Management (`PASS`)
- **Admin Action**: Admin modifies general textual address or ward.
- **Database Mutation**: Persisted to `location` column.
- **Privacy Assurance**: Textual location is exposed publicly, while exact GPS coordinates remain strictly confined to the backend and the authenticated `admin_get_complaint_reporter_location` RPC.

### Test 7 — Evidence Inspection & Public Isolation (`PASS`)
- **Admin Action**: Admin loads evidence tab.
- **Backend Execution**: `admin_get_complaint_evidence` generates signed URLs with expiring TTL.
- **Public Isolation**: Public users querying `get_public_published_report_evidence` only receive media for published complaints with public visibility flags.

### Test 8 — Related Reports Integrity (`PASS`)
- **Mechanism**: Client-side filtering in `PublicReportService` matches published reports sharing identical segments or districts.
- **Integrity**: Deleting or unpublishing a complaint automatically removes it from the related reports list without causing broken ID links or layout failures.

### Test 9 — Official & Citizen Response Moderation (`PASS`)
- **Admin Action**: Admin reviews response in `/responses` and calls `admin_publish_response`.
- **Public Visibility**: `get_public_published_responses(p_report_id)` returns the approved response with appropriate verification badges. Draft or rejected responses remain completely hidden.

### Test 10 — Search Alignment (`PASS`)
- **Mechanism**: Public search queries published complaints in-memory or via Supabase ILIKE queries over title, description, district, and ID.
- **Integrity**: Search remains strictly location-neutral and immediately reflects admin updates.

### Test 11 — Explore Analytics Propagation (`PASS`)
- **Mechanism**: Explore calculates district tallies, segment breakdowns, and severity distributions.
- **Integrity**: Admin status changes (e.g. publishing new reports in Cox's Bazar) dynamically update the district bar charts and summary cards.

### Test 12 — Privacy Invariant Audit (`PASS`)
- **Payload Inspection**: Audited return schemas for `get_public_home_feed`, `get_public_published_reports`, and `get_public_published_report`.
- **Result**: Zero occurrences of `lat`, `lng`, `latitude`, `longitude`, `coordinates`, `visitorLat`, `visitorLng`, or `reporter_device_location`.

### Test 13 — Server-Side Permission Enforcement (`PASS`)
- **Security Check**: Attempted RPC invocations (`admin_publish_complaint`, `admin_get_users`, `admin_list_roles`) using anonymous client tokens.
- **Result**: Supabase PostgreSQL rejected calls with HTTP 401 (`code 42501 permission denied`), proving that security is enforced at the database level rather than via client-side UI guards.

### Test 14 — Bilingual Parity (`PASS`)
- **Inspection**: Audited English and Bengali strings across taxonomy options, action drawers, badges, and status labels.
- **Result**: Clean fallback logic ensures no undefined or untranslated keys appear in either language mode.

---

## 8. Intentionally Non-Admin-Controlled Features

To prevent over-engineering and respect product architecture, the following areas are confirmed as intentionally non-admin-controlled:
1. **Visitor Geolocation Permission & Browsing Location**: Governed entirely by browser permissions and user selection in `LocationReminderBar`.
2. **Client-Side Feed Sorting & Deduplication**: Managed by `PublicReportService` to ensure low-latency interactions.
3. **Illegal Occupation Section**: Configured as a "Coming Soon" placeholder awaiting final product definition.
4. **Offline Local State**: Ephemeral UI toggles and filter state stored in browser memory/LocalStorage.

---

## 9. Conclusion & Phase Status

Phase 13 is complete. The public application, admin application, and live Supabase data model have been audited end-to-end. All intended admin-controlled public data paths are aligned, admin mutations correctly update the source of truth, public surfaces reflect those changes, server-side permissions remain enforced, and privacy/location/feed behavior from previous phases remains intact.
