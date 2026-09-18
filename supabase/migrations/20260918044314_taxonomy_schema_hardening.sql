-- Final hardening and parity alignment for Admin-configured reporting schemas.
-- Existing published legacy forms remain untouched.

begin;

-- ---------------------------------------------------------------------------
-- 1. Custom-answer storage hardening.
--    Only keys declared by the exact submitted schema version are persisted.
-- ---------------------------------------------------------------------------

create or replace function public.sanitize_configured_complaint_answers()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_schema_id uuid;
  v_engine_mode text;
  v_filtered jsonb := '{}'::jsonb;
  v_missing_checkbox text;
begin
  if new.form_schema_version is null then
    return new;
  end if;

  select s.id,s.engine_mode
  into v_schema_id,v_engine_mode
  from public.reporting_form_schemas s
  where s.scope_type='subcategory'
    and s.scope_id=new.subcategory_id
    and s.version=new.form_schema_version
  order by
    case s.status when 'published' then 0 when 'archived' then 1 else 2 end,
    s.updated_at desc
  limit 1;

  if v_schema_id is null or v_engine_mode <> 'schema' then
    return new;
  end if;

  select coalesce(jsonb_object_agg(e.key,e.value),'{}'::jsonb)
  into v_filtered
  from jsonb_each(coalesce(new.custom_field_answers,'{}'::jsonb)) e
  join public.reporting_form_schema_fields f
    on f.schema_id=v_schema_id
   and f.active=true
   and f.storage_mode='custom_json'
   and f.storage_key=e.key;

  new.custom_field_answers := coalesce(v_filtered,'{}'::jsonb);

  select f.label_en
  into v_missing_checkbox
  from public.reporting_form_schema_fields f
  where f.schema_id=v_schema_id
    and f.active=true
    and f.required=true
    and f.storage_mode='custom_json'
    and f.field_type='checkbox'
    and coalesce(new.custom_field_answers->f.storage_key,'false'::jsonb) <> 'true'::jsonb
  order by f.sort_order
  limit 1;

  if v_missing_checkbox is not null then
    raise exception 'VALIDATION_FAILED: Required checkbox % must be selected.',v_missing_checkbox
      using errcode='22023';
  end if;

  return new;
end;
$$;

revoke all on function public.sanitize_configured_complaint_answers() from public, anon, authenticated;

drop trigger if exists trg_sanitize_configured_complaint_answers on public.complaints;
create trigger trg_sanitize_configured_complaint_answers
before insert or update of custom_field_answers,form_schema_version,subcategory_id
on public.complaints
for each row execute function public.sanitize_configured_complaint_answers();

-- ---------------------------------------------------------------------------
-- 2. Sensitive contact fields are private by default and by enforcement.
-- ---------------------------------------------------------------------------

create or replace function public.enforce_reporting_field_privacy()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  new.config := coalesce(new.config,'{}'::jsonb);

  if new.storage_mode='custom_json'
     and new.field_type in ('phone','email') then
    new.config := jsonb_set(new.config,'{publicVisible}','false'::jsonb,true);
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_reporting_field_privacy() from public, anon, authenticated;

drop trigger if exists trg_enforce_reporting_field_privacy
on public.reporting_form_schema_fields;

create trigger trg_enforce_reporting_field_privacy
before insert or update of field_type,storage_mode,config
on public.reporting_form_schema_fields
for each row execute function public.enforce_reporting_field_privacy();

update public.reporting_form_schema_fields
set config=jsonb_set(coalesce(config,'{}'::jsonb),'{publicVisible}','false'::jsonb,true)
where storage_mode='custom_json'
  and field_type in ('phone','email');

-- ---------------------------------------------------------------------------
-- 3. Align existing schema drafts with the current mature legacy journeys.
--    Drafts only: no current Public flow changes.
-- ---------------------------------------------------------------------------

-- Illegal occupation and charging station currently hide Frequency.
update public.reporting_form_schema_fields f
set active=false
from public.reporting_form_schemas s
where f.schema_id=s.id
  and s.status='draft'
  and s.engine_mode='schema'
  and f.field_key='frequency'
  and s.scope_id in (
    'road-public-space-encroachment',
    'private-property-occupation',
    'government-property-occupation',
    'charging-station-location'
  );

-- Excess electricity bill currently keeps Incident Time visible.
update public.reporting_form_schema_fields f
set active=true
from public.reporting_form_schemas s
where f.schema_id=s.id
  and s.status='draft'
  and s.engine_mode='schema'
  and s.scope_id='excess-electricity-bill'
  and f.field_key='incident_time';

