-- Dynamic taxonomy + reporting form foundation.
-- Additive only: existing Public/Admin behavior remains unchanged.

begin;

-- 1) Enrich current taxonomy records with draft/publish metadata needed by the future Admin editor.
alter table public.segments
  add column if not exists slug text,
  add column if not exists short_name_en text,
  add column if not exists short_name_bn text,
  add column if not exists description_en text,
  add column if not exists description_bn text,
  add column if not exists icon_key text,
  add column if not exists theme_key text,
  add column if not exists config_status text,
  add column if not exists updated_at timestamptz not null default now();

update public.segments
set
  slug = coalesce(slug, case id
    when 'harassment' then 'harassment'
    when 'load_shedding' then 'load-shedding'
    when 'extortion' then 'extortion'
    when 'public_safety' then 'public-safety'
    when 'road_transport' then 'road-transport'
    when 'illegal_occupation' then 'illegal-occupation'
    when 'rickshaw' then 'rickshaw'
    else replace(id, '_', '-')
  end),
  short_name_en = coalesce(short_name_en, case id
    when 'harassment' then 'Harassment'
    when 'load_shedding' then 'Utility'
    when 'extortion' then 'Extortion & Bribery'
    when 'public_safety' then 'Public Safety'
    when 'road_transport' then 'Road & Transport'
    when 'illegal_occupation' then 'Illegal Occupation'
    when 'rickshaw' then 'Charging'
    else name_en
  end),
  short_name_bn = coalesce(short_name_bn, case id
    when 'harassment' then 'হয়রানি'
    when 'load_shedding' then 'ইউটিলিটি'
    when 'extortion' then 'চাঁদাবাজি ও ঘুষ'
    when 'public_safety' then 'জননিরাপত্তা'
    when 'road_transport' then 'সড়ক ও যাতায়াত'
    when 'illegal_occupation' then 'অবৈধ দখল'
    when 'rickshaw' then 'চার্জিং'
    else name_bn
  end),
  description_en = coalesce(description_en, case id
    when 'harassment' then 'Report incidents of harassment, abuse, or safety violations.'
    when 'load_shedding' then 'Report load shedding, gas shortages, or electricity billing issues.'
    when 'extortion' then 'Report extortion, bribery, illegal tolls, or coercive payment demands.'
    when 'public_safety' then 'Report theft, robbery, snatching, mob violence, and related public-safety incidents.'
    when 'road_transport' then 'Report road repair delays, road accidents, or road blocks and obstructions.'
    when 'illegal_occupation' then 'Report illegal occupation of public space, private land, or government property.'
    when 'rickshaw' then 'Share the location and details of illegal or unsafe charging stations.'
    else ''
  end),
  description_bn = coalesce(description_bn, case id
    when 'harassment' then 'শারীরিক বা মানসিক নির্যাতন, নিপীড়ন ও অনলাইনে হেনস্তার তথ্য জানান।'
    when 'load_shedding' then 'লোডশেডিং, গ্যাস সংকট বা অতিরিক্ত বিদ্যুৎ বিল সংক্রান্ত প্রতিবেদন জমা দিন।'
    when 'extortion' then 'চাঁদাবাজি, ঘুষ বা জোরপূর্বক অর্থ আদায়ের ঘটনা জানান।'
    when 'public_safety' then 'চুরি, ডাকাতি, ছিনতাই বা মব সহিংসতার ঘটনা ও অবস্থান জানান।'
    when 'road_transport' then 'রাস্তা মেরামতে বিলম্ব, সড়ক দুর্ঘটনা বা সড়ক অবরোধের তথ্য জানান।'
    when 'illegal_occupation' then 'রাস্তা, ফুটপাত, ব্যক্তিগত বা সরকারি জমি ও সম্পত্তির অবৈধ দখলের তথ্য জানান।'
    when 'rickshaw' then 'অবৈধ বা ঝুঁকিপূর্ণ চার্জিং স্টেশনের অবস্থান ও তথ্য দিন।'
    else ''
  end),
  icon_key = coalesce(icon_key, id),
  theme_key = coalesce(theme_key, id),
  config_status = coalesce(config_status, 'published');

