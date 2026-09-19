revoke all on table
  public.public_category_popularity_snapshot,
  public.reporting_form_schema_fields,
  public.reporting_form_schemas,
  public.site_banners
from anon, authenticated;

drop policy if exists "RPC-only table: deny direct reads" on public.public_category_popularity_snapshot;
create policy "RPC-only table: deny direct reads"
on public.public_category_popularity_snapshot
for select
to anon, authenticated
using (false);

drop policy if exists "RPC-only table: deny direct reads" on public.reporting_form_schema_fields;
create policy "RPC-only table: deny direct reads"
on public.reporting_form_schema_fields
for select
to anon, authenticated
using (false);

drop policy if exists "RPC-only table: deny direct reads" on public.reporting_form_schemas;
create policy "RPC-only table: deny direct reads"
on public.reporting_form_schemas
for select
to anon, authenticated
using (false);

drop policy if exists "RPC-only table: deny direct reads" on public.site_banners;
create policy "RPC-only table: deny direct reads"
on public.site_banners
for select
to anon, authenticated
using (false);

revoke execute on function public.normalize_sourced_report_public_language()
from public, anon, authenticated;

alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

create or replace function public.get_platform_sync_contract_version()
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  select '2026-09-19.1'::text
$$;

revoke all on function public.get_platform_sync_contract_version() from public;
grant execute on function public.get_platform_sync_contract_version()
to anon, authenticated, service_role;
