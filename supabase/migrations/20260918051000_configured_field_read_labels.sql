-- Add bilingual option metadata to configured-answer read contracts.

begin;

create or replace function public.admin_get_complaint_configured_fields(p_complaint_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_complaint public.complaints%rowtype;
  v_schema_id uuid;
  v_fields jsonb;
begin
  if not public.is_active_admin()
     or not (public.has_permission('complaints.view') or public.has_permission('complaints.manage')) then
    raise exception 'Access denied.' using errcode='42501';
  end if;

  select * into v_complaint from public.complaints where id=p_complaint_id;
  if v_complaint.id is null then
    raise exception 'Complaint not found.' using errcode='P0002';
  end if;

  select id into v_schema_id
  from public.reporting_form_schemas
  where scope_type='subcategory' and scope_id=v_complaint.subcategory_id
    and version=v_complaint.form_schema_version
  order by case status when 'published' then 0 else 1 end
  limit 1;

  if v_schema_id is null then
    return jsonb_build_object(
      'formSchemaVersion',v_complaint.form_schema_version,
      'answers',v_complaint.custom_field_answers,
      'fields','[]'::jsonb
    );
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'fieldKey',f.field_key,
    'labelEn',f.label_en,
    'labelBn',f.label_bn,
    'fieldType',f.field_type,
    'storageMode',f.storage_mode,
    'storageKey',f.storage_key,
    'sortOrder',f.sort_order,
    'options',f.options,
    'config',f.config,
    'value',case
      when f.storage_mode='custom_json' then v_complaint.custom_field_answers->f.storage_key
      else null
    end
  ) order by f.sort_order,f.field_key),'[]'::jsonb)
  into v_fields
  from public.reporting_form_schema_fields f
  where f.schema_id=v_schema_id and f.active=true;

  return jsonb_build_object(
    'formSchemaVersion',v_complaint.form_schema_version,
    'answers',v_complaint.custom_field_answers,
    'fields',v_fields
  );
end;
$$;

revoke all on function public.admin_get_complaint_configured_fields(text) from public, anon;
grant execute on function public.admin_get_complaint_configured_fields(text) to authenticated;

create or replace function public.get_public_report_configured_fields(p_report_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_complaint public.complaints%rowtype;
  v_schema_id uuid;
  v_fields jsonb;
begin
  select * into v_complaint
  from public.complaints
  where id=p_report_id and status='published';

  if v_complaint.id is null then
    return jsonb_build_object('fields','[]'::jsonb);
  end if;

  select id into v_schema_id
  from public.reporting_form_schemas
  where scope_type='subcategory' and scope_id=v_complaint.subcategory_id
    and version=v_complaint.form_schema_version
  order by case status when 'published' then 0 else 1 end
  limit 1;

  if v_schema_id is null then
    return jsonb_build_object('fields','[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'fieldKey',f.field_key,
    'labelEn',f.label_en,
    'labelBn',f.label_bn,
    'fieldType',f.field_type,
    'sortOrder',f.sort_order,
    'options',f.options,
    'value',v_complaint.custom_field_answers->f.storage_key
  ) order by f.sort_order,f.field_key),'[]'::jsonb)
  into v_fields
  from public.reporting_form_schema_fields f
  where f.schema_id=v_schema_id
    and f.active=true
    and f.storage_mode='custom_json'
    and f.field_type not in ('phone','email')
    and coalesce((f.config->>'publicVisible')::boolean,true)=true
    and v_complaint.custom_field_answers ? f.storage_key;

  return jsonb_build_object('fields',v_fields);
end;
$$;

revoke all on function public.get_public_report_configured_fields(text) from public;
grant execute on function public.get_public_report_configured_fields(text) to anon, authenticated;

commit;