alter table public.segments alter column config_status set default 'draft';
alter table public.segments alter column config_status set not null;
alter table public.segments alter column active set default false;

create unique index if not exists segments_slug_unique
  on public.segments (slug)
  where slug is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'segments_config_status_check'
      and conrelid = 'public.segments'::regclass
  ) then
    alter table public.segments
      add constraint segments_config_status_check
      check (config_status in ('draft','ready','published','archived'));
  end if;
end $$;

drop trigger if exists trg_segments_set_updated_at on public.segments;
create trigger trg_segments_set_updated_at
before update on public.segments
for each row execute function public.set_updated_at();

alter table public.subcategories
  add column if not exists description_en text,
  add column if not exists description_bn text,
  add column if not exists category_group text,
  add column if not exists is_sensitive boolean not null default false,
  add column if not exists config_status text,
  add column if not exists updated_at timestamptz not null default now();

update public.subcategories sc
set
  description_en = coalesce(sc.description_en, v.description_en),
  description_bn = coalesce(sc.description_bn, v.description_bn),
  category_group = coalesce(sc.category_group, v.category_group),
  is_sensitive = coalesce(v.is_sensitive, sc.is_sensitive),
  config_status = coalesce(sc.config_status, 'published')
from (
  values
    ('rape-sexual-violence','Sexual violence, assault or rape allegation','যৌন সহিংসতা বা ধর্ষণ সংক্রান্ত অভিযোগ','violence',true),
    ('sexual-harassment','Unwanted sexual behavior, comments or physical touch','অনাকাঙ্ক্ষিত যৌন আচরণ, মন্তব্য বা স্পর্শ','violence',false),
    ('domestic-violence','Physical or emotional abuse within family or relationship','পরিবার বা সম্পর্কের মধ্যে শারীরিক/মানসিক নির্যাতন','violence',false),
    ('blackmail-coercion','Blackmail or threats using photos, videos, or personal information','ব্যক্তিগত ছবি, ভিডিও বা তথ্য ব্যবহার করে ভয় দেখানো','digital_intimate',true),
    ('honeytrap','Lure, deception, or entrapped harassment','প্রলোভন, প্রতারণা বা ফাঁদে ফেলে হয়রানি','relationship_scam',false),
    ('bribe-demanded-service','Report bribery connected to a service, approval, process, or benefit','সেবা, অনুমোদন, প্রক্রিয়া বা সুবিধার সঙ্গে সংশ্লিষ্ট ঘুষের ঘটনা জানান',null,true),
    ('bribe-paid','Report a bribe that was paid','প্রদান করা ঘুষের তথ্য জানান',null,true),
    ('shop-business','Forced money demands from shops and commercial establishments','দোকান, বাজার বা ব্যবসা প্রতিষ্ঠানে জোরপূর্বক চাঁদা দাবি',null,false),
    ('transport-movement','Forced money demands on transport stands, routes, or transit','বাস, সিএনজি, লেগুনা বা চলাচলের রাস্তায় চাঁদা আদায়',null,false),
    ('construction-property','Demands related to building construction or property use','ভবন নির্মাণ বা সম্পত্তি ব্যবহারে চাঁদা ও বাধা সৃষ্টি',null,false),
    ('threat-money-demand','Intimidation and threat-based extortion demands','ভয়ভীতি ও শারীরিক বা মানসিক চাপ দিয়ে টাকা আদায়',null,false),
    ('extortion-other','Any other extortion or coercive money collection','অন্য যেকোনো ধরনের চাঁদাবাজি বা জবরদস্তির ঘটনা',null,false),
    ('theft','Report theft or stolen property incidents','চুরি বা সম্পদ হারানোর ঘটনা জানান',null,true),
    ('robbery','Report robbery or organized dacoity incidents','ডাকাতি বা সংঘবদ্ধভাবে সম্পদ লুটের ঘটনা জানান',null,true),
    ('snatching','Report snatching incidents in streets or public places','রাস্তায় বা জনসমাগমে ছিনতাইয়ের ঘটনা জানান',null,true),
    ('mob-justice','Report crowd attacks, restraint, threats, or violence arising from accusations, suspicion, rumors, or disputes','সন্দেহ, অভিযোগ, গুজব বা বিরোধের ভিত্তিতে সংঘবদ্ধ মারধর, আটক, হুমকি বা আক্রমণের ঘটনা জানান',null,true),
    ('road-repair-delay','Report delayed, stalled, or incomplete road repairs','দীর্ঘদিন মেরামত না হওয়া বা অসম্পূর্ণ রাস্তার কাজ জানান',null,false),
    ('road-accident','Report the location and details of a road accident','সড়ক দুর্ঘটনার স্থান ও ঘটনার তথ্য জানান',null,true),
    ('road-block','Report road blocks or obstructions caused by demonstrations, crashes, roadworks, or other causes','প্রতিবাদ, দুর্ঘটনা, নির্মাণকাজ বা অন্য কারণে চলাচলে বাধার তথ্য জানান',null,false),
    ('load-shedding-outage','Frequent or prolonged power outages and load shedding','ঘন ঘন বা দীর্ঘ সময় বিদ্যুৎ বিভ্রাট ও লোডশেডিং',null,false),
    ('gas-shortage','Piped gas shortage, low pressure, or supply interruption','লাইনের গ্যাস সংকট, স্বল্প চাপ বা সরবরাহ বন্ধ থাকা',null,false),
    ('excess-electricity-bill','Abnormal, inflated or unexplained electricity bill charges','অস্বাভাবিক বা অসঙ্গতিপূর্ণ ভুতুড়ে বিদ্যুৎ বিলের অভিযোগ',null,false),
    ('road-public-space-encroachment','Report shops, structures, or other occupation of roads, footpaths, or foot-over-bridges','দোকান, স্থাপনা বা অন্যভাবে রাস্তা, ফুটপাত বা ফুটওভার ব্রিজ দখলের তথ্য জানান',null,false),
    ('private-property-occupation','Report alleged illegal occupation of private land or property','ব্যক্তিগত জমি বা সম্পত্তি অবৈধভাবে দখলের অভিযোগ জানান',null,true),
    ('government-property-occupation','Report alleged illegal occupation of government land or property','সরকারি জমি বা সম্পত্তি অবৈধ দখলের তথ্য জানান',null,true),
    ('charging-station-location','Report illegal power connections or hazardous battery charging points','অবৈধ বিদ্যুৎ সংযোগ বা অগ্নিঝুঁকিপূর্ণ ব্যাটারি চার্জিং স্পট',null,false)
) as v(id,description_en,description_bn,category_group,is_sensitive)
where sc.id = v.id;

