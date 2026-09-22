do $migration$
declare
  v_schema_id uuid;
  v_fields jsonb;
begin
  if not exists (
    select 1
    from public.segments
    where id='public_safety'
      and active=true
      and config_status='published'
  ) then
    raise exception 'Public Safety must be published before adding Ride-sharing Safety.';
  end if;

  insert into public.subcategories(
    id,segment_id,slug,name_en,name_bn,description_en,description_bn,
    category_group,is_sensitive,active,sort_order,config_status,updated_at
  )
  values(
    'ride_sharing_safety','public_safety','ride-sharing-safety',
    'Ride-sharing Safety','রাইড-শেয়ারিং নিরাপত্তা',
    'Report safety incidents involving app-based rides, drivers, passengers, vehicles, or the journey.',
    'অ্যাপভিত্তিক রাইডে চালক, যাত্রী, যানবাহন বা যাত্রাপথে ঘটে যাওয়া নিরাপত্তাজনিত ঘটনার তথ্য জানান।',
    'general',true,true,6,'published',now()
  )
  on conflict(id) do update set
    segment_id=excluded.segment_id,
    slug=excluded.slug,
    name_en=excluded.name_en,
    name_bn=excluded.name_bn,
    description_en=excluded.description_en,
    description_bn=excluded.description_bn,
    category_group=excluded.category_group,
    is_sensitive=true,
    active=true,
    sort_order=excluded.sort_order,
    config_status='published',
    updated_at=now();

  select id into v_schema_id
  from public.reporting_form_schemas
  where scope_type='subcategory'
    and scope_id='ride_sharing_safety'
    and version=1
  limit 1;

  if v_schema_id is null then
    insert into public.reporting_form_schemas(
      scope_type,scope_id,version,status,engine_mode,notes,published_at,updated_at
    )
    values(
      'subcategory','ride_sharing_safety',1,'published','schema',
      'Existing core reporting intake plus ride-sharing context fields. Uses only established field types and system blocks.',
      now(),now()
    )
    returning id into v_schema_id;

    insert into public.reporting_form_schema_fields(
      schema_id,field_key,field_type,storage_mode,storage_key,
      label_en,label_bn,helper_en,helper_bn,placeholder_en,placeholder_bn,
      required,active,sort_order,options,validation,config
    ) values
      (
        v_schema_id,'title','text','core_column','title',
        'Report title','প্রতিবেদনের শিরোনাম',
        'Keep it short and specific.','সংক্ষিপ্ত ও নির্দিষ্ট রাখুন।',
        null,null,true,true,10,'[]'::jsonb,'{"maxLength":100}'::jsonb,'{"locked":true}'::jsonb
      ),
      (
        v_schema_id,'description','textarea','core_column','description',
        'What happened?','কি ঘটেছে?',
        'Describe the incident clearly.','ঘটনাটি স্পষ্টভাবে বর্ণনা করুন।',
        null,null,true,true,20,'[]'::jsonb,'{"maxLength":2000}'::jsonb,'{"locked":true}'::jsonb
      ),
      (
        v_schema_id,'rideshare_platform','select','custom_json','rideSharePlatform',
        'Ride-sharing service','রাইড-শেয়ারিং সেবা',
        'Select the app or service used for the ride.','রাইডের জন্য ব্যবহৃত অ্যাপ বা সেবাটি নির্বাচন করুন।',
        null,null,true,true,30,
        '[
          {"value":"uber","labelEn":"Uber","labelBn":"Uber"},
          {"value":"pathao","labelEn":"Pathao","labelBn":"Pathao"},
          {"value":"obhai","labelEn":"Obhai","labelBn":"Obhai"},
          {"value":"other","labelEn":"Other","labelBn":"অন্যান্য"},
          {"value":"unknown_not_stated","labelEn":"Unknown / not stated","labelBn":"জানা নেই / উল্লেখ নেই"}
        ]'::jsonb,
        '{}'::jsonb,'{"publicVisible":true}'::jsonb
      ),
      (
        v_schema_id,'rideshare_incident_type','select','custom_json','rideShareIncidentType',
        'Incident type','ঘটনার ধরন',
        'Choose the closest safety incident type.','সবচেয়ে কাছের নিরাপত্তাজনিত ঘটনার ধরনটি নির্বাচন করুন।',
        null,null,true,true,40,
        '[
          {"value":"harassment","labelEn":"Harassment / inappropriate behavior","labelBn":"হয়রানি / অশালীন আচরণ"},
          {"value":"sexual_harassment","labelEn":"Sexual harassment","labelBn":"যৌন হয়রানি"},
          {"value":"threat_assault","labelEn":"Threat / assault","labelBn":"হুমকি / আক্রমণ"},
          {"value":"theft_robbery","labelEn":"Theft / robbery / snatching","labelBn":"চুরি / ডাকাতি / ছিনতাই"},
          {"value":"unsafe_driving","labelEn":"Unsafe / reckless driving","labelBn":"ঝুঁকিপূর্ণ / বেপরোয়া চালনা"},
          {"value":"route_deviation","labelEn":"Route deviation / taken to an unintended place","labelBn":"ভুল পথে নেওয়া / অনির্ধারিত স্থানে নেওয়া"},
          {"value":"driver_vehicle_mismatch","labelEn":"Driver / vehicle mismatch","labelBn":"চালক / যানবাহনের তথ্যের অমিল"},
          {"value":"forced_payment","labelEn":"Forced payment / coercive fare demand","labelBn":"জোরপূর্বক টাকা / ভাড়া আদায়"},
          {"value":"other_safety_incident","labelEn":"Other safety incident","labelBn":"অন্যান্য নিরাপত্তাজনিত ঘটনা"},
          {"value":"unknown_not_stated","labelEn":"Unknown / not stated","labelBn":"জানা নেই / উল্লেখ নেই"}
        ]'::jsonb,
        '{}'::jsonb,'{"publicVisible":true}'::jsonb
      ),
      (
        v_schema_id,'rideshare_role','select','custom_json','rideShareRole',
        'Your role in the ride','রাইডে আপনার ভূমিকা',
        'Select how you were involved in the incident.','ঘটনাটিতে আপনি কীভাবে যুক্ত ছিলেন তা নির্বাচন করুন।',
        null,null,true,true,50,
        '[
          {"value":"passenger","labelEn":"Passenger","labelBn":"যাত্রী"},
          {"value":"driver","labelEn":"Driver","labelBn":"চালক"},
          {"value":"witness_other","labelEn":"Witness / other","labelBn":"প্রত্যক্ষদর্শী / অন্যান্য"},
          {"value":"unknown_not_stated","labelEn":"Unknown / not stated","labelBn":"জানা নেই / উল্লেখ নেই"}
        ]'::jsonb,
        '{}'::jsonb,'{"publicVisible":true}'::jsonb
      ),
      (
        v_schema_id,'rideshare_vehicle_type','select','custom_json','rideShareVehicleType',
        'Vehicle type','যানবাহনের ধরন',
        'Select if known.','জানা থাকলে নির্বাচন করুন।',
        null,null,false,true,60,
        '[
          {"value":"car","labelEn":"Car","labelBn":"গাড়ি"},
          {"value":"motorcycle","labelEn":"Motorcycle","labelBn":"মোটরসাইকেল"},
          {"value":"cng_auto_rickshaw","labelEn":"CNG / auto-rickshaw","labelBn":"সিএনজি / অটোরিকশা"},
          {"value":"other","labelEn":"Other","labelBn":"অন্যান্য"},
          {"value":"unknown_not_stated","labelEn":"Unknown / not stated","labelBn":"জানা নেই / উল্লেখ নেই"}
        ]'::jsonb,
        '{}'::jsonb,'{"publicVisible":true}'::jsonb
      ),
      (
        v_schema_id,'incident_date','date','core_column','incidentDate',
        'Incident date','ঘটনার তারিখ',
        null,null,null,null,false,true,70,'[]'::jsonb,'{}'::jsonb,'{}'::jsonb
      ),
      (
        v_schema_id,'incident_time','time','core_column','incidentTime',
        'Incident time','ঘটনার সময়',
        null,null,null,null,false,true,80,'[]'::jsonb,'{}'::jsonb,'{}'::jsonb
      ),
      (
        v_schema_id,'frequency','radio','core_column','frequency',
        'Frequency','পুনরাবৃত্তি',
        null,null,null,null,true,true,90,
        '[
          {"value":"one-time","labelEn":"One-time","labelBn":"এককালীন"},
          {"value":"repeated","labelEn":"Repeated","labelBn":"একাধিকবার"}
        ]'::jsonb,
        '{}'::jsonb,'{}'::jsonb
      ),
      (
        v_schema_id,'location','location','system_block','location',
        'Location','লোকেশন',
        null,null,null,null,true,true,100,'[]'::jsonb,'{}'::jsonb,'{"block":"location"}'::jsonb
      ),
      (
        v_schema_id,'subject_party','subject_party','system_block','subjectParty',
        'Related person / organization','সংশ্লিষ্ট ব্যক্তি / প্রতিষ্ঠান',
        null,null,null,null,false,true,110,'[]'::jsonb,'{}'::jsonb,'{"block":"subject_party"}'::jsonb
      ),
      (
        v_schema_id,'evidence','evidence','system_block','evidence',
        'Supporting information','সহায়ক তথ্য',
        null,null,null,null,false,true,900,'[]'::jsonb,'{}'::jsonb,'{"block":"evidence"}'::jsonb
      ),
      (
        v_schema_id,'privacy','privacy','system_block','privacy',
        'Privacy','গোপনীয়তা',
        null,null,null,null,false,false,910,'[]'::jsonb,'{}'::jsonb,'{"block":"privacy"}'::jsonb
      );

    select jsonb_agg(jsonb_build_object(
      'fieldKey',f.field_key,'fieldType',f.field_type,'storageMode',f.storage_mode,
      'storageKey',f.storage_key,'labelEn',f.label_en,'labelBn',f.label_bn,
      'helperEn',f.helper_en,'helperBn',f.helper_bn,
      'placeholderEn',f.placeholder_en,'placeholderBn',f.placeholder_bn,
      'required',f.required,'active',f.active,'sortOrder',f.sort_order,
      'options',f.options,'validation',f.validation,'config',f.config
    ) order by f.sort_order,f.field_key)
    into v_fields
    from public.reporting_form_schema_fields f
    where f.schema_id=v_schema_id;

    perform public.validate_reporting_form_fields(v_fields);
  else
    update public.reporting_form_schemas
    set status='published',
        engine_mode='schema',
        published_at=coalesce(published_at,now()),
        updated_at=now()
    where id=v_schema_id;
  end if;

  update public.reporting_form_schemas
  set status='archived',updated_at=now()
  where scope_type='subcategory'
    and scope_id='ride_sharing_safety'
    and id<>v_schema_id
    and status='published';

  insert into public.admin_audit_logs(actor_id,action,target_type,target_id,details)
  values(
    null,
    'taxonomy.system_introduce_ride_sharing_safety',
    'subcategory',
    'ride_sharing_safety',
    jsonb_build_object(
      'segment_id','public_safety',
      'schema_id',v_schema_id,
      'schema_version',1,
      'keeps_core_reporting_intake',true,
      'custom_fields',jsonb_build_array(
        'rideSharePlatform','rideShareIncidentType','rideShareRole','rideShareVehicleType'
      ),
      'sensitive',true,
      'news_intake_supported',true,
      'timestamp',clock_timestamp()
    )
  );
end
$migration$;

-- Ride-sharing reports can include victim-identifying harassment or assault details.
-- Keep automated News Intake conservative: a human privacy review is required
-- before a sourced Ride-sharing Safety report can be published.
create or replace function public.news_intake_privacy_review_required(p_subcategory_id text)
returns boolean
language sql
immutable
set search_path = pg_catalog, public
as $function$
  select coalesce(p_subcategory_id,'') = any (array[
    'child_abduction_murder',
    'ride_sharing_safety',
    'rape-sexual-violence',
    'sexual-harassment',
    'domestic-violence',
    'blackmail-coercion',
    'honeytrap'
  ]::text[]);
$function$;
