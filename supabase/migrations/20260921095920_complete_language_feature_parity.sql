
alter table public.public_visit_sessions
  add column if not exists ui_language text;

alter table public.complaint_submission_contexts
  add column if not exists ui_language text;

alter table public.public_visit_sessions
  drop constraint if exists public_visit_sessions_ui_language_check;
alter table public.public_visit_sessions
  add constraint public_visit_sessions_ui_language_check
  check (ui_language is null or ui_language in ('bn','en'));

alter table public.complaint_submission_contexts
  drop constraint if exists complaint_submission_contexts_ui_language_check;
alter table public.complaint_submission_contexts
  add constraint complaint_submission_contexts_ui_language_check
  check (ui_language is null or ui_language in ('bn','en'));

comment on column public.public_visit_sessions.ui_language is
  'Selected public interface language (bn/en). Browser locale remains in language.';
comment on column public.complaint_submission_contexts.ui_language is
  'Selected public interface language (bn/en) at report submission. Browser locale remains in language.';

create or replace function private.apply_ui_language_from_context()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, private
as $$
declare
  v_ui_language text := lower(nullif(btrim(current_setting('app.ui_language', true)), ''));
begin
  if v_ui_language in ('bn','en') then
    new.ui_language := v_ui_language;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_public_visit_sessions_ui_language
  on public.public_visit_sessions;
create trigger trg_public_visit_sessions_ui_language
before insert or update on public.public_visit_sessions
for each row execute function private.apply_ui_language_from_context();

drop trigger if exists trg_complaint_submission_contexts_ui_language
  on public.complaint_submission_contexts;
create trigger trg_complaint_submission_contexts_ui_language
before insert or update on public.complaint_submission_contexts
for each row execute function private.apply_ui_language_from_context();

drop function if exists public.record_public_visit_session(
  text,text,text,numeric,numeric,numeric,text,text,text,text,text,text,text,integer,integer,text
);

