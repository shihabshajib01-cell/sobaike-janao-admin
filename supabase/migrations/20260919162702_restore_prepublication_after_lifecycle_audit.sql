-- Restore the accepted prepublication contract after the audit hardening pass.
-- Forms may be published before taxonomy activation; Public exposure is filtered
-- by get_public_reporting_configuration() and remains the safety boundary.

drop trigger if exists trg_guard_reporting_form_active_taxonomy
  on public.reporting_form_schemas;
drop trigger if exists trg_archive_reporting_forms_on_subcategory_deactivate
  on public.subcategories;
drop trigger if exists trg_archive_reporting_forms_on_segment_deactivate
  on public.segments;

drop function if exists private.guard_reporting_form_active_taxonomy();
drop function if exists private.archive_reporting_forms_for_inactive_taxonomy();

update public.reporting_form_schemas
set status='published'
where id='e6374d6e-7220-4460-adcb-107781298a6c'
  and scope_type='subcategory'
  and scope_id='bribe-paid'
  and status='archived';

create or replace function public.get_platform_sync_contract_version()
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  select '2026-09-19.3'::text
$$;

revoke all on function public.get_platform_sync_contract_version() from public;
grant execute on function public.get_platform_sync_contract_version()
to anon, authenticated, service_role;
