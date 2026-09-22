do $migration$
declare
  v_schema_id uuid;
begin
  select id into v_schema_id
  from public.reporting_form_schemas
  where scope_type='subcategory'
    and scope_id='ride_sharing_safety'
    and status='published'
    and engine_mode='schema'
  order by version desc
  limit 1
  for update;

  if v_schema_id is null then
    raise exception 'Published Ride-sharing Safety schema not found.';
  end if;

  -- The ride-sharing schema is an extension of the established Public intake,
  -- not a replacement form. Keep its data contract aligned with the standard
  -- Public Safety journey, where incident date is required.
  update public.reporting_form_schema_fields
  set required=true,
      updated_at=now()
  where schema_id=v_schema_id
    and field_key='incident_date'
    and field_type='date'
    and storage_mode='core_column'
    and storage_key='incidentDate';

  if not found then
    raise exception 'Ride-sharing incident date field not found.';
  end if;

  update public.reporting_form_schemas
  set notes='Ride-sharing-specific schema extension rendered inside the established core reporting intake; no parallel form layout.',
      updated_at=now()
  where id=v_schema_id;

  insert into public.admin_audit_logs(actor_id,action,target_type,target_id,details)
  values(
    null,
    'reporting_form_schema.system_restore_ride_sharing_core_intake',
    'subcategory',
    'ride_sharing_safety',
    jsonb_build_object(
      'schema_id',v_schema_id,
      'standard_report_layout',true,
      'parallel_form_layout',false,
      'incident_date_required',true,
      'ride_specific_storage_keys',jsonb_build_array(
        'rideSharePlatform',
        'rideShareIncidentType',
        'rideShareRole',
        'rideShareVehicleType'
      ),
      'timestamp',clock_timestamp()
    )
  );
end
$migration$;
