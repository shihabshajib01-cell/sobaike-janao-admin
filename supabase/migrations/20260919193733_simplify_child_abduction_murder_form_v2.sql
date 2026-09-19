do $migration$
declare
  v_old_schema uuid;
  v_new_schema uuid;
  v_fields jsonb;
begin
  select id into v_old_schema
  from public.reporting_form_schemas
  where scope_type='subcategory'
    and scope_id='child_abduction_murder'
    and status='published'
  order by version desc
  limit 1
  for update;

  if v_old_schema is null then
    raise exception 'Published child_abduction_murder form not found.';
  end if;

  select id into v_new_schema
  from public.reporting_form_schemas
  where scope_type='subcategory'
    and scope_id='child_abduction_murder'
    and version=2
  limit 1;

  if v_new_schema is null then
    insert into public.reporting_form_schemas(
      scope_type,scope_id,version,status,engine_mode,notes,created_at,updated_at
    )
    values(
      'subcategory','child_abduction_murder',2,'draft','schema',
      'Minimal child-safety form: title, description, incident type, incident date, and incident location only.',
      now(),now()
    )
    returning id into v_new_schema;

    insert into public.reporting_form_schema_fields(
      schema_id,field_key,field_type,storage_mode,storage_key,
      label_en,label_bn,helper_en,helper_bn,placeholder_en,placeholder_bn,
      required,active,sort_order,options,validation,config,created_at,updated_at
    )
    select
      v_new_schema,
      f.field_key,f.field_type,f.storage_mode,f.storage_key,
      f.label_en,f.label_bn,f.helper_en,f.helper_bn,f.placeholder_en,f.placeholder_bn,
      f.required,true,
      case f.field_key
        when 'title' then 10
        when 'description' then 20
        when 'child_incident_type' then 30
        when 'incident_date' then 40
        when 'location' then 50
        else f.sort_order
      end,
      f.options,f.validation,f.config,now(),now()
    from public.reporting_form_schema_fields f
    where f.schema_id=v_old_schema
      and f.field_key in ('title','description','child_incident_type','incident_date','location');

    select jsonb_agg(jsonb_build_object(
      'fieldKey',f.field_key,'fieldType',f.field_type,'storageMode',f.storage_mode,
      'storageKey',f.storage_key,'labelEn',f.label_en,'labelBn',f.label_bn,
      'helperEn',f.helper_en,'helperBn',f.helper_bn,'placeholderEn',f.placeholder_en,
      'placeholderBn',f.placeholder_bn,'required',f.required,'active',f.active,
      'sortOrder',f.sort_order,'options',f.options,'validation',f.validation,'config',f.config
    ) order by f.sort_order,f.field_key)
    into v_fields
    from public.reporting_form_schema_fields f
    where f.schema_id=v_new_schema;

    perform public.validate_reporting_form_fields(v_fields);
  end if;

  update public.reporting_form_schemas
  set status='archived',updated_at=now()
  where scope_type='subcategory'
    and scope_id='child_abduction_murder'
    and status='published'
    and id<>v_new_schema;

  update public.reporting_form_schemas
  set status='published',
      engine_mode='schema',
      published_at=coalesce(published_at,now()),
      updated_at=now()
  where id=v_new_schema;

  insert into public.admin_audit_logs(actor_id,action,target_type,target_id,details)
  values(
    null,
    'reporting_form_schema.system_simplify_child_safety',
    'subcategory',
    'child_abduction_murder',
    jsonb_build_object(
      'schema_id',v_new_schema,
      'version',2,
      'removed_fields',jsonb_build_array(
        'child_age_group','child_name','last_seen_location','last_seen_time',
        'appearance_description','police_report_filed','police_case_reference','privacy'
      ),
      'kept_fields',jsonb_build_array(
        'title','description','child_incident_type','incident_date','location'
      ),
      'timestamp',clock_timestamp()
    )
  );
end
$migration$;