create function public.record_public_visit_session(
  p_visitor_id text,
  p_session_id text,
  p_permission_status text,
  p_latitude numeric default null,
  p_longitude numeric default null,
  p_accuracy_meters numeric default null,
  p_browser_name text default null,
  p_browser_version text default null,
  p_os_name text default null,
  p_device_category text default null,
  p_platform text default null,
  p_language text default null,
  p_timezone text default null,
  p_screen_width integer default null,
  p_screen_height integer default null,
  p_user_agent text default null,
  p_ui_language text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_ui_language text := lower(nullif(btrim(p_ui_language), ''));
begin
  perform set_config(
    'app.ui_language',
    case when v_ui_language in ('bn','en') then v_ui_language else '' end,
    true
  );

  perform private.enforce_public_rate_limit(
    'public_visit_session', p_visitor_id, 240, 60, interval '1 hour'
  );

  return public.record_public_visit_session_internal(
    p_visitor_id, p_session_id, p_permission_status,
    p_latitude, p_longitude, p_accuracy_meters,
    p_browser_name, p_browser_version, p_os_name, p_device_category,
    p_platform, p_language, p_timezone, p_screen_width, p_screen_height, p_user_agent
  );
end;
$$;

revoke all on function public.record_public_visit_session(
  text,text,text,numeric,numeric,numeric,text,text,text,text,text,text,text,integer,integer,text,text
) from public, anon, authenticated;
grant execute on function public.record_public_visit_session(
  text,text,text,numeric,numeric,numeric,text,text,text,text,text,text,text,integer,integer,text,text
) to service_role;

create or replace function public.submit_public_complaint(
  p_payload jsonb,
  p_client_submission_id text,
  p_reporter_context jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_subject text;
  v_ui_language text := lower(nullif(btrim(coalesce(
    p_reporter_context->>'ui_language',
    p_reporter_context->>'uiLanguage',
    p_payload->'reporterContext'->>'ui_language',
    p_payload->'reporterContext'->>'uiLanguage',
    p_payload->'reporter_context'->>'ui_language',
    p_payload->'reporter_context'->>'uiLanguage'
  )), ''));
begin
  perform set_config(
    'app.ui_language',
    case when v_ui_language in ('bn','en') then v_ui_language else '' end,
    true
  );

  v_subject := coalesce(
    nullif(btrim(coalesce(p_reporter_context->>'visitor_id', p_reporter_context->>'visitorId')), ''),
    nullif(btrim(coalesce(p_payload->'reporterContext'->>'visitor_id', p_payload->'reporterContext'->>'visitorId')), ''),
    nullif(btrim(p_client_submission_id), '')
  );

  perform private.enforce_public_rate_limit(
    'public_report_submit', v_subject, 30, 8, interval '1 hour'
  );

  return public.submit_public_complaint_internal(
    p_payload, p_client_submission_id, p_reporter_context
  );
end;
$$;

create or replace function public.submit_public_configured_complaint(
  p_payload jsonb,
  p_client_submission_id text,
  p_reporter_context jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_subject text;
  v_ui_language text := lower(nullif(btrim(coalesce(
    p_reporter_context->>'ui_language',
    p_reporter_context->>'uiLanguage',
    p_payload->'reporterContext'->>'ui_language',
    p_payload->'reporterContext'->>'uiLanguage',
    p_payload->'reporter_context'->>'ui_language',
    p_payload->'reporter_context'->>'uiLanguage'
  )), ''));
begin
  perform set_config(
    'app.ui_language',
    case when v_ui_language in ('bn','en') then v_ui_language else '' end,
    true
  );

  v_subject := coalesce(
    nullif(btrim(coalesce(p_reporter_context->>'visitor_id', p_reporter_context->>'visitorId')), ''),
    nullif(btrim(coalesce(p_payload->'reporterContext'->>'visitor_id', p_payload->'reporterContext'->>'visitorId')), ''),
    nullif(btrim(p_client_submission_id), '')
  );

  perform private.enforce_public_rate_limit(
    'public_report_submit', v_subject, 30, 8, interval '1 hour'
  );

  return public.submit_public_configured_complaint_internal(
    p_payload, p_client_submission_id, p_reporter_context
  );
end;
$$;

create or replace function public.reporting_field_options_are_bilingual(p_options jsonb)
returns boolean
language sql
immutable
set search_path = pg_catalog, public
as $$
  select
    p_options is not null
    and jsonb_typeof(p_options) = 'array'
    and not exists (
      select 1
      from jsonb_array_elements(p_options) as item(value)
      where jsonb_typeof(item.value) <> 'object'
         or nullif(btrim(item.value->>'value'), '') is null
         or nullif(btrim(item.value->>'labelEn'), '') is null
         or nullif(btrim(item.value->>'labelBn'), '') is null
    )
    and not exists (
      select 1
      from (
        select btrim(item.value->>'value') as option_value, count(*) as c
        from jsonb_array_elements(p_options) as item(value)
        group by btrim(item.value->>'value')
        having count(*) > 1
      ) duplicates
    );
$$;

alter table public.reporting_form_schema_fields
  drop constraint if exists reporting_form_schema_fields_bilingual_options_check;
alter table public.reporting_form_schema_fields
  add constraint reporting_form_schema_fields_bilingual_options_check
  check (
    field_type not in ('select','radio','multiselect')
    or (
      jsonb_typeof(options) = 'array'
      and jsonb_array_length(options) > 0
      and public.reporting_field_options_are_bilingual(options)
    )
  ) not valid;
alter table public.reporting_form_schema_fields
  validate constraint reporting_form_schema_fields_bilingual_options_check;

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

    if v_type in ('select','radio','multiselect') then
      if jsonb_array_length(coalesce(v_field->'options','[]'::jsonb)) = 0 then
        raise exception 'Field % requires at least one option.', v_key using errcode='22023';
      end if;

      if not public.reporting_field_options_are_bilingual(v_field->'options') then
        raise exception 'Every option for field % requires a unique value plus English and Bangla labels.',
          v_key using errcode='22023';
      end if;
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
