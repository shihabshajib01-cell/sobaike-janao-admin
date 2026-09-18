-- Complete taxonomy/form-builder control plane.
-- Additive and permission-gated. Existing live taxonomy remains published and unchanged.

begin;

-- ---------------------------------------------------------------------------
-- 1. Helpers
-- ---------------------------------------------------------------------------

create or replace function public.validate_reporting_form_fields(p_fields jsonb)
returns void
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_field jsonb;
  v_key text;
  v_type text;
  v_storage_mode text;
  v_storage_key text;
  v_order integer;
  v_seen text[] := array[]::text[];
  v_has_title boolean := false;
  v_has_description boolean := false;
begin
  if p_fields is null or jsonb_typeof(p_fields) <> 'array' then
    raise exception 'Form fields must be a JSON array.' using errcode='22023';
  end if;

  if jsonb_array_length(p_fields) > 60 then
    raise exception 'A form may contain at most 60 fields.' using errcode='22023';
  end if;

  for v_field in select * from jsonb_array_elements(p_fields)
  loop
    if jsonb_typeof(v_field) <> 'object' then
      raise exception 'Every form field must be a JSON object.' using errcode='22023';
    end if;

    v_key := lower(nullif(btrim(v_field->>'fieldKey'),''));
    v_type := lower(nullif(btrim(v_field->>'fieldType'),''));
    v_storage_mode := lower(nullif(btrim(v_field->>'storageMode'),''));
    v_storage_key := nullif(btrim(v_field->>'storageKey'),'');
    v_order := coalesce((v_field->>'sortOrder')::integer, 0);

    if v_key is null or v_key !~ '^[a-z][a-z0-9_]{0,63}$' then
      raise exception 'Invalid field key: %', coalesce(v_key,'') using errcode='22023';
    end if;

    if v_key = any(v_seen) then
      raise exception 'Duplicate field key: %', v_key using errcode='22023';
    end if;
    v_seen := array_append(v_seen, v_key);

    if v_type not in (
      'text','textarea','number','currency','date','time','month',
      'select','radio','checkbox','multiselect','phone','email','url',
      'location','subject_party','evidence','privacy','mob_justice_details'
    ) then
      raise exception 'Unsupported field type: %', coalesce(v_type,'') using errcode='22023';
    end if;

    if v_storage_mode not in ('core_column','custom_json','system_block') then
      raise exception 'Unsupported storage mode: %', coalesce(v_storage_mode,'') using errcode='22023';
    end if;

    if v_storage_key is null then
      raise exception 'Storage key is required for field %', v_key using errcode='22023';
    end if;

    if nullif(btrim(v_field->>'labelEn'),'') is null
       or nullif(btrim(v_field->>'labelBn'),'') is null then
      raise exception 'English and Bangla labels are required for field %', v_key using errcode='22023';
    end if;

    if v_order < 1 or v_order > 999 then
      raise exception 'Sort order for field % must be between 1 and 999.', v_key using errcode='22023';
    end if;

    if coalesce(v_field->'options','[]'::jsonb) is not null
       and jsonb_typeof(coalesce(v_field->'options','[]'::jsonb)) <> 'array' then
      raise exception 'Options for field % must be an array.', v_key using errcode='22023';
    end if;

    if coalesce(v_field->'validation','{}'::jsonb) is not null
       and jsonb_typeof(coalesce(v_field->'validation','{}'::jsonb)) <> 'object' then
      raise exception 'Validation for field % must be an object.', v_key using errcode='22023';
    end if;

    if coalesce(v_field->'config','{}'::jsonb) is not null
       and jsonb_typeof(coalesce(v_field->'config','{}'::jsonb)) <> 'object' then
      raise exception 'Config for field % must be an object.', v_key using errcode='22023';
    end if;

    if v_type in ('select','radio','multiselect')
       and jsonb_array_length(coalesce(v_field->'options','[]'::jsonb)) = 0 then
      raise exception 'Field % requires at least one option.', v_key using errcode='22023';
    end if;

    if v_key = 'title'
       and coalesce((v_field->>'active')::boolean,true)
       and coalesce((v_field->>'required')::boolean,false) then
      v_has_title := true;
    end if;

    if v_key = 'description'
       and coalesce((v_field->>'active')::boolean,true)
       and coalesce((v_field->>'required')::boolean,false) then
      v_has_description := true;
    end if;
  end loop;

  if not v_has_title then
    raise exception 'Every form must keep the protected required Title field.' using errcode='22023';
  end if;

  if not v_has_description then
    raise exception 'Every form must keep the protected required Description field.' using errcode='22023';
  end if;
end;
$$;

