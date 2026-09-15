# Phase 13 — Admin Alignment Closeout Record

This document is the verified closeout record for **Phase 13 — Admin Alignment** across the Public app (`sobaike-janao`), Admin app (`sobaike-janao-admin`), and the shared live Supabase backend.

It supersedes the earlier draft audit where complaint editing was still marked as dev-fallback-only.

---

## 1. Closeout Status

**Phase 13 status: COMPLETE / VERIFIED**

The final Phase 13 blocker was the Admin complaint Edit flow. The UI existed, but configured Supabase previously rejected live editing because there was no production `admin_edit_complaint` mutation path.

That blocker is now resolved:

- Admin `ComplaintApi.editComplaint()` routes configured-backend edits to `supabaseComplaintService.editComplaint(...)`.
- `supabaseComplaintService.editComplaint(...)` calls the live `admin_edit_complaint` RPC.
- Live Supabase migration `20260915044537 phase13_admin_edit_complaint_live` is applied.
- Repository migration `supabase/migrations/20260907000003_admin_edit_complaint.sql` is synchronized to the live contract.
- Live transaction-safe edit verification succeeded with status preservation and rollback of test data.
- Public location/privacy invariants remained intact after the change.

---

## 2. Current Verified Baseline

| Area | Verified state |
|---|---|
| Public repository | Current main inspected through `ff70882c811628ce584ec2dbf661ef897d670109` |
| Admin repository | Complaint edit wiring present from `f5aec73e762450ad1464c8b8f3e1e7a5f99803b6`; closeout sync performed on `phase13-live-edit-sync` |
| Live Supabase project | `ahiaymyqfmyyrjkwgvhi` |
| Live edit migration | `20260915044537 phase13_admin_edit_complaint_live` |
| Live edit RPC | `admin_edit_complaint(text,text,text,text,text,text,text,text,text,text,text,text,text)` |

Parallel Public Explore work newer than the original Phase 13 audit was treated as protected work and was not modified by this closeout.

---

## 3. Live Complaint Edit Contract

The production Admin Edit path is:

```text
ComplaintActionArea
  -> complaintApi.editComplaint
  -> supabaseComplaintService.editComplaint
  -> public.admin_edit_complaint(...)
  -> public.complaints
  -> existing public read RPCs
```

The current Admin Edit UI persists these fields only:

- English title
- Bengali title
- English description
- Bengali description
- segment/category
- subcategory
- priority/urgency
- ward/upazila-thana mapping
- district/zone mapping
- formatted textual address
- private admin edit note

No additional editable fields were invented during closeout.

---

## 4. Authorization

There is **no live `complaints.edit` permission** in the current permission catalogue.

The Admin UI already exposes Edit only when the active admin holds at least one of:

- `complaints.publish`
- `complaints.unpublish`
- `complaints.reject`

The live `admin_edit_complaint` RPC intentionally mirrors this exact rule.

The RPC also requires:

- authenticated caller
- active admin account
- fixed `SECURITY DEFINER` search path
- database-level permission validation

Function grants were verified live:

| Role | EXECUTE |
|---|---|
| `PUBLIC` | revoked |
| `anon` | revoked |
| `authenticated` | granted, then gated inside the RPC by admin/RBAC checks |
| `service_role` | granted |

Frontend button visibility is not relied on for authorization.

---

## 5. Taxonomy Validation

Live taxonomy remains the source of truth.

Verified active segments:

- `harassment`
- `rickshaw`
- `extortion`
- `load_shedding`

Verified active subcategories: **14** across those four segments.

`admin_edit_complaint` validates:

- selected segment exists and is active
- selected subcategory exists
- selected subcategory belongs to the selected segment

No new taxonomy values were introduced.

---

## 6. Location Mapping

The closeout corrected the repository migration to match the actual Admin mapper and live schema.

| Admin domain field | Live complaint column |
|---|---|
| `location.ward` | `upazila_or_thana` |
| `location.zone` | `district` |
| `addressEn` / `addressBn` | `formatted_address` |

The previous repository draft incorrectly mapped `ward` to `area`. That assumption is no longer present in the synchronized migration.

Reporter/device GPS fields are not edited by this RPC.

---

## 7. Protected Data and Status

The edit RPC does **not** change:

- complaint ID
- moderation status
- publication state
- reporter name/contact metadata
- latitude/longitude
- reporter/device location context
- evidence records
- publication preferences
- client submission metadata
- creation timestamp

