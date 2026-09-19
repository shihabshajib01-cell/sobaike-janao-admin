-- Restore the intended taxonomy/form publishing sequence:
-- a form may be published before its subcategory is activated.
-- Public exposure remains controlled by get_public_reporting_configuration().

drop trigger if exists trg_enforce_reporting_form_active_taxonomy
  on public.reporting_form_schemas;
drop trigger if exists trg_archive_forms_on_subcategory_deactivate
  on public.subcategories;
drop trigger if exists trg_archive_forms_on_segment_deactivate
  on public.segments;

drop function if exists private.enforce_reporting_form_active_taxonomy();
drop function if exists private.archive_reporting_forms_for_inactive_taxonomy();

update public.reporting_form_schemas
set status='published',
    updated_at=now()
where id='e6374d6e-7220-4460-adcb-107781298a6c'
  and scope_type='subcategory'
  and scope_id='bribe-paid'
  and status='archived';
