do $migration$
declare
  v_schema_id uuid;
begin
  select id into v_schema_id
  from public.reporting_form_schemas
  where scope_type='subcategory'
    and scope_id='child_abduction_murder'
    and version=2
    and status='published'
  limit 1;

  if v_schema_id is null then
    raise exception 'Published child safety schema v2 not found.';
  end if;

  update public.reporting_form_schema_fields
  set config=coalesce(config,'{}'::jsonb) || '{"minimalLocation":true}'::jsonb,
      updated_at=now()
  where schema_id=v_schema_id and field_key='location';

  insert into public.admin_audit_logs(actor_id,action,target_type,target_id,details)
  values(
    null,
    'reporting_form_schema.system_minimize_child_location',
    'subcategory',
    'child_abduction_murder',
    jsonb_build_object(
      'schema_id',v_schema_id,
      'version',2,
      'location_fields',jsonb_build_array('division','district'),
      'timestamp',clock_timestamp()
    )
  );
end
$migration$;