-- Current bribery fields are optional.
update public.reporting_form_schema_fields f
set required=false
from public.reporting_form_schemas s
where f.schema_id=s.id
  and s.status='draft'
  and s.engine_mode='schema'
  and s.scope_id='bribe-demanded-service'
  and f.field_key in ('bribery_department','bribery_service');

-- relationshipContext is preserved in storage but is not currently exposed in
-- the mature harassment UI. Keep it available in the builder but off by default.
update public.reporting_form_schema_fields f
set active=false
from public.reporting_form_schemas s
join public.subcategories sc on sc.id=s.scope_id
where f.schema_id=s.id
  and s.status='draft'
  and s.engine_mode='schema'
  and sc.segment_id='harassment'
  and f.field_key='relationship_context';

-- Privacy choices are currently an explicit Public form section for harassment.
-- Other existing journeys retain the anonymous default until Admin intentionally
-- enables the block.
update public.reporting_form_schema_fields f
set active=false
from public.reporting_form_schemas s
join public.subcategories sc on sc.id=s.scope_id
where f.schema_id=s.id
  and s.status='draft'
  and s.engine_mode='schema'
  and sc.segment_id <> 'harassment'
  and f.field_key='privacy';

-- Blackmail / coercion has two additional mature digital-threat questions.
insert into public.reporting_form_schema_fields(
  schema_id,field_key,field_type,storage_mode,storage_key,
  label_en,label_bn,helper_en,helper_bn,placeholder_en,placeholder_bn,
  required,active,sort_order,options,validation,config
)
select
  s.id,
  v.field_key,
  'select',
  'core_column',
  v.storage_key,
  v.label_en,
  v.label_bn,
  null,
  null,
  null,
  null,
  false,
  true,
  v.sort_order,
  v.options::jsonb,
  '{}'::jsonb,
  '{}'::jsonb
from public.reporting_form_schemas s
cross join lateral (
  values
    (
      'intimate_what_happened',
      'intimateWhatHappened',
      'Threat status / action',
      'কী ঘটেছে বা হুমকি দেওয়া হচ্ছে?',
      26,
      '[
        {"value":"threatened","labelEn":"Threatening to distribute","labelBn":"ফাঁস করার হুমকি দেওয়া হচ্ছে (Threatened to share)"},
        {"value":"already_shared","labelEn":"Already shared / distributed","labelBn":"ইতিমধ্যে অনলাইনে বা অন্যদের কাছে ছড়ানো হয়েছে"},
        {"value":"recorded_secretly","labelEn":"Recorded secretly without consent","labelBn":"গোপনে সম্মতি ছাড়া ছবি বা ভিডিও ধারণ করা হয়েছে"},
        {"value":"manipulated_deepfake","labelEn":"Manipulated / Edited / Deepfake content","labelBn":"ছবি বা ভিডিও বিকৃত / এডিট / ডিপফেক করা হয়েছে"},
        {"value":"other","labelEn":"Other situation","labelBn":"অন্যান্য পরিস্থিতি"}
      ]'
    ),
    (
      'intimate_platform',
      'intimatePlatform',
      'Platform / channel',
      'কোন মাধ্যমে হুমকি বা অপপ্রচার হচ্ছে?',
      27,
      '[
        {"value":"facebook","labelEn":"Facebook","labelBn":"ফেসবুক (Facebook)"},
        {"value":"messenger","labelEn":"Messenger","labelBn":"মেসেঞ্জার (Messenger)"},
        {"value":"whatsapp","labelEn":"WhatsApp","labelBn":"হোয়াটসঅ্যাপ (WhatsApp)"},
        {"value":"telegram","labelEn":"Telegram","labelBn":"টেলিগ্রাম (Telegram)"},
        {"value":"dating_app","labelEn":"Dating / Matrimonial App","labelBn":"ডেটিং বা ম্যাট্রিমোনিয়াল অ্যাপ"},
        {"value":"website","labelEn":"Website or Forum","labelBn":"কোনো ওয়েবসাইট বা ফোরাম"},
        {"value":"in_person","labelEn":"In Person / Offline","labelBn":"সরাসরি ব্যক্তি বা এলাকায়"},
        {"value":"other","labelEn":"Other Channel","labelBn":"অন্যান্য মাধ্যম"}
      ]'
    )
) as v(field_key,storage_key,label_en,label_bn,sort_order,options)
where s.scope_type='subcategory'
  and s.scope_id='blackmail-coercion'
  and s.status='draft'
  and s.engine_mode='schema'
  and not exists(
    select 1
    from public.reporting_form_schema_fields f
    where f.schema_id=s.id and f.field_key=v.field_key
  );

commit;
