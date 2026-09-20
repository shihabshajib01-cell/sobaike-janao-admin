-- Enforce the published reporting-form contract on the server.
-- Manual News Intake UI validation is not a security boundary.

CREATE OR REPLACE FUNCTION public.sourced_report_missing_required_fields_internal(
  p_subcategory_id text,
  p_report jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_schema_id uuid;
  v_field record;
  v_value jsonb;
  v_issues jsonb:='[]'::jsonb;
  v_storage_key text;
  v_field_key text;
  v_division text:=nullif(btrim(p_report->>'division'),'');
  v_district text:=nullif(btrim(p_report->>'district'),'');
  v_upazila text:=nullif(btrim(p_report->>'upazilaOrThana'),'');
  v_scope text:=coalesce(nullif(btrim(p_report->'customFieldAnswers'->>'locationScope'),''),'specific');
  v_has_specific boolean:=false;
  v_is_empty boolean:=false;
  v_text text;
  v_number numeric;
  v_invalid boolean:=false;
begin
  select r.id into v_schema_id
  from public.reporting_form_schemas r
  where r.scope_type='subcategory'
    and r.scope_id=p_subcategory_id
    and r.status='published'
    and r.engine_mode='schema'
  order by r.version desc
  limit 1;

  if v_schema_id is not null then
    for v_field in
      select
        f.field_key,
        f.field_type,
        f.storage_key,
        f.storage_mode,
        f.label_en,
        f.label_bn,
        f.required,
        coalesce(f.options,'[]'::jsonb) as options,
        coalesce(f.validation,'{}'::jsonb) as validation
      from public.reporting_form_schema_fields f
      where f.schema_id=v_schema_id
        and f.active=true
      order by f.sort_order,f.id
    loop
      v_storage_key:=coalesce(nullif(btrim(v_field.storage_key),''),v_field.field_key);
      v_field_key:=v_field.field_key;
      v_value:=null;
      v_invalid:=false;

      if v_field_key='title' or v_storage_key='title' then
        v_value:=to_jsonb(coalesce(nullif(btrim(p_report->>'titleBn'),''),nullif(btrim(p_report->>'titleEn'),'')));
      elsif v_field_key='description' or v_storage_key='description' then
        v_value:=to_jsonb(coalesce(nullif(btrim(p_report->>'descriptionBn'),''),nullif(btrim(p_report->>'descriptionEn'),'')));
      elsif v_field_key='location' or v_storage_key='location'
         or (v_field.storage_mode='system_block' and v_field.field_key='location') then
        if v_division is not null and v_district is not null then
          v_value:='true'::jsonb;
        end if;
      elsif v_field_key='mob_justice_details' or v_storage_key='mobJusticeDetails' then
        if jsonb_typeof(p_report->'mobJusticeDetails')='object'
           and p_report->'mobJusticeDetails'<>'{}'::jsonb then
          v_value:=p_report->'mobJusticeDetails';
        end if;
      else
        v_value:=coalesce(
          p_report->v_storage_key,
          p_report->v_field_key,
          p_report->'customFieldAnswers'->v_storage_key,
          p_report->'customFieldAnswers'->v_field_key
        );
      end if;

      v_is_empty :=
        v_value is null
        or v_value='null'::jsonb
        or (jsonb_typeof(v_value)='string' and btrim(v_value#>>'{}')='')
        or (jsonb_typeof(v_value)='array' and jsonb_array_length(v_value)=0)
        or (jsonb_typeof(v_value)='object' and v_value='{}'::jsonb)
        or (v_field.field_type='checkbox' and v_field.required and v_value<>'true'::jsonb);

      if v_is_empty then
        if v_field.required then
          v_issues:=v_issues || jsonb_build_array(jsonb_build_object(
            'fieldKey',v_field_key,
            'storageKey',v_storage_key,
            'labelEn',v_field.label_en,
            'labelBn',v_field.label_bn,
            'reason','required'
          ));
        end if;
        continue;
      end if;

      v_text:=case
        when jsonb_typeof(v_value)='string' then v_value#>>'{}'
        else null
      end;

      if v_field.field_type in ('select','radio') then
        if jsonb_typeof(v_value)<>'string'
           or not exists (
             select 1
             from jsonb_array_elements(v_field.options) opt
             where opt->>'value'=v_text
           ) then
          v_invalid:=true;
        end if;
      elsif v_field.field_type='multiselect' then
        if jsonb_typeof(v_value)<>'array'
           or exists (
             select 1
             from jsonb_array_elements(v_value) chosen
             where not exists (
               select 1
               from jsonb_array_elements(v_field.options) opt
               where opt->>'value'=chosen#>>'{}'
             )
           ) then
          v_invalid:=true;
        end if;
      end if;

      if not v_invalid and v_text is not null then
        if (v_field.validation ? 'minLength')
           and char_length(btrim(v_text)) < (v_field.validation->>'minLength')::integer then
          v_invalid:=true;
        end if;
        if (v_field.validation ? 'maxLength')
           and char_length(v_text) > (v_field.validation->>'maxLength')::integer then
          v_invalid:=true;
        end if;

        if v_field.field_type='email'
           and v_text !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
          v_invalid:=true;
        elsif v_field.field_type='url'
           and v_text !~* '^https?://[^[:space:]]+$' then
          v_invalid:=true;
        elsif v_field.field_type='phone'
           and char_length(regexp_replace(v_text,'[^0-9]','','g')) not between 7 and 15 then
          v_invalid:=true;
        end if;
      end if;

      if not v_invalid and v_field.field_type in ('number','currency') then
        begin
          if jsonb_typeof(v_value)='number' then
            v_number:=(v_value#>>'{}')::numeric;
          elsif v_text ~ '^-?[0-9]+([.][0-9]+)?$' then
            v_number:=v_text::numeric;
          else
            v_invalid:=true;
          end if;

          if not v_invalid
             and (v_field.validation ? 'min')
             and v_number < (v_field.validation->>'min')::numeric then
            v_invalid:=true;
          end if;
          if not v_invalid
             and (v_field.validation ? 'max')
             and v_number > (v_field.validation->>'max')::numeric then
            v_invalid:=true;
          end if;
        exception when others then
          v_invalid:=true;
        end;
      end if;

      if not v_invalid
         and v_field.field_type in ('date','time','month')
         and v_text is not null then
        if (v_field.validation ? 'min')
           and v_text < v_field.validation->>'min' then
          v_invalid:=true;
        end if;
        if (v_field.validation ? 'max')
           and v_text > v_field.validation->>'max' then
          v_invalid:=true;
        end if;
      end if;

      if v_invalid then
        v_issues:=v_issues || jsonb_build_array(jsonb_build_object(
          'fieldKey',v_field_key,
          'storageKey',v_storage_key,
          'labelEn',v_field.label_en,
          'labelBn',v_field.label_bn,
          'reason','invalid'
        ));
      end if;
    end loop;
  end if;

  if v_division is null or public.canonical_division_name(v_division) is null
     or v_district is null or public.canonical_district_name(v_district) is null then
    v_issues:=v_issues || jsonb_build_array(jsonb_build_object(
      'fieldKey','canonicalLocation','storageKey','location',
      'labelEn','Valid division and district','labelBn','সঠিক বিভাগ ও জেলা',
      'reason','invalid'
    ));
  end if;

  if v_upazila is not null and public.canonical_upazila_name(v_upazila,v_district) is null then
    v_issues:=v_issues || jsonb_build_array(jsonb_build_object(
      'fieldKey','canonicalUpazila','storageKey','upazilaOrThana',
      'labelEn','Valid upazila / thana','labelBn','সঠিক উপজেলা / থানা',
      'reason','invalid'
    ));
  end if;

  v_has_specific :=
    v_upazila is not null
    or nullif(btrim(p_report->>'area'),'') is not null
    or nullif(btrim(p_report->>'road'),'') is not null
    or nullif(btrim(p_report->>'landmark'),'') is not null
    or (
      nullif(btrim(p_report->>'formattedAddress'),'') is not null
      and lower(btrim(p_report->>'formattedAddress')) <> lower(btrim(coalesce(v_district,'')))
    );

  if not v_has_specific and v_scope <> 'district_wide' then
    v_issues:=v_issues || jsonb_build_array(jsonb_build_object(
      'fieldKey','locationSpecificity','storageKey','location',
      'labelEn','Specific incident location or explicit district-wide scope',
      'labelBn','নির্দিষ্ট ঘটনার স্থান বা জেলা-ব্যাপী স্কোপ',
      'reason','required'
    ));
  end if;

  return v_issues;
end
$function$;