revoke all on function public.validate_reporting_form_fields(jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Dynamic banner/public filtering safety
-- ---------------------------------------------------------------------------

create or replace function public.get_public_site_banners()
returns table(category_key text, content jsonb, version integer, published_at timestamptz)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select b.category_key, b.published_content, b.version, b.published_at
  from public.site_banners b
  join public.segments s on s.id = b.category_key
  where s.active = true
    and s.config_status = 'published'
  order by coalesce((b.published_content->>'sortOrder')::integer, 999), b.category_key;
$$;

revoke all on function public.get_public_site_banners() from public;
grant execute on function public.get_public_site_banners() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Draft creation: also provision a banner draft for brand-new categories.
-- ---------------------------------------------------------------------------

create or replace function public.admin_create_taxonomy_item(
  p_item_type text,
  p_item_id text,
  p_parent_segment_id text,
  p_name_en text,
  p_name_bn text,
  p_sort_order integer
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_item_type text := lower(nullif(btrim(p_item_type), ''));
  v_item_id text := lower(nullif(btrim(p_item_id), ''));
  v_parent_segment_id text := nullif(btrim(p_parent_segment_id), '');
  v_name_en text := nullif(btrim(p_name_en), '');
  v_name_bn text := nullif(btrim(p_name_bn), '');
  v_slug text;
  v_created jsonb;
  v_schema_id uuid;
  v_banner jsonb;
begin
  if not public.is_active_admin() or not public.has_permission('categories.manage') then
    raise exception 'Access denied.' using errcode='42501';
  end if;

  if v_item_type not in ('segment','subcategory') then
    raise exception 'Invalid taxonomy item type.' using errcode='22023';
  end if;

  if v_item_id is null or v_item_id !~ '^[a-z0-9]+(?:_[a-z0-9]+)*$' then
    raise exception 'ID must use lowercase letters, numbers, and underscores only.' using errcode='22023';
  end if;

  if v_name_en is null or v_name_bn is null then
    raise exception 'Both English and Bangla names are required.' using errcode='22023';
  end if;

  if p_sort_order is null or p_sort_order < 1 or p_sort_order > 999 then
    raise exception 'Sort order must be an integer from 1 to 999.' using errcode='22023';
  end if;

  if v_item_type = 'segment' then
    if exists(select 1 from public.segments where id=v_item_id) then
      raise exception 'Segment already exists: %', v_item_id using errcode='23505';
    end if;

    v_slug := replace(v_item_id,'_','-');

    if exists(select 1 from public.segments where slug=v_slug) then
      raise exception 'Category slug already exists: %', v_slug using errcode='23505';
    end if;

    insert into public.segments(
      id,name_en,name_bn,short_name_en,short_name_bn,
      description_en,description_bn,slug,icon_key,theme_key,
      active,sort_order,config_status
    )
    values(
      v_item_id,v_name_en,v_name_bn,v_name_en,v_name_bn,
      '','',v_slug,'shield','sky',
      false,p_sort_order,'draft'
    );

    v_banner := jsonb_build_object(
      'titleBn',v_name_bn,
      'titleEn',v_name_en,
      'mobileDescriptionBn','',
      'mobileDescriptionEn','',
      'tabletDescriptionBn','',
      'tabletDescriptionEn','',
      'desktopDescriptionBn','',
      'desktopDescriptionEn','',
      'illustrationSrc','',
      'primaryCtaBn','রিপোর্ট করুন',
      'primaryCtaEn','Report now',
      'showOnHome',false,
      'isActive',false,
      'sortOrder',least(p_sort_order,99)
    );

    insert into public.site_banners(
      category_key,draft_content,published_content,draft_updated_by,published_by
    )
    values(v_item_id,v_banner,v_banner,auth.uid(),auth.uid())
    on conflict(category_key) do nothing;

    v_created := jsonb_build_object(
      'id',v_item_id,'item_type','segment','name_en',v_name_en,'name_bn',v_name_bn,
      'slug',v_slug,'active',false,'sort_order',p_sort_order,'config_status','draft'
    );
  else
    if v_parent_segment_id is null then
      raise exception 'Parent segment is required for a subcategory.' using errcode='22023';
    end if;

    if not exists(
      select 1 from public.segments
      where id=v_parent_segment_id and config_status <> 'archived'
    ) then
      raise exception 'Parent segment not found or archived: %', v_parent_segment_id using errcode='P0002';
    end if;

    if exists(select 1 from public.subcategories where id=v_item_id) then
      raise exception 'Subcategory already exists: %', v_item_id using errcode='23505';
    end if;

    insert into public.subcategories(
      id,segment_id,name_en,name_bn,description_en,description_bn,
      is_sensitive,active,sort_order,config_status
    )
    values(
      v_item_id,v_parent_segment_id,v_name_en,v_name_bn,'','',
      false,false,p_sort_order,'draft'
    );

    insert into public.reporting_form_schemas(
      scope_type,scope_id,version,status,engine_mode,notes,created_by
    )
    values(
      'subcategory',v_item_id,1,'draft','schema',
      'Initial Admin-created form schema draft. Not visible to Public.',auth.uid()
    )
    returning id into v_schema_id;

    insert into public.reporting_form_schema_fields(
      schema_id,field_key,field_type,storage_mode,storage_key,
      label_en,label_bn,helper_en,helper_bn,required,active,sort_order,options,validation,config
    ) values
      (v_schema_id,'title','text','core_column','title','Report title','প্রতিবেদনের শিরোনাম',
       'Keep it short and specific.','সংক্ষিপ্ত ও নির্দিষ্ট রাখুন।',true,true,10,'[]','{"maxLength":100}','{"locked":true}'),
      (v_schema_id,'description','textarea','core_column','description','What happened?','কি ঘটেছে?',
       'Describe the incident clearly.','ঘটনাটি স্পষ্টভাবে বর্ণনা করুন।',true,true,20,'[]','{"maxLength":2000}','{"locked":true}'),
      (v_schema_id,'incident_date','date','core_column','incidentDate','Incident date','ঘটনার তারিখ',
       null,null,false,true,30,'[]','{}','{}'),
      (v_schema_id,'location','location','system_block','location','Location','লোকেশন',
       null,null,true,true,40,'[]','{}','{"block":"location"}'),
      (v_schema_id,'evidence','evidence','system_block','evidence','Supporting information','সহায়ক তথ্য',
       null,null,false,true,90,'[]','{}','{"block":"evidence"}'),
      (v_schema_id,'privacy','privacy','system_block','privacy','Privacy','গোপনীয়তা',
       null,null,false,true,100,'[]','{}','{"block":"privacy"}');

    v_created := jsonb_build_object(
      'id',v_item_id,'item_type','subcategory','segment_id',v_parent_segment_id,
      'name_en',v_name_en,'name_bn',v_name_bn,'active',false,'sort_order',p_sort_order,
      'config_status','draft','form_schema_id',v_schema_id,'form_schema_version',1
    );
  end if;

  insert into public.admin_audit_logs(actor_id,action,target_type,target_id,details)
  values(auth.uid(),'taxonomy.draft_create',v_item_type,v_item_id,
    jsonb_build_object('item',v_created,'timestamp',clock_timestamp()));

  return jsonb_build_object('success',true,'item',v_created);
end;
$$;

revoke all on function public.admin_create_taxonomy_item(text,text,text,text,text,integer) from public, anon;
grant execute on function public.admin_create_taxonomy_item(text,text,text,text,text,integer) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Extended taxonomy configuration
-- ---------------------------------------------------------------------------

create or replace function public.admin_update_taxonomy_configuration(
  p_item_type text,
  p_item_id text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_type text := lower(nullif(btrim(p_item_type),''));
  v_id text := nullif(btrim(p_item_id),'');
  v_before jsonb;
  v_after jsonb;
  v_slug text;
begin
  if not public.is_active_admin() or not public.has_permission('categories.manage') then
    raise exception 'Access denied.' using errcode='42501';
  end if;

  if v_type not in ('segment','subcategory') or v_id is null
     or p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Invalid taxonomy configuration request.' using errcode='22023';
  end if;

  if v_type='segment' then
    select to_jsonb(s) into v_before from public.segments s where s.id=v_id for update;
    if v_before is null then raise exception 'Segment not found: %',v_id using errcode='P0002'; end if;

    v_slug := lower(coalesce(nullif(btrim(p_payload->>'slug'),''),(v_before->>'slug')));
    if v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
      raise exception 'Slug must use lowercase letters, numbers, and hyphens.' using errcode='22023';
    end if;
    if exists(select 1 from public.segments where slug=v_slug and id<>v_id) then
      raise exception 'Category slug already exists: %',v_slug using errcode='23505';
    end if;

    update public.segments
    set
      name_en=coalesce(nullif(btrim(p_payload->>'nameEn'),''),name_en),
      name_bn=coalesce(nullif(btrim(p_payload->>'nameBn'),''),name_bn),
      short_name_en=coalesce(nullif(btrim(p_payload->>'shortNameEn'),''),short_name_en,name_en),
      short_name_bn=coalesce(nullif(btrim(p_payload->>'shortNameBn'),''),short_name_bn,name_bn),
      description_en=coalesce(p_payload->>'descriptionEn',description_en,''),
      description_bn=coalesce(p_payload->>'descriptionBn',description_bn,''),
      slug=v_slug,
      icon_key=coalesce(nullif(btrim(p_payload->>'iconKey'),''),icon_key,'shield'),
      theme_key=coalesce(nullif(btrim(p_payload->>'themeKey'),''),theme_key,'sky'),
      sort_order=coalesce((p_payload->>'sortOrder')::integer,sort_order)
    where id=v_id;

    select to_jsonb(s) into v_after from public.segments s where s.id=v_id;
  else
    select to_jsonb(sc) into v_before from public.subcategories sc where sc.id=v_id for update;
    if v_before is null then raise exception 'Subcategory not found: %',v_id using errcode='P0002'; end if;

    update public.subcategories
    set
      name_en=coalesce(nullif(btrim(p_payload->>'nameEn'),''),name_en),
      name_bn=coalesce(nullif(btrim(p_payload->>'nameBn'),''),name_bn),
      description_en=coalesce(p_payload->>'descriptionEn',description_en,''),
      description_bn=coalesce(p_payload->>'descriptionBn',description_bn,''),
      category_group=case
        when p_payload ? 'categoryGroup' then nullif(btrim(p_payload->>'categoryGroup'),'')
        else category_group end,
      is_sensitive=case
        when p_payload ? 'isSensitive' then coalesce((p_payload->>'isSensitive')::boolean,false)
        else is_sensitive end,
      sort_order=coalesce((p_payload->>'sortOrder')::integer,sort_order)
    where id=v_id;

    select to_jsonb(sc) into v_after from public.subcategories sc where sc.id=v_id;
  end if;

  insert into public.admin_audit_logs(actor_id,action,target_type,target_id,details)
  values(auth.uid(),'taxonomy.configuration_update',v_type,v_id,
    jsonb_build_object('before',v_before,'after',v_after,'timestamp',clock_timestamp()));

  return jsonb_build_object('success',true,'item',v_after);
end;
$$;

revoke all on function public.admin_update_taxonomy_configuration(text,text,jsonb) from public, anon;
grant execute on function public.admin_update_taxonomy_configuration(text,text,jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Safe re-parenting
-- ---------------------------------------------------------------------------

create or replace function public.admin_move_subcategory(
  p_subcategory_id text,
  p_target_segment_id text,
  p_sort_order integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_sub public.subcategories%rowtype;
  v_old_segment text;
  v_report_count integer;
begin
  if not public.is_active_admin() or not public.has_permission('categories.manage') then
    raise exception 'Access denied.' using errcode='42501';
  end if;

  select * into v_sub
  from public.subcategories
  where id=p_subcategory_id
  for update;

  if v_sub.id is null then
    raise exception 'Subcategory not found.' using errcode='P0002';
  end if;

  if not exists(
    select 1 from public.segments
    where id=p_target_segment_id and config_status <> 'archived'
  ) then
    raise exception 'Target category not found or archived.' using errcode='P0002';
  end if;

  if v_sub.segment_id=p_target_segment_id then
    return jsonb_build_object('success',true,'moved',false,'subcategoryId',v_sub.id);
  end if;

  v_old_segment := v_sub.segment_id;
  select count(*) into v_report_count from public.complaints where subcategory_id=v_sub.id;

  update public.subcategories
  set
    segment_id=p_target_segment_id,
    sort_order=coalesce(p_sort_order,sort_order),
    active=false,
    config_status=case when config_status='draft' then 'draft' else 'ready' end
  where id=v_sub.id;

  insert into public.admin_audit_logs(actor_id,action,target_type,target_id,details)
  values(auth.uid(),'taxonomy.subcategory_move','subcategory',v_sub.id,
    jsonb_build_object(
      'from_segment_id',v_old_segment,
      'to_segment_id',p_target_segment_id,
      'historical_report_count',v_report_count,
      'historical_reports_preserved_by_snapshot',true,
      'reactivation_required',true,
      'timestamp',clock_timestamp()
    ));

  return jsonb_build_object(
    'success',true,'moved',true,'subcategoryId',v_sub.id,
    'fromSegmentId',v_old_segment,'toSegmentId',p_target_segment_id,
    'historicalReportCount',v_report_count,'configStatus',
    (select config_status from public.subcategories where id=v_sub.id)
  );
end;
$$;

revoke all on function public.admin_move_subcategory(text,text,integer) from public, anon;
grant execute on function public.admin_move_subcategory(text,text,integer) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Form Builder read/save/publish
-- ---------------------------------------------------------------------------

create or replace function public.admin_get_reporting_form(p_subcategory_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_schema public.reporting_form_schemas%rowtype;
  v_fields jsonb;
begin
  if not public.is_active_admin() or not public.has_permission('categories.view') then
    raise exception 'Access denied.' using errcode='42501';
  end if;

  if not exists(select 1 from public.subcategories where id=p_subcategory_id) then
    raise exception 'Subcategory not found.' using errcode='P0002';
  end if;

  select * into v_schema
  from public.reporting_form_schemas
  where scope_type='subcategory' and scope_id=p_subcategory_id
  order by
    case status when 'draft' then 0 when 'published' then 1 else 2 end,
    version desc
  limit 1;

  if v_schema.id is null then
    return jsonb_build_object('schema',null,'fields','[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',f.id,
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
  ) order by f.sort_order,f.field_key),'[]'::jsonb)
  into v_fields
  from public.reporting_form_schema_fields f
  where f.schema_id=v_schema.id;

  return jsonb_build_object(
    'schema',jsonb_build_object(
      'id',v_schema.id,'scopeType',v_schema.scope_type,'scopeId',v_schema.scope_id,
      'version',v_schema.version,'status',v_schema.status,'engineMode',v_schema.engine_mode,
      'notes',v_schema.notes,'updatedAt',v_schema.updated_at,'publishedAt',v_schema.published_at
    ),
    'fields',v_fields
  );
end;
$$;

revoke all on function public.admin_get_reporting_form(text) from public, anon;
grant execute on function public.admin_get_reporting_form(text) to authenticated;

create or replace function public.admin_save_reporting_form_draft(
  p_subcategory_id text,
  p_fields jsonb,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_schema public.reporting_form_schemas%rowtype;
  v_source public.reporting_form_schemas%rowtype;
  v_field jsonb;
begin
  if not public.is_active_admin() or not public.has_permission('categories.manage') then
    raise exception 'Access denied.' using errcode='42501';
  end if;

  if not exists(select 1 from public.subcategories where id=p_subcategory_id) then
    raise exception 'Subcategory not found.' using errcode='P0002';
  end if;

  perform public.validate_reporting_form_fields(p_fields);

  select * into v_schema
  from public.reporting_form_schemas
  where scope_type='subcategory' and scope_id=p_subcategory_id and status='draft'
  order by version desc limit 1
  for update;

  if v_schema.id is null then
    select * into v_source
    from public.reporting_form_schemas
    where scope_type='subcategory' and scope_id=p_subcategory_id
    order by version desc limit 1;

    insert into public.reporting_form_schemas(
      scope_type,scope_id,version,status,engine_mode,notes,created_by
    )
    values(
      'subcategory',p_subcategory_id,coalesce(v_source.version,0)+1,'draft','schema',
      coalesce(p_notes,'Admin form-builder draft. Not visible to Public.'),auth.uid()
    )
    returning * into v_schema;
  else
    update public.reporting_form_schemas
    set engine_mode='schema',notes=coalesce(p_notes,notes),updated_at=now()
    where id=v_schema.id
    returning * into v_schema;
  end if;

  delete from public.reporting_form_schema_fields where schema_id=v_schema.id;

  for v_field in select * from jsonb_array_elements(p_fields)
  loop
    insert into public.reporting_form_schema_fields(
      schema_id,field_key,field_type,storage_mode,storage_key,
      label_en,label_bn,helper_en,helper_bn,placeholder_en,placeholder_bn,
      required,active,sort_order,options,validation,config
    )
    values(
      v_schema.id,
      lower(btrim(v_field->>'fieldKey')),
      lower(btrim(v_field->>'fieldType')),
      lower(btrim(v_field->>'storageMode')),
      btrim(v_field->>'storageKey'),
      btrim(v_field->>'labelEn'),
      btrim(v_field->>'labelBn'),
      nullif(btrim(v_field->>'helperEn'),''),
      nullif(btrim(v_field->>'helperBn'),''),
      nullif(btrim(v_field->>'placeholderEn'),''),
      nullif(btrim(v_field->>'placeholderBn'),''),
      coalesce((v_field->>'required')::boolean,false),
      coalesce((v_field->>'active')::boolean,true),
      (v_field->>'sortOrder')::integer,
      coalesce(v_field->'options','[]'::jsonb),
      coalesce(v_field->'validation','{}'::jsonb),
      coalesce(v_field->'config','{}'::jsonb)
    );
  end loop;

  insert into public.admin_audit_logs(actor_id,action,target_type,target_id,details)
  values(auth.uid(),'reporting_form_schema.draft_save','subcategory',p_subcategory_id,
    jsonb_build_object('schema_id',v_schema.id,'version',v_schema.version,
      'field_count',jsonb_array_length(p_fields),'timestamp',clock_timestamp()));

  return jsonb_build_object(
    'success',true,'schemaId',v_schema.id,'version',v_schema.version,
    'fieldCount',jsonb_array_length(p_fields),'status','draft'
  );
end;
$$;

revoke all on function public.admin_save_reporting_form_draft(text,jsonb,text) from public, anon;
grant execute on function public.admin_save_reporting_form_draft(text,jsonb,text) to authenticated;

create or replace function public.admin_publish_reporting_form(p_subcategory_id text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_draft public.reporting_form_schemas%rowtype;
  v_fields jsonb;
begin
  if not public.is_active_admin() or not public.has_permission('categories.manage') then
    raise exception 'Access denied.' using errcode='42501';
  end if;

  select * into v_draft
  from public.reporting_form_schemas
  where scope_type='subcategory' and scope_id=p_subcategory_id and status='draft'
  order by version desc limit 1
  for update;

  if v_draft.id is null then
    raise exception 'No form draft exists for this subcategory.' using errcode='P0002';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'fieldKey',f.field_key,'fieldType',f.field_type,'storageMode',f.storage_mode,
    'storageKey',f.storage_key,'labelEn',f.label_en,'labelBn',f.label_bn,
    'helperEn',f.helper_en,'helperBn',f.helper_bn,'placeholderEn',f.placeholder_en,
    'placeholderBn',f.placeholder_bn,'required',f.required,'active',f.active,
    'sortOrder',f.sort_order,'options',f.options,'validation',f.validation,'config',f.config
  ) order by f.sort_order,f.field_key),'[]'::jsonb)
  into v_fields
  from public.reporting_form_schema_fields f
  where f.schema_id=v_draft.id;

  perform public.validate_reporting_form_fields(v_fields);

  update public.reporting_form_schemas
  set status='archived'
  where scope_type='subcategory'
    and scope_id=p_subcategory_id
    and status='published';

  update public.reporting_form_schemas
  set status='published',engine_mode='schema',published_by=auth.uid(),
      published_at=now(),updated_at=now()
  where id=v_draft.id;

  update public.subcategories
  set config_status=case when config_status='draft' then 'ready' else config_status end
  where id=p_subcategory_id;

  insert into public.admin_audit_logs(actor_id,action,target_type,target_id,details)
  values(auth.uid(),'reporting_form_schema.publish','subcategory',p_subcategory_id,
    jsonb_build_object('schema_id',v_draft.id,'version',v_draft.version,
      'field_count',jsonb_array_length(v_fields),'timestamp',clock_timestamp()));

  return jsonb_build_object(
    'success',true,'schemaId',v_draft.id,'version',v_draft.version,'status','published'
  );
end;
$$;

revoke all on function public.admin_publish_reporting_form(text) from public, anon;
grant execute on function public.admin_publish_reporting_form(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Taxonomy publish lifecycle
-- ---------------------------------------------------------------------------

create or replace function public.admin_publish_taxonomy_item(
  p_item_type text,
  p_item_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_type text := lower(nullif(btrim(p_item_type),''));
  v_banner public.site_banners%rowtype;
  v_sub public.subcategories%rowtype;
begin
  if not public.is_active_admin() or not public.has_permission('categories.manage') then
    raise exception 'Access denied.' using errcode='42501';
  end if;

  if v_type='segment' then
    if not exists(
      select 1 from public.segments
      where id=p_item_id
        and nullif(btrim(name_en),'') is not null
        and nullif(btrim(name_bn),'') is not null
        and nullif(btrim(description_en),'') is not null
        and nullif(btrim(description_bn),'') is not null
        and nullif(btrim(slug),'') is not null
    ) then
      raise exception 'Category details are incomplete. Add bilingual descriptions before publishing.'
        using errcode='22023';
    end if;

    select * into v_banner from public.site_banners where category_key=p_item_id for update;
    if v_banner.category_key is null then
      raise exception 'Configure this category banner before publishing.' using errcode='22023';
    end if;

    if nullif(btrim(v_banner.draft_content->>'illustrationSrc'),'') is null
       or nullif(btrim(v_banner.draft_content->>'mobileDescriptionEn'),'') is null
       or nullif(btrim(v_banner.draft_content->>'mobileDescriptionBn'),'') is null
       or nullif(btrim(v_banner.draft_content->>'desktopDescriptionEn'),'') is null
       or nullif(btrim(v_banner.draft_content->>'desktopDescriptionBn'),'') is null then
      raise exception 'Banner draft is incomplete. Add an image and bilingual descriptions before publishing.'
        using errcode='22023';
    end if;

    update public.site_banners
    set published_content=draft_content,published_at=now(),published_by=auth.uid(),version=version+1
    where category_key=p_item_id;

    update public.segments
    set config_status='published',active=true
    where id=p_item_id;

    if not found then raise exception 'Category not found.' using errcode='P0002'; end if;
  elsif v_type='subcategory' then
    select * into v_sub from public.subcategories where id=p_item_id for update;
    if v_sub.id is null then raise exception 'Subcategory not found.' using errcode='P0002'; end if;

    if not exists(
      select 1 from public.segments
      where id=v_sub.segment_id and config_status='published' and active=true
    ) then
      raise exception 'Parent category must be published and active first.' using errcode='22023';
    end if;

    if not exists(
      select 1 from public.reporting_form_schemas
      where scope_type='subcategory' and scope_id=p_item_id
        and status='published' and engine_mode in ('legacy','schema')
    ) then
      raise exception 'Publish a reporting form before publishing this subcategory.' using errcode='22023';
    end if;

    update public.subcategories
    set config_status='published',active=true
    where id=p_item_id;
  else
    raise exception 'Invalid taxonomy item type.' using errcode='22023';
  end if;

  insert into public.admin_audit_logs(actor_id,action,target_type,target_id,details)
  values(auth.uid(),'taxonomy.publish',v_type,p_item_id,
    jsonb_build_object('timestamp',clock_timestamp()));

  return jsonb_build_object('success',true,'itemType',v_type,'id',p_item_id,'active',true,'configStatus','published');
end;
$$;

revoke all on function public.admin_publish_taxonomy_item(text,text) from public, anon;
grant execute on function public.admin_publish_taxonomy_item(text,text) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Public dynamic reporting configuration contract
-- ---------------------------------------------------------------------------

create or replace function public.get_public_reporting_configuration()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_segments jsonb;
  v_subcategories jsonb;
  v_forms jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',s.id,'slug',s.slug,'nameEn',s.name_en,'nameBn',s.name_bn,
    'shortNameEn',coalesce(s.short_name_en,s.name_en),
    'shortNameBn',coalesce(s.short_name_bn,s.name_bn),
    'descriptionEn',coalesce(s.description_en,''),
    'descriptionBn',coalesce(s.description_bn,''),
    'iconKey',coalesce(s.icon_key,'shield'),
    'themeKey',coalesce(s.theme_key,'sky'),
    'sortOrder',s.sort_order
  ) order by s.sort_order,s.id),'[]'::jsonb)
  into v_segments
  from public.segments s
  where s.active=true and s.config_status='published';

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',sc.id,'segmentId',sc.segment_id,'nameEn',sc.name_en,'nameBn',sc.name_bn,
    'descriptionEn',coalesce(sc.description_en,''),
    'descriptionBn',coalesce(sc.description_bn,''),
    'categoryGroup',sc.category_group,'isSensitive',sc.is_sensitive,
    'sortOrder',sc.sort_order
  ) order by sc.segment_id,sc.sort_order,sc.id),'[]'::jsonb)
  into v_subcategories
  from public.subcategories sc
  join public.segments s on s.id=sc.segment_id
  where sc.active=true and sc.config_status='published'
    and s.active=true and s.config_status='published';

  select coalesce(jsonb_agg(jsonb_build_object(
    'subcategoryId',rfs.scope_id,
    'schemaId',rfs.id,
    'version',rfs.version,
    'engineMode',rfs.engine_mode,
    'fields',coalesce((
      select jsonb_agg(jsonb_build_object(
        'fieldKey',f.field_key,'fieldType',f.field_type,'storageMode',f.storage_mode,
        'storageKey',f.storage_key,'labelEn',f.label_en,'labelBn',f.label_bn,
        'helperEn',f.helper_en,'helperBn',f.helper_bn,
        'placeholderEn',f.placeholder_en,'placeholderBn',f.placeholder_bn,
        'required',f.required,'active',f.active,'sortOrder',f.sort_order,
        'options',f.options,'validation',f.validation,'config',f.config
      ) order by f.sort_order,f.field_key)
      from public.reporting_form_schema_fields f
      where f.schema_id=rfs.id and f.active=true
    ),'[]'::jsonb)
  ) order by rfs.scope_id),'[]'::jsonb)
  into v_forms
  from public.reporting_form_schemas rfs
  join public.subcategories sc on sc.id=rfs.scope_id
  join public.segments s on s.id=sc.segment_id
  where rfs.scope_type='subcategory' and rfs.status='published'
    and sc.active=true and sc.config_status='published'
    and s.active=true and s.config_status='published';

  return jsonb_build_object(
    'segments',v_segments,
    'subcategories',v_subcategories,
    'forms',v_forms
  );
