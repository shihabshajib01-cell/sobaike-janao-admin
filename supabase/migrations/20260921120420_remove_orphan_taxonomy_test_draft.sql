delete from public.reporting_form_schema_fields f
using public.reporting_form_schemas s
where f.schema_id=s.id
  and s.scope_type='subcategory'
  and s.scope_id='asfasw';

delete from public.reporting_form_schemas
where scope_type='subcategory'
  and scope_id='asfasw';

delete from public.subcategories
where id='asfasw'
  and active=false
  and config_status='draft'
  and not exists (
    select 1 from public.complaints c where c.subcategory_id='asfasw'
  )
  and not exists (
    select 1 from public.news_intake_run_items n where n.subcategory_id='asfasw'
  );