Publish, unpublish, and reject remain separate dedicated workflows.

A live transaction-safe test confirmed that a real complaint edit path succeeds while the original complaint status remains unchanged. The test transaction was rolled back so no test complaint, timeline, or audit mutation was retained.

---

## 8. Audit and Timeline Behavior

Successful complaint edits create:

- a private `public.complaint_updates` row with `update_type = 'edited'`
- a `public.admin_audit_logs` row with action `complaint.edit`

The audit payload records the affected complaint and edited classification/location metadata without copying reporter GPS/private device data.

---

## 9. Complaint Edit Verification Matrix

| Area | Result | Evidence |
|---|---|---|
| Configured-backend edit wiring | **VERIFIED** | `complaintApi.ts` now calls `supabaseComplaintService.editComplaint` |
| Live RPC exists | **VERIFIED** | exact 13-text-parameter signature inspected live |
| SECURITY DEFINER | **VERIFIED** | live catalog inspection |
| Fixed search path | **VERIFIED** | `pg_catalog, public` |
| Anonymous execution | **BLOCKED AS EXPECTED** | `anon` has no EXECUTE privilege |
| Active-admin enforcement | **VERIFIED** | RPC checks `is_active_admin()` |
| Permission enforcement | **VERIFIED** | mirrors current Admin UI publish/unpublish/reject authority rule |
| Segment validation | **VERIFIED** | live taxonomy lookup |
| Subcategory-parent validation | **VERIFIED** | live taxonomy lookup |
| Priority validation | **VERIFIED** | `low`, `medium`, `high`, `urgent` only |
| EN/BN title persistence | **VERIFIED BY CONTRACT** | explicit title/title_en assignments |
| EN/BN description persistence | **VERIFIED BY CONTRACT** | explicit description/description_en assignments |
| Ward mapping | **VERIFIED** | `upazila_or_thana` |
| District mapping | **VERIFIED** | `district` |
| Text address mapping | **VERIFIED** | `formatted_address` |
| Status preservation | **VERIFIED LIVE** | transaction-safe real-row test |
| Edit audit event | **VERIFIED BY CONTRACT** | `admin_audit_logs` insert |
| Private timeline/update event | **VERIFIED BY CONTRACT** | `complaint_updates` insert |
| Test mutation cleanup | **VERIFIED** | transaction rolled back |

---

## 10. Public Privacy Regression

After the live edit RPC was deployed, the public feed RPCs were rechecked.

Verified public payloads still expose **no**:

- `latitude`
- `longitude`
- `lat`
- `lng`
- coordinates object
- distance value
- visitor GPS
- reporter/device GPS

Checked live paths include:

- `get_public_home_feed`
- `get_public_published_reports`

Phase 8 shadow-location privacy remains protected. Location-aware ranking remains a backend concern; this document does not classify it as client-side distance processing.

---

## 11. Existing Moderation Paths Preserved

The closeout did not redesign or replace:

- `admin_publish_complaint`
- `admin_unpublish_complaint`
- `admin_reject_complaint`
- response moderation RPCs
- evidence access
- reporter-location access
- role management
- notification workflows
- public feed ranking
- Search location neutrality
- Explore UI/analytics work
- LocationReminderBar behavior

The change was limited to making the existing Admin Edit action persist safely to the live backend and synchronizing repository documentation/migration state.

---

## 12. Scope Clarifications

Some older Phase 13 notes implied that subject/organization and utility-specific detail fields were part of the complaint Edit modal. The current inspected Edit UI does **not** send those fields through `admin_edit_complaint`.

They are therefore **not claimed as newly editable or verified by this closeout**. Their existing display/read behavior is preserved. Adding new edit controls or backend parameters for them would be a separate product requirement and is intentionally outside this blocker fix.

Similarly, no new permission named `complaints.edit` was created because the live product currently has no such permission and the Admin UI already defines its edit-authority rule.

---

## 13. Final Phase Verdict

**Phase 13 is COMPLETE.**

The final production blocker has been resolved: the existing Admin complaint Edit workflow now persists through a secure live Supabase RPC, uses the current product's real permission model, validates taxonomy, preserves moderation state and private location data, records audit/update events, and remains compatible with existing public read paths.

The repository migration has been synchronized with the live implementation so a future deployment does not reintroduce the earlier permission or location-mapping assumptions.

**Next roadmap phase: Phase 14/16 — Final Hardening & Regression.**