end;
$$;

revoke all on function public.get_public_reporting_configuration() from public;
grant execute on function public.get_public_reporting_configuration() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 9. Seed editable schema drafts (v2) for existing legacy subcategories.
--    They remain drafts and do not affect Public until explicitly published.
-- ---------------------------------------------------------------------------

insert into public.reporting_form_schemas(
  scope_type,scope_id,version,status,engine_mode,notes,created_by
)
select 'subcategory',sc.id,
       coalesce((select max(version) from public.reporting_form_schemas x
                 where x.scope_type='subcategory' and x.scope_id=sc.id),0)+1,
       'draft','schema',
       'Editable baseline generated from the existing reporting journey. Not visible until explicitly published.',
       null
from public.subcategories sc
where not exists(
  select 1 from public.reporting_form_schemas d
  where d.scope_type='subcategory' and d.scope_id=sc.id and d.status='draft'
);

-- Core baseline fields.
insert into public.reporting_form_schema_fields(
  schema_id,field_key,field_type,storage_mode,storage_key,
  label_en,label_bn,helper_en,helper_bn,required,active,sort_order,options,validation,config
)
select s.id,v.field_key,v.field_type,v.storage_mode,v.storage_key,
       v.label_en,v.label_bn,v.helper_en,v.helper_bn,v.required,v.active,v.sort_order,
       v.options::jsonb,v.validation::jsonb,v.config::jsonb