update public.subcategories
set config_status = coalesce(config_status, 'published');

alter table public.subcategories alter column config_status set default 'draft';
alter table public.subcategories alter column config_status set not null;
alter table public.subcategories alter column active set default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'subcategories_config_status_check'
      and conrelid = 'public.subcategories'::regclass
  ) then
    alter table public.subcategories
      add constraint subcategories_config_status_check
      check (config_status in ('draft','ready','published','archived'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'subcategories_category_group_check'
      and conrelid = 'public.subcategories'::regclass
  ) then
    alter table public.subcategories
      add constraint subcategories_category_group_check
      check (
        category_group is null or
        category_group in ('violence','relationship_scam','digital_intimate','general')
      );
  end if;
end $$;

drop trigger if exists trg_subcategories_set_updated_at on public.subcategories;
create trigger trg_subcategories_set_updated_at
before update on public.subcategories
for each row execute function public.set_updated_at();

-- 2) Preserve the taxonomy under which each report was actually submitted/edited.
alter table public.complaints
  add column if not exists taxonomy_snapshot jsonb,
  add column if not exists form_schema_version integer,
  add column if not exists custom_field_answers jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'complaints_taxonomy_snapshot_object_check'
      and conrelid = 'public.complaints'::regclass
  ) then
    alter table public.complaints
      add constraint complaints_taxonomy_snapshot_object_check
      check (taxonomy_snapshot is null or jsonb_typeof(taxonomy_snapshot) = 'object');
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'complaints_custom_field_answers_object_check'
      and conrelid = 'public.complaints'::regclass
  ) then
    alter table public.complaints
      add constraint complaints_custom_field_answers_object_check
      check (jsonb_typeof(custom_field_answers) = 'object');
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'complaints_form_schema_version_check'
      and conrelid = 'public.complaints'::regclass
  ) then
    alter table public.complaints
      add constraint complaints_form_schema_version_check
      check (form_schema_version is null or form_schema_version > 0);
  end if;
