-- Keep the Public configured-field read contract set-based and equivalent to
-- the existing published-report-only behavior.
-- Applied to production as migration 20260921180820 during the Public > SQL > Admin sync audit.

create or replace function public.get_public_report_configured_fields(p_report_id text)
returns jsonb
language sql
stable
security definer
set search_path = 'pg_catalog', 'public'
as $function$
  with complaint as (
    select
      c.id,
      c.subcategory_id,
      c.form_schema_version,
      c.custom_field_answers
    from public.complaints c
    where c.id = p_report_id
      and c.status = 'published'
    limit 1
  ),
  schema_match as (
    select rfs.id
    from complaint c
    join public.reporting_form_schemas rfs
      on rfs.scope_type = 'subcategory'
     and rfs.scope_id = c.subcategory_id
     and rfs.version = c.form_schema_version
    order by case rfs.status when 'published' then 0 else 1 end
    limit 1
  )
  select jsonb_build_object(
    'fields',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'fieldKey', f.field_key,
            'labelEn', f.label_en,
            'labelBn', f.label_bn,
            'fieldType', f.field_type,
            'sortOrder', f.sort_order,
            'options', f.options,
            'value', c.custom_field_answers -> f.storage_key
          )
          order by f.sort_order, f.field_key
        )
        from complaint c
        cross join schema_match s
        join public.reporting_form_schema_fields f
          on f.schema_id = s.id
        where f.active = true
          and f.storage_mode = 'custom_json'
          and f.field_type not in ('phone', 'email')
          and coalesce((f.config ->> 'publicVisible')::boolean, true) = true
          and c.custom_field_answers ? f.storage_key
      ),
      '[]'::jsonb
    )
  );
$function$;

revoke all on function public.get_public_report_configured_fields(text) from public;
grant execute on function public.get_public_report_configured_fields(text) to anon, authenticated;