from public.reporting_form_schemas s
join public.subcategories sc on sc.id=s.scope_id
cross join lateral (
  values
    ('title','text','core_column','title','Report title','প্রতিবেদনের শিরোনাম',
     'Keep it short and specific.','সংক্ষিপ্ত ও নির্দিষ্ট রাখুন।',true,true,10,'[]','{"maxLength":100}','{"locked":true}'),
    ('description','textarea','core_column','description','What happened?','কি ঘটেছে?',
     'Describe the incident clearly.','ঘটনাটি স্পষ্টভাবে বর্ণনা করুন।',true,true,20,'[]','{"maxLength":2000}','{"locked":true}'),
    ('incident_date','date','core_column','incidentDate','Incident date','ঘটনার তারিখ',
     null,null,false,true,30,'[]','{}','{}'),
    ('incident_time','time','core_column','incidentTime','Incident time','ঘটনার সময়',
     null,null,false,true,40,'[]','{}','{}'),
    ('frequency','radio','core_column','frequency','Frequency','পুনরাবৃত্তি',
     null,null,true,true,50,
     '[{"value":"one-time","labelEn":"One-time","labelBn":"এককালীন"},{"value":"repeated","labelEn":"Repeated","labelBn":"একাধিকবার"}]',
     '{}','{}'),
    ('location','location','system_block','location','Location','লোকেশন',
     null,null,true,true,60,'[]','{}','{"block":"location"}'),
    ('evidence','evidence','system_block','evidence','Supporting information','সহায়ক তথ্য',
     null,null,false,true,900,'[]','{}','{"block":"evidence"}'),
    ('privacy','privacy','system_block','privacy','Privacy','গোপনীয়তা',
     null,null,false,true,910,'[]','{}','{"block":"privacy"}')
) as v(field_key,field_type,storage_mode,storage_key,label_en,label_bn,helper_en,helper_bn,required,active,sort_order,options,validation,config)
where s.scope_type='subcategory' and s.status='draft' and s.engine_mode='schema'
  and not exists(select 1 from public.reporting_form_schema_fields f where f.schema_id=s.id);

