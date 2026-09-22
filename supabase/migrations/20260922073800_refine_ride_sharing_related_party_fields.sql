do $migration$
declare
  v_old_schema_id uuid;
  v_new_schema_id uuid;
  v_fields jsonb;
begin
  select id into v_old_schema_id
  from public.reporting_form_schemas
  where scope_type='subcategory'
    and scope_id='ride_sharing_safety'
    and status='published'
    and engine_mode='schema'
  order by version desc
  limit 1
  for update;

  if v_old_schema_id is null then
    raise exception 'Published Ride-sharing Safety schema not found.';
  end if;

  select id into v_new_schema_id
  from public.reporting_form_schemas
  where scope_type='subcategory'
    and scope_id='ride_sharing_safety'
    and version=2
  limit 1;

  if v_new_schema_id is null then
    insert into public.reporting_form_schemas(
      scope_type,scope_id,version,status,engine_mode,notes,published_at,updated_at
    )
    values(
      'subcategory','ride_sharing_safety',2,'draft','schema',
      'Core Public Safety intake with ride-sharing-specific context and privacy-safe related-party reference fields.',
      null,now()
    )
    returning id into v_new_schema_id;
  else
    update public.reporting_form_schemas
    set status='draft',
        engine_mode='schema',
        notes='Core Public Safety intake with ride-sharing-specific context and privacy-safe related-party reference fields.',
        published_at=null,
        updated_at=now()
    where id=v_new_schema_id;

    delete from public.reporting_form_schema_fields
    where schema_id=v_new_schema_id;
  end if;

  insert into public.reporting_form_schema_fields(
    schema_id,field_key,field_type,storage_mode,storage_key,
    label_en,label_bn,helper_en,helper_bn,placeholder_en,placeholder_bn,
    required,active,sort_order,options,validation,config
  )
  select
    v_new_schema_id,
    f.field_key,
    f.field_type,
    f.storage_mode,
    f.storage_key,
    f.label_en,
    f.label_bn,
    f.helper_en,
    f.helper_bn,
    f.placeholder_en,
    f.placeholder_bn,
    case when f.field_key='incident_date' then true else f.required end,
    f.active,
    f.sort_order,
    f.options,
    f.validation,
    f.config
  from public.reporting_form_schema_fields f
  where f.schema_id=v_old_schema_id
    and f.field_key not in ('rideshare_vehicle_registration','rideshare_trip_id');

  insert into public.reporting_form_schema_fields(
    schema_id,field_key,field_type,storage_mode,storage_key,
    label_en,label_bn,helper_en,helper_bn,placeholder_en,placeholder_bn,
    required,active,sort_order,options,validation,config
  )
  values
    (
      v_new_schema_id,
      'rideshare_vehicle_registration',
      'text',
      'custom_json',
      'rideShareVehicleRegistration',
      'Vehicle registration number',
      'যানবাহনের রেজিস্ট্রেশন নম্বর',
      'Optional. Add it only if it is visible or known.',
      'ঐচ্ছিক। দেখা বা জানা থাকলে লিখুন।',
      'e.g. Dhaka Metro-Ga 12-3456',
      'যেমন: ঢাকা মেট্রো-গ ১২-৩৪৫৬',
      false,
      true,
      115,
      '[]'::jsonb,
      '{"maxLength":50}'::jsonb,
      '{"publicVisible":false,"section":"related_party"}'::jsonb
    ),
    (
      v_new_schema_id,
      'rideshare_trip_id',
      'text',
      'custom_json',
      'rideShareTripId',
      'Ride / trip ID',
      'রাইড / ট্রিপ আইডি',
      'Optional. Add the ride reference shown in the app if known.',
      'ঐচ্ছিক। জানা থাকলে অ্যাপে দেখানো রাইড রেফারেন্স লিখুন।',
      'Enter the ride or trip ID',
      'রাইড বা ট্রিপ আইডি লিখুন',
      false,
      true,
      120,
      '[]'::jsonb,
      '{"maxLength":100}'::jsonb,
      '{"publicVisible":false,"section":"related_party"}'::jsonb
    );

  select jsonb_agg(
    jsonb_build_object(
      'fieldKey',f.field_key,
      'fieldType',f.field_type,
      'storageMode',f.storage_mode,
      'storageKey',f.storage_key,
      'labelEn',f.label_en,
      'labelBn',f.label_bn,
      'helperEn',f.helper_en,
      'helperBn',f.helper_bn,
      'placeholderEn',f.placeholder_en,
      'placeholderBn',f.placeholder_bn,
      'required',f.required,
      'active',f.active,
      'sortOrder',f.sort_order,
      'options',f.options,
      'validation',f.validation,
      'config',f.config
    )
    order by f.sort_order,f.field_key
  )
  into v_fields
  from public.reporting_form_schema_fields f
  where f.schema_id=v_new_schema_id;

  perform public.validate_reporting_form_fields(v_fields);

  update public.reporting_form_schemas
  set status='archived',updated_at=now()
  where scope_type='subcategory'
    and scope_id='ride_sharing_safety'
    and id<>v_new_schema_id
    and status='published';

  update public.reporting_form_schemas
  set status='published',published_at=now(),updated_at=now()
  where id=v_new_schema_id;

  insert into public.admin_audit_logs(actor_id,action,target_type,target_id,details)
  values(
    null,
    'reporting_form_schema.system_refine_ride_sharing_related_party',
    'subcategory',
    'ride_sharing_safety',
    jsonb_build_object(
      'schema_id',v_new_schema_id,
      'schema_version',2,
      'core_intake_preserved',true,
      'hidden_for_ride_sharing',jsonb_build_array('phoneOrContact','organization'),
      'private_reference_fields',jsonb_build_array('rideShareVehicleRegistration','rideShareTripId'),
      'timestamp',clock_timestamp()
    )
  );
end
$migration$;

create or replace function public.sanitize_ride_sharing_complaint_party()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  if exists(
    select 1
    from public.complaints c
    where c.id=new.complaint_id
      and c.subcategory_id='ride_sharing_safety'
  ) then
    new.organization := null;
    new.phone_or_contact := null;
    new.public_profile_handle := null;
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_sanitize_ride_sharing_complaint_party on public.complaint_parties;
create trigger trg_sanitize_ride_sharing_complaint_party
before insert or update on public.complaint_parties
for each row
execute function public.sanitize_ride_sharing_complaint_party();
