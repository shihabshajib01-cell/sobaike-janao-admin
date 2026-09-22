-- Browse GPS is transient by Phase 8 privacy contract, so the partial
-- latitude/longitude index can never contain rows.
drop index if exists public.public_visit_sessions_location_idx;