-- Hide incident time for categories where the existing journey does not use it.
update public.reporting_form_schema_fields f
set active=false
from public.reporting_form_schemas s
join public.subcategories sc on sc.id=s.scope_id
where f.schema_id=s.id and f.field_key='incident_time'
  and s.status='draft'
  and (sc.id='excess-electricity-bill' or sc.segment_id='illegal_occupation');

-- Optional party block for current categories that already support party details.
insert into public.reporting_form_schema_fields(
  schema_id,field_key,field_type,storage_mode,storage_key,label_en,label_bn,
  required,active,sort_order,options,validation,config
)
select s.id,'subject_party','subject_party','system_block','subjectParty',
       'Related person / organization','সংশ্লিষ্ট ব্যক্তি / প্রতিষ্ঠান',
       false,true,70,'[]','{}','{"block":"subject_party"}'
from public.reporting_form_schemas s
join public.subcategories sc on sc.id=s.scope_id
where s.status='draft'
  and sc.segment_id in ('rickshaw','extortion','public_safety','road_transport','illegal_occupation')
  and not exists(select 1 from public.reporting_form_schema_fields f
                 where f.schema_id=s.id and f.field_key='subject_party');

-- Harassment classification fields.
insert into public.reporting_form_schema_fields(
  schema_id,field_key,field_type,storage_mode,storage_key,label_en,label_bn,
  required,active,sort_order,options,validation,config
)
select s.id,v.field_key,v.field_type,'core_column',v.storage_key,v.label_en,v.label_bn,
       v.required,true,v.sort_order,v.options::jsonb,'{}','{}'
