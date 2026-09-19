-- Reconcile the temporary live hardening pass with the canonical
-- 20260919142507 end-to-end sync contract migration.

drop policy if exists "Deny direct client access to category popularity snapshot"
  on public.public_category_popularity_snapshot;
drop policy if exists "Deny direct client access to reporting form schemas"
  on public.reporting_form_schemas;
drop policy if exists "Deny direct client access to reporting form schema fields"
  on public.reporting_form_schema_fields;
drop policy if exists "Deny direct client access to site banners"
  on public.site_banners;

-- Private operational tables are not exposed through the Data API.
-- Add explicit deny policies so their RLS intent is machine-verifiable too.
drop policy if exists "Private table: deny client access"
  on private.public_api_rate_events;
create policy "Private table: deny client access"
  on private.public_api_rate_events
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists "Private table: deny client access"
  on private.public_engagement_dedupe;
create policy "Private table: deny client access"
  on private.public_engagement_dedupe
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists "Private table: deny client access"
  on private.security_runtime_secrets;
create policy "Private table: deny client access"
  on private.security_runtime_secrets
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on table private.public_api_rate_events from anon, authenticated;
revoke all on table private.public_engagement_dedupe from anon, authenticated;
revoke all on table private.security_runtime_secrets from anon, authenticated;
