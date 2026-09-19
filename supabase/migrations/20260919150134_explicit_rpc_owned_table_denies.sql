-- Explicit deny policies for RPC-owned public tables.
-- This migration was applied live during the 2026-09-19 end-to-end sync audit.
-- A later reconciliation migration removes these duplicate policy names while
-- retaining the canonical deny policies from 20260919142507.

drop policy if exists "Deny direct client access to category popularity snapshot"
  on public.public_category_popularity_snapshot;
create policy "Deny direct client access to category popularity snapshot"
  on public.public_category_popularity_snapshot
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists "Deny direct client access to reporting form schemas"
  on public.reporting_form_schemas;
create policy "Deny direct client access to reporting form schemas"
  on public.reporting_form_schemas
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists "Deny direct client access to reporting form schema fields"
  on public.reporting_form_schema_fields;
create policy "Deny direct client access to reporting form schema fields"
  on public.reporting_form_schema_fields
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists "Deny direct client access to site banners"
  on public.site_banners;
create policy "Deny direct client access to site banners"
  on public.site_banners
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on table public.public_category_popularity_snapshot from anon, authenticated;
revoke all on table public.reporting_form_schemas from anon, authenticated;
revoke all on table public.reporting_form_schema_fields from anon, authenticated;
revoke all on table public.site_banners from anon, authenticated;