from public.reporting_form_schemas s
join public.subcategories sc on sc.id=s.scope_id
cross join lateral (
  values
    ('affected_person_age_group','select','affectedPersonAgeGroup','Affected person''s age group','প্রভাবিত ব্যক্তির বয়স',true,22,
     '[{"value":"under_18","labelEn":"Under 18","labelBn":"১৮ বছরের কম"},{"value":"18_29","labelEn":"18–29","labelBn":"১৮–২৯"},{"value":"30_59","labelEn":"30–59","labelBn":"৩০–৫৯"},{"value":"60_plus","labelEn":"60+","labelBn":"৬০+"},{"value":"prefer_not_to_say","labelEn":"Prefer not to say","labelBn":"বলতে অনিচ্ছুক"}]'),
    ('alleged_abuser_relationship','select','allegedAbuserRelationship','Relationship with alleged abuser','অভিযুক্ত ব্যক্তির সঙ্গে সম্পর্ক',true,23,
     '[{"value":"intimate_partner","labelEn":"Intimate partner","labelBn":"ঘনিষ্ঠ সঙ্গী"},{"value":"household_family","labelEn":"Household / family","labelBn":"পরিবার / একই পরিবারের সদস্য"},{"value":"other_relative","labelEn":"Other relative","labelBn":"অন্যান্য আত্মীয়"},{"value":"friend_acquaintance","labelEn":"Friend / acquaintance","labelBn":"বন্ধু / পরিচিত"},{"value":"coworker_classmate","labelEn":"Coworker / classmate","labelBn":"সহকর্মী / সহপাঠী"},{"value":"authority_caregiver_service_provider","labelEn":"Authority / caregiver / service provider","labelBn":"কর্তৃপক্ষ / সেবাদাতা"},{"value":"stranger","labelEn":"Stranger","labelBn":"অপরিচিত"},{"value":"other_or_unknown","labelEn":"Other / unknown","labelBn":"অন্যান্য / অজানা"}]'),
    ('reporting_for','radio','reportingFor','Who are you reporting for?','কার জন্য প্রতিবেদন করছেন?',true,24,
     '[{"value":"self","labelEn":"Myself","labelBn":"নিজের জন্য"},{"value":"someone_else","labelEn":"Someone else","labelBn":"অন্য কারও জন্য"}]'),
    ('relationship_context','textarea','relationshipContext','Additional relationship context','সম্পর্কের অতিরিক্ত প্রেক্ষাপট',false,25,'[]')
) as v(field_key,field_type,storage_key,label_en,label_bn,required,sort_order,options)
where s.status='draft' and sc.segment_id='harassment'
  and not exists(select 1 from public.reporting_form_schema_fields f
                 where f.schema_id=s.id and f.field_key=v.field_key);

