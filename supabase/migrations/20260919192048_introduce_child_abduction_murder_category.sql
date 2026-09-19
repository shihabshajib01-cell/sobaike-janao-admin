do $migration$
declare
  v_schema_id uuid;
  v_fields jsonb;
begin
  if not exists (
    select 1 from public.segments
    where id='public_safety' and active=true and config_status='published'
  ) then
    raise exception 'Public Safety must be published before adding the child safety subcategory.';
  end if;

  insert into public.subcategories(
    id,segment_id,name_en,name_bn,description_en,description_bn,
    category_group,is_sensitive,active,sort_order,config_status,updated_at
  )
  values(
    'child_abduction_murder','public_safety',
    'Child Abduction / Murder','শিশু অপহরণ / হত্যা',
    'Report child abduction, suspected abduction linked to a missing child, or murder of a child.',
    'শিশু অপহরণ, নিখোঁজ হওয়ার সঙ্গে অপহরণের সন্দেহ, বা শিশুকে হত্যার ঘটনা জানান।',
    'general',true,false,5,'draft',now()
  )
  on conflict(id) do update set
    segment_id=excluded.segment_id,
    name_en=excluded.name_en,
    name_bn=excluded.name_bn,
    description_en=excluded.description_en,
    description_bn=excluded.description_bn,
    category_group=excluded.category_group,
    is_sensitive=true,
    sort_order=excluded.sort_order,
    updated_at=now();

  select id into v_schema_id
  from public.reporting_form_schemas
  where scope_type='subcategory'
    and scope_id='child_abduction_murder'
    and status='published'
    and engine_mode='schema'
  order by version desc
  limit 1;

  if v_schema_id is null then
    insert into public.reporting_form_schemas(
      scope_type,scope_id,version,status,engine_mode,notes,published_at,updated_at
    )
    values(
      'subcategory','child_abduction_murder',1,'published','schema',
      'Initial child-safety schema. Static fields only; sensitive child identifiers are admin-only and evidence upload is intentionally excluded.',
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
        'Describe only what you know. Avoid sharing unnecessary identifying information publicly.',
        'যতটুকু জানেন ততটুকুই লিখুন। অপ্রয়োজনীয় পরিচয়সংক্রান্ত তথ্য প্রকাশ করবেন না।',
        null,null,true,true,20,'[]'::jsonb,'{"maxLength":2000}'::jsonb,'{"locked":true}'::jsonb
      ),
      (
        v_schema_id,'child_incident_type','select','custom_json','childIncidentType',
        'Incident type','ঘটনার ধরন',
        'Choose the closest match.','সবচেয়ে কাছের ধরনটি বেছে নিন।',
        null,null,true,true,30,
        '[
          {"value":"abduction","labelEn":"Child abduction","labelBn":"শিশু অপহরণ"},
          {"value":"murder","labelEn":"Murder of a child","labelBn":"শিশু হত্যা"},
          {"value":"abduction_and_murder","labelEn":"Abduction followed by murder","labelBn":"অপহরণের পর হত্যা"},
          {"value":"unknown_not_stated","labelEn":"Not clear / not stated","labelBn":"নিশ্চিত নয় / উল্লেখ নেই"}
        ]'::jsonb,
        '{}'::jsonb,'{"publicVisible":true}'::jsonb
      ),
      (
        v_schema_id,'child_age_group','select','custom_json','childAgeGroup',
        'Child age group','শিশুর বয়স',
        'Choose an age range; use unknown if the exact age is not known.',
        'বয়স জানা থাকলে বয়সের সীমা বেছে নিন; না জানলে “জানা নেই” বেছে নিন।',
        null,null,true,true,40,
        '[
          {"value":"under_5","labelEn":"Under 5","labelBn":"৫ বছরের কম"},
          {"value":"5_9","labelEn":"5–9","labelBn":"৫–৯ বছর"},
          {"value":"10_13","labelEn":"10–13","labelBn":"১০–১৩ বছর"},
          {"value":"14_17","labelEn":"14–17","labelBn":"১৪–১৭ বছর"},
          {"value":"unknown_not_stated","labelEn":"Unknown / not stated","labelBn":"জানা নেই / উল্লেখ নেই"}
        ]'::jsonb,
        '{}'::jsonb,'{"publicVisible":false}'::jsonb
      ),
      (
        v_schema_id,'child_name','text','custom_json','childName',
        'Child name (optional)','শিশুর নাম (ঐচ্ছিক)',
        'Admin-only. Add only if it is necessary for review.',
        'শুধু অ্যাডমিন দেখবে। পর্যালোচনার জন্য প্রয়োজন হলে দিন।',
        null,null,false,true,50,'[]'::jsonb,'{"maxLength":120}'::jsonb,'{"publicVisible":false}'::jsonb
      ),
      (
        v_schema_id,'incident_date','date','core_column','incidentDate',
        'Incident date','ঘটনার তারিখ',
        null,null,null,null,true,true,60,'[]'::jsonb,'{}'::jsonb,'{}'::jsonb
      ),
      (
        v_schema_id,'last_seen_location','textarea','custom_json','lastSeenLocation',
        'Last seen / missing-from location (optional)','শেষ কোথায় দেখা গেছে / কোথা থেকে নিখোঁজ (ঐচ্ছিক)',
        'Admin-only. Add a short location description if relevant.',
        'শুধু অ্যাডমিন দেখবে। প্রাসঙ্গিক হলে সংক্ষেপে জায়গাটি লিখুন।',
        null,null,false,true,70,'[]'::jsonb,'{"maxLength":500}'::jsonb,'{"publicVisible":false}'::jsonb
      ),
      (
        v_schema_id,'last_seen_time','time','custom_json','lastSeenTime',
        'Last seen time (optional)','শেষ দেখার সময় (ঐচ্ছিক)',
        'Admin-only.','শুধু অ্যাডমিন দেখবে।',
        null,null,false,true,75,'[]'::jsonb,'{}'::jsonb,'{"publicVisible":false}'::jsonb
      ),
      (
        v_schema_id,'appearance_description','textarea','custom_json','appearanceDescription',
        'Clothing / appearance description (optional)','পোশাক / চেহারার সংক্ষিপ্ত বর্ণনা (ঐচ্ছিক)',
        'Admin-only. Share only details useful for review.',
        'শুধু অ্যাডমিন দেখবে। পর্যালোচনায় কাজে লাগে এমন তথ্যই দিন।',
        null,null,false,true,80,'[]'::jsonb,'{"maxLength":800}'::jsonb,'{"publicVisible":false}'::jsonb
      ),
      (
        v_schema_id,'police_report_filed','select','custom_json','policeReportFiled',
        'Police report / case filed?','জিডি / মামলা করা হয়েছে?',
        null,null,null,null,false,true,85,
        '[
          {"value":"yes","labelEn":"Yes","labelBn":"হ্যাঁ"},
          {"value":"no","labelEn":"No","labelBn":"না"},
          {"value":"unknown_not_stated","labelEn":"Unknown / not stated","labelBn":"জানা নেই / উল্লেখ নেই"}
        ]'::jsonb,
        '{}'::jsonb,'{"publicVisible":true}'::jsonb
      ),
      (
        v_schema_id,'police_case_reference','text','custom_json','policeCaseReference',
        'GD / case number (optional)','জিডি / মামলা নম্বর (ঐচ্ছিক)',
        'Admin-only.','শুধু অ্যাডমিন দেখবে।',
        null,null,false,true,90,'[]'::jsonb,'{"maxLength":120}'::jsonb,'{"publicVisible":false}'::jsonb
      ),
      (
        v_schema_id,'location','location','system_block','location',
        'Incident location','ঘটনার স্থান',
        null,null,null,null,true,true,100,'[]'::jsonb,'{}'::jsonb,'{"block":"location"}'::jsonb
      ),
      (
        v_schema_id,'privacy','privacy','system_block','privacy',
        'Privacy','গোপনীয়তা',
        null,null,null,null,false,true,110,'[]'::jsonb,'{}'::jsonb,'{"block":"privacy"}'::jsonb
      );

    select jsonb_agg(jsonb_build_object(
      'fieldKey',f.field_key,'fieldType',f.field_type,'storageMode',f.storage_mode,
      'storageKey',f.storage_key,'labelEn',f.label_en,'labelBn',f.label_bn,
      'required',f.required,'active',f.active,'sortOrder',f.sort_order,
      'options',f.options,'validation',f.validation,'config',f.config
    ) order by f.sort_order,f.field_key)
    into v_fields
    from public.reporting_form_schema_fields f
    where f.schema_id=v_schema_id;

    perform public.validate_reporting_form_fields(v_fields);
  end if;

  update public.subcategories
  set active=true,config_status='published',is_sensitive=true,category_group='general',sort_order=5,updated_at=now()
  where id='child_abduction_murder';

  insert into public.admin_audit_logs(actor_id,action,target_type,target_id,details)
  values(
    null,
    'taxonomy.system_introduce_child_safety',
    'subcategory',
    'child_abduction_murder',
    jsonb_build_object(
      'segment_id','public_safety',
      'schema_id',v_schema_id,
      'schema_version',1,
      'evidence_block_included',false,
      'sensitive',true,
      'news_intake_supported',true,
      'timestamp',clock_timestamp()
    )
  );
end
$migration$;

