-- Complete dynamic reporting-form validation and allow editable display identities
-- for the protected Title/Description core fields while preserving their storage mapping.

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
  v_platform_max integer;
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

    if v_storage_mode='core_column' and v_storage_key in ('title','description') then
      if v_type not in ('text','textarea') then
        raise exception 'Core field % must remain text-compatible.', v_storage_key using errcode='22023';
      end if;

      if not coalesce((v_field->>'active')::boolean,true)
         or not coalesce((v_field->>'required')::boolean,false) then
        raise exception 'Core field % must remain active and required.', v_storage_key using errcode='22023';
      end if;

      v_platform_max := case when v_storage_key='title' then 100 else 2000 end;
      if v_field->'validation' ? 'maxLength'
         and (v_field->'validation'->>'maxLength')::integer > v_platform_max then
        raise exception 'Core field % cannot exceed platform maximum %.', v_storage_key, v_platform_max
          using errcode='22023';
      end if;

      if v_storage_key='title' then
        v_has_title := true;
      else
        v_has_description := true;
      end if;
    end if;
  end loop;

  if not v_has_title then
    raise exception 'Every form must keep the required Title storage field.' using errcode='22023';
  end if;

  if not v_has_description then
    raise exception 'Every form must keep the required Description storage field.' using errcode='22023';
  end if;
end;
$$;

revoke all on function public.validate_reporting_form_fields(jsonb)
  from public, anon, authenticated;

create or replace function public.validate_configured_complaint_answers()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_schema public.reporting_form_schemas%rowtype;
  v_field public.reporting_form_schema_fields%rowtype;
  v_value jsonb;
  v_text text;
  v_num numeric;
  v_digits text;
begin
  if new.form_schema_version is null then
    return new;
  end if;

  select *
  into v_schema
  from public.reporting_form_schemas
  where scope_type='subcategory'
    and scope_id=new.subcategory_id
    and version=new.form_schema_version
    and status in ('published','archived')
  order by case status when 'published' then 0 else 1 end
  limit 1;

  if v_schema.id is null then
    raise exception 'VALIDATION_FAILED: Reporting form schema version is not available.';
  end if;

  if new.custom_field_answers is null
     or jsonb_typeof(new.custom_field_answers) <> 'object' then
    raise exception 'VALIDATION_FAILED: customFieldAnswers must be an object.';
  end if;

  for v_field in
    select *
    from public.reporting_form_schema_fields
    where schema_id=v_schema.id
      and active=true
      and storage_mode='custom_json'
    order by sort_order,field_key
  loop
    v_value := new.custom_field_answers->v_field.storage_key;

    if v_field.required then
      if v_value is null
         or v_value='null'::jsonb
         or (jsonb_typeof(v_value)='string' and nullif(btrim(v_value#>>'{}'),'') is null)
         or (jsonb_typeof(v_value)='array' and jsonb_array_length(v_value)=0)
         or (v_field.field_type='checkbox' and v_value='false'::jsonb)
      then
        raise exception 'VALIDATION_FAILED: Required field % is missing.', v_field.label_en;
      end if;
    end if;

    if v_value is null or v_value='null'::jsonb then
      continue;
    end if;

    if v_field.field_type='checkbox' then
      if jsonb_typeof(v_value) <> 'boolean' then
        raise exception 'VALIDATION_FAILED: Field % must be true or false.', v_field.label_en;
      end if;
      continue;
    end if;

    if v_field.field_type in ('text','textarea','phone','email','url','date','time','month','select','radio') then
      if jsonb_typeof(v_value) <> 'string' then
        raise exception 'VALIDATION_FAILED: Field % must contain text.', v_field.label_en;
      end if;

      v_text := nullif(btrim(v_value#>>'{}'),'');
      if v_text is not null
         and (v_field.validation ? 'minLength')
         and length(v_text) < (v_field.validation->>'minLength')::integer then
        raise exception 'VALIDATION_FAILED: Field % is shorter than its minimum length.', v_field.label_en;
      end if;

      if v_text is not null
         and (v_field.validation ? 'maxLength')
         and length(v_text) > (v_field.validation->>'maxLength')::integer then
        raise exception 'VALIDATION_FAILED: Field % exceeds its maximum length.', v_field.label_en;
      end if;

      if v_field.field_type='email'
         and v_text is not null
         and v_text !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
        raise exception 'VALIDATION_FAILED: Field % must be a valid email address.', v_field.label_en;
      end if;

      if v_field.field_type='url'
         and v_text is not null
         and v_text !~* '^https?://[^[:space:]]+$' then
        raise exception 'VALIDATION_FAILED: Field % must be a valid HTTP or HTTPS URL.', v_field.label_en;
      end if;

      if v_field.field_type='phone' and v_text is not null then
        if v_text !~ '^\+?[0-9 ()-]{7,25}$' then
          raise exception 'VALIDATION_FAILED: Field % must be a valid phone number.', v_field.label_en;
        end if;
        v_digits := regexp_replace(v_text,'[^0-9]','','g');
        if length(v_digits) < 7 or length(v_digits) > 15 then
          raise exception 'VALIDATION_FAILED: Field % must contain 7 to 15 digits.', v_field.label_en;
        end if;
      end if;
    end if;

    if v_field.field_type in ('number','currency') then
      begin
        v_num := (v_value#>>'{}')::numeric;
      exception when others then
        raise exception 'VALIDATION_FAILED: Field % must be a number.', v_field.label_en;
      end;

      if (v_field.validation ? 'min')
         and v_num < (v_field.validation->>'min')::numeric then
        raise exception 'VALIDATION_FAILED: Field % is below the minimum.', v_field.label_en;
      end if;

      if (v_field.validation ? 'max')
         and v_num > (v_field.validation->>'max')::numeric then
        raise exception 'VALIDATION_FAILED: Field % exceeds the maximum.', v_field.label_en;
      end if;
    end if;

    if v_field.field_type in ('select','radio')
       and jsonb_array_length(v_field.options)>0
       and not exists (
         select 1
         from jsonb_array_elements(v_field.options) option_row
         where option_row->>'value' = (v_value#>>'{}')
       ) then
      raise exception 'VALIDATION_FAILED: Invalid option for field %.', v_field.label_en;
    end if;

    if v_field.field_type='multiselect' then
      if jsonb_typeof(v_value) <> 'array' then
        raise exception 'VALIDATION_FAILED: Field % must contain a list.', v_field.label_en;
      end if;

      if exists(
        select 1
        from jsonb_array_elements_text(v_value) selected(value)
        where not exists(
          select 1
          from jsonb_array_elements(v_field.options) option_row
          where option_row->>'value'=selected.value
        )
      ) then
        raise exception 'VALIDATION_FAILED: Invalid option for field %.', v_field.label_en;
      end if;
    end if;
  end loop;

  return new;
end;
$$;

revoke all on function public.validate_configured_complaint_answers()
  from public, anon, authenticated;

drop trigger if exists complaints_validate_configured_answers
  on public.complaints;

create trigger complaints_validate_configured_answers
before insert or update of custom_field_answers, form_schema_version, subcategory_id
on public.complaints
for each row
execute function public.validate_configured_complaint_answers();