-- Utility-specific fields.
insert into public.reporting_form_schema_fields(
  schema_id,field_key,field_type,storage_mode,storage_key,label_en,label_bn,
  required,active,sort_order,options,validation,config
)
select s.id,v.field_key,v.field_type,'core_column',v.storage_key,v.label_en,v.label_bn,
       v.required,true,v.sort_order,'[]',v.validation::jsonb,'{}'
from public.reporting_form_schemas s
join public.subcategories sc on sc.id=s.scope_id
cross join lateral (
  values
    ('utility_end_time','time','utilityEndTime','End time','শেষ সময়',false,41,'{}')
) as v(field_key,field_type,storage_key,label_en,label_bn,required,sort_order,validation)
where s.status='draft' and sc.id in ('load-shedding-outage','gas-shortage')
  and not exists(select 1 from public.reporting_form_schema_fields f where f.schema_id=s.id and f.field_key=v.field_key);

update public.reporting_form_schema_fields f
set required=true
from public.reporting_form_schemas s
where f.schema_id=s.id and s.status='draft' and f.field_key='incident_time'
  and s.scope_id in ('load-shedding-outage','gas-shortage');

insert into public.reporting_form_schema_fields(
  schema_id,field_key,field_type,storage_mode,storage_key,label_en,label_bn,
  required,active,sort_order,options,validation,config
)
select s.id,v.field_key,v.field_type,'core_column',v.storage_key,v.label_en,v.label_bn,
       true,true,v.sort_order,'[]',v.validation::jsonb,'{}'