end $$;

create or replace function public.capture_complaint_taxonomy_snapshot()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_segment public.segments%rowtype;
  v_subcategory public.subcategories%rowtype;
begin
  select *
  into v_segment
  from public.segments
  where id = new.segment_id;

  select *
  into v_subcategory
  from public.subcategories
  where id = new.subcategory_id
    and segment_id = new.segment_id;

  if v_segment.id is not null and v_subcategory.id is not null then
    new.taxonomy_snapshot := jsonb_build_object(
      'segment', jsonb_build_object(
        'id', v_segment.id,
        'name_en', v_segment.name_en,
        'name_bn', v_segment.name_bn,
        'slug', v_segment.slug
      ),
      'subcategory', jsonb_build_object(
        'id', v_subcategory.id,
        'segment_id', v_subcategory.segment_id,
        'name_en', v_subcategory.name_en,
        'name_bn', v_subcategory.name_bn
      ),
      'captured_at', clock_timestamp()
    );
  elsif tg_op = 'INSERT' then
    new.taxonomy_snapshot := null;
  end if;

  return new;
end;
$$;

revoke all on function public.capture_complaint_taxonomy_snapshot() from public, anon, authenticated;

drop trigger if exists trg_complaints_capture_taxonomy_snapshot on public.complaints;
create trigger trg_complaints_capture_taxonomy_snapshot
before insert or update of segment_id, subcategory_id
on public.complaints
for each row execute function public.capture_complaint_taxonomy_snapshot();

update public.complaints c
set taxonomy_snapshot = jsonb_build_object(
  'segment', jsonb_build_object(
    'id', s.id,
    'name_en', s.name_en,
    'name_bn', s.name_bn,
    'slug', s.slug
  ),
  'subcategory', jsonb_build_object(
    'id', sc.id,
    'segment_id', sc.segment_id,
    'name_en', sc.name_en,
    'name_bn', sc.name_bn
  ),
  'captured_at', c.created_at
)
from public.segments s
join public.subcategories sc on sc.segment_id = s.id
where c.segment_id = s.id
  and c.subcategory_id = sc.id
  and c.taxonomy_snapshot is null;

-- 3) Versioned form-schema storage. Current reports stay in legacy mode until individually migrated.
create table if not exists public.reporting_form_schemas (
  id uuid primary key default gen_random_uuid(),
  scope_type text not null,
  scope_id text not null,
  version integer not null,
  status text not null default 'draft',
  engine_mode text not null default 'legacy',
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_by uuid,
  published_at timestamptz,
  constraint reporting_form_schemas_scope_type_check
    check (scope_type in ('segment','subcategory')),
  constraint reporting_form_schemas_version_check
    check (version > 0),
  constraint reporting_form_schemas_status_check
    check (status in ('draft','published','archived')),
  constraint reporting_form_schemas_engine_mode_check
    check (engine_mode in ('legacy','schema')),
  constraint reporting_form_schemas_scope_version_unique
    unique (scope_type, scope_id, version)
);

create unique index if not exists reporting_form_schemas_one_published_per_scope
  on public.reporting_form_schemas (scope_type, scope_id)
  where status = 'published';

create index if not exists reporting_form_schemas_scope_lookup
  on public.reporting_form_schemas (scope_type, scope_id, status, version desc);

drop trigger if exists trg_reporting_form_schemas_set_updated_at on public.reporting_form_schemas;
create trigger trg_reporting_form_schemas_set_updated_at
before update on public.reporting_form_schemas
for each row execute function public.set_updated_at();

create table if not exists public.reporting_form_schema_fields (
  id uuid primary key default gen_random_uuid(),
  schema_id uuid not null references public.reporting_form_schemas(id) on delete cascade,
  field_key text not null,
  field_type text not null,
  storage_mode text not null,
  storage_key text not null,
  label_en text not null,
  label_bn text not null,
  helper_en text,
  helper_bn text,
  placeholder_en text,
  placeholder_bn text,
  required boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0,
  options jsonb not null default '[]'::jsonb,
  validation jsonb not null default '{}'::jsonb,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reporting_form_schema_fields_field_type_check
    check (field_type in (
      'text','textarea','number','currency','date','time','month',
      'select','radio','checkbox','multiselect','phone','email','url',
      'location','subject_party','evidence','privacy','mob_justice_details'
    )),
  constraint reporting_form_schema_fields_storage_mode_check
    check (storage_mode in ('core_column','custom_json','system_block')),
  constraint reporting_form_schema_fields_options_check
    check (jsonb_typeof(options) = 'array'),
  constraint reporting_form_schema_fields_validation_check
    check (jsonb_typeof(validation) = 'object'),
  constraint reporting_form_schema_fields_config_check
    check (jsonb_typeof(config) = 'object'),
  constraint reporting_form_schema_fields_schema_key_unique
    unique (schema_id, field_key)
);

create index if not exists reporting_form_schema_fields_order_lookup
  on public.reporting_form_schema_fields (schema_id, active, sort_order, field_key);

drop trigger if exists trg_reporting_form_schema_fields_set_updated_at on public.reporting_form_schema_fields;
create trigger trg_reporting_form_schema_fields_set_updated_at
before update on public.reporting_form_schema_fields
for each row execute function public.set_updated_at();

alter table public.reporting_form_schemas enable row level security;
alter table public.reporting_form_schema_fields enable row level security;

revoke all on table public.reporting_form_schemas from anon, authenticated;
revoke all on table public.reporting_form_schema_fields from anon, authenticated;

-- Baseline every existing subcategory as version 1 of the legacy engine.
insert into public.reporting_form_schemas (
  scope_type,
  scope_id,
  version,
  status,
  engine_mode,
  notes,
  published_at
)
select
  'subcategory',
  sc.id,
  1,
  'published',
  'legacy',
  'Baseline schema for the existing hardcoded reporting flow. No Public rendering change.',
  now()
from public.subcategories sc
where not exists (
  select 1
  from public.reporting_form_schemas rfs
  where rfs.scope_type = 'subcategory'
    and rfs.scope_id = sc.id
);

-- 4) Admin-only inspection + safe draft creation. No publish/edit mutation is exposed yet.
create or replace function public.admin_get_taxonomy_configuration()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_segments jsonb;
  v_subcategories jsonb;
  v_schemas jsonb;
begin
  if not public.is_active_admin() then
    raise exception 'Access denied. Active administrative session required.'
      using errcode = '42501';
  end if;

  if not public.has_permission('categories.view') then
    raise exception 'Access denied. Missing categories.view permission.'
      using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'name_en', s.name_en,
      'name_bn', s.name_bn,
      'short_name_en', s.short_name_en,
      'short_name_bn', s.short_name_bn,
      'description_en', s.description_en,
      'description_bn', s.description_bn,
      'slug', s.slug,
      'icon_key', s.icon_key,
      'theme_key', s.theme_key,
      'active', s.active,
      'config_status', s.config_status,
      'sort_order', s.sort_order
    ) order by s.sort_order, s.id
  ), '[]'::jsonb)
  into v_segments
  from public.segments s;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', sc.id,
      'segment_id', sc.segment_id,
      'name_en', sc.name_en,
      'name_bn', sc.name_bn,
      'description_en', sc.description_en,
      'description_bn', sc.description_bn,
      'category_group', sc.category_group,
      'is_sensitive', sc.is_sensitive,
      'active', sc.active,
      'config_status', sc.config_status,
      'sort_order', sc.sort_order
    ) order by sc.segment_id, sc.sort_order, sc.id
  ), '[]'::jsonb)
  into v_subcategories
  from public.subcategories sc;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', rfs.id,
      'scope_type', rfs.scope_type,
      'scope_id', rfs.scope_id,
      'version', rfs.version,
      'status', rfs.status,
      'engine_mode', rfs.engine_mode,
      'field_count', (
        select count(*)
        from public.reporting_form_schema_fields rf
        where rf.schema_id = rfs.id
      ),
      'updated_at', rfs.updated_at,
      'published_at', rfs.published_at
    ) order by rfs.scope_type, rfs.scope_id, rfs.version desc
  ), '[]'::jsonb)
  into v_schemas
  from public.reporting_form_schemas rfs;

  return jsonb_build_object(
    'segments', v_segments,
    'subcategories', v_subcategories,
    'form_schemas', v_schemas
  );