from public.reporting_form_schemas s
cross join lateral (
  values
    ('recent_bill_month','month','recentBillMonth','Recent bill month','সাম্প্রতিক বিলের মাস',31,'{}'),
    ('recent_bill_amount','currency','recentBillAmount','Recent bill amount','সাম্প্রতিক বিলের পরিমাণ',32,'{"min":0.01}'),
    ('previous_bill_month','month','previousBillMonth','Previous bill month','পূর্ববর্তী বিলের মাস',33,'{}'),
    ('previous_bill_amount','currency','previousBillAmount','Previous bill amount','পূর্ববর্তী বিলের পরিমাণ',34,'{"min":0.01}')
) as v(field_key,field_type,storage_key,label_en,label_bn,sort_order,validation)
where s.status='draft' and s.scope_id='excess-electricity-bill'
  and not exists(select 1 from public.reporting_form_schema_fields f where f.schema_id=s.id and f.field_key=v.field_key);

-- Bribery service fields.
insert into public.reporting_form_schema_fields(
  schema_id,field_key,field_type,storage_mode,storage_key,label_en,label_bn,
  required,active,sort_order,options,validation,config
)
select s.id,v.field_key,v.field_type,'core_column',v.storage_key,v.label_en,v.label_bn,
       v.required,true,v.sort_order,'[]',v.validation::jsonb,'{}'
from public.reporting_form_schemas s
cross join lateral (
  values
    ('bribery_department','text','briberyDepartment','Department / office','দপ্তর / অফিস',true,26,'{}'),
    ('bribery_service','text','briberyService','Service / process','সেবা / প্রক্রিয়া',true,27,'{}'),
    ('bribery_amount','currency','briberyAmount','Amount demanded / paid','দাবিকৃত / প্রদত্ত অর্থ',false,28,'{"min":0.01}')
) as v(field_key,field_type,storage_key,label_en,label_bn,required,sort_order,validation)
where s.status='draft' and s.scope_id='bribe-demanded-service'
  and not exists(select 1 from public.reporting_form_schema_fields f where f.schema_id=s.id and f.field_key=v.field_key);

-- Mob Justice stays an existing protected system block when converted to schema mode.
insert into public.reporting_form_schema_fields(
  schema_id,field_key,field_type,storage_mode,storage_key,label_en,label_bn,
  required,active,sort_order,options,validation,config
)
select s.id,'mob_justice_details','mob_justice_details','system_block','mobJusticeDetails',
       'Mob Justice details','মব সহিংসতার বিস্তারিত',true,true,29,'[]','{}','{"block":"mob_justice_details"}'
from public.reporting_form_schemas s
where s.status='draft' and s.scope_id='mob-justice'
  and not exists(select 1 from public.reporting_form_schema_fields f
                 where f.schema_id=s.id and f.field_key='mob_justice_details');

commit;