end;
$$;

revoke all on function public.admin_get_taxonomy_configuration() from public, anon;
grant execute on function public.admin_get_taxonomy_configuration() to authenticated;

create or replace function public.admin_create_reporting_form_draft(
  p_scope_type text,
  p_scope_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_scope_type text := lower(nullif(btrim(p_scope_type), ''));
  v_scope_id text := nullif(btrim(p_scope_id), '');
  v_existing public.reporting_form_schemas%rowtype;
  v_source public.reporting_form_schemas%rowtype;
  v_new public.reporting_form_schemas%rowtype;
begin
  if not public.is_active_admin() then
    raise exception 'Access denied. Active administrative session required.'
      using errcode = '42501';
  end if;

  if not public.has_permission('categories.manage') then
    raise exception 'Access denied. Missing categories.manage permission.'
      using errcode = '42501';
  end if;

  if v_scope_type not in ('segment','subcategory') or v_scope_id is null then
    raise exception 'Valid scope type and scope ID are required.'
      using errcode = '22023';
  end if;

  if v_scope_type = 'segment' and not exists (
    select 1 from public.segments where id = v_scope_id
  ) then
    raise exception 'Segment not found: %', v_scope_id using errcode = 'P0002';
  end if;

  if v_scope_type = 'subcategory' and not exists (
    select 1 from public.subcategories where id = v_scope_id
  ) then
    raise exception 'Subcategory not found: %', v_scope_id using errcode = 'P0002';
  end if;

  select *
  into v_existing
  from public.reporting_form_schemas
  where scope_type = v_scope_type
    and scope_id = v_scope_id
    and status = 'draft'
  order by version desc
  limit 1;

  if v_existing.id is not null then
    return jsonb_build_object(
      'success', true,
      'created', false,
      'schema_id', v_existing.id,
      'version', v_existing.version
    );
  end if;

  select *
  into v_source
  from public.reporting_form_schemas
  where scope_type = v_scope_type
    and scope_id = v_scope_id
  order by
    case status when 'published' then 0 else 1 end,
    version desc
  limit 1;

  insert into public.reporting_form_schemas (
    scope_type,
    scope_id,
    version,
    status,
    engine_mode,
    notes,
    created_by
  )
  values (
    v_scope_type,
    v_scope_id,
    coalesce(v_source.version, 0) + 1,
    'draft',
    coalesce(v_source.engine_mode, 'legacy'),
    'Admin working draft. Not visible to Public.',
    auth.uid()
  )
  returning * into v_new;

  if v_source.id is not null then
    insert into public.reporting_form_schema_fields (
      schema_id,
      field_key,
      field_type,
      storage_mode,
      storage_key,
      label_en,
      label_bn,
      helper_en,
      helper_bn,
      placeholder_en,
      placeholder_bn,
      required,
      active,
      sort_order,
      options,
      validation,
      config
    )
    select
      v_new.id,
      field_key,
      field_type,
      storage_mode,
      storage_key,
      label_en,
      label_bn,
      helper_en,
      helper_bn,
      placeholder_en,
      placeholder_bn,
      required,
      active,
      sort_order,
      options,
      validation,
      config
    from public.reporting_form_schema_fields
    where schema_id = v_source.id;
  end if;

  insert into public.admin_audit_logs (
    actor_id,
    action,
    target_type,
    target_id,
    details
  )
  values (
    auth.uid(),
    'reporting_form_schema.draft_create',
    v_scope_type,
    v_scope_id,
    jsonb_build_object(
      'schema_id', v_new.id,
      'version', v_new.version,
      'source_schema_id', v_source.id,
      'timestamp', clock_timestamp()
    )
  );

  return jsonb_build_object(
    'success', true,
    'created', true,
    'schema_id', v_new.id,
    'version', v_new.version
  );
end;
$$;

revoke all on function public.admin_create_reporting_form_draft(text,text) from public, anon;
grant execute on function public.admin_create_reporting_form_draft(text,text) to authenticated;

commit;
