-- Phase 1: expand Sobaike Janao complaint taxonomy without changing existing report IDs.
-- Existing segment IDs are preserved for backward compatibility.

insert into public.segments (id, name_bn, name_en, active, sort_order)
values
  ('public_safety', 'জননিরাপত্তা', 'Public Safety', true, 3),
  ('road_transport', 'সড়ক ও যাতায়াত সমস্যা', 'Road & Transport Issues', true, 4),
  ('illegal_occupation', 'অবৈধ দখল', 'Illegal Occupation', true, 6)
on conflict (id) do update
set name_bn = excluded.name_bn,
    name_en = excluded.name_en,
    active = excluded.active,
    sort_order = excluded.sort_order;

update public.segments
set name_bn = case id
      when 'extortion' then 'ঘুষ ও চাঁদাবাজি'
      else name_bn
    end,
    name_en = case id
      when 'extortion' then 'Bribery & Extortion'
      else name_en
    end,
    sort_order = case id
      when 'harassment' then 1
      when 'extortion' then 2
      when 'public_safety' then 3
      when 'road_transport' then 4
      when 'load_shedding' then 5
      when 'illegal_occupation' then 6
      when 'rickshaw' then 7
      else sort_order
    end
where id in (
  'harassment',
  'extortion',
  'public_safety',
  'road_transport',
  'load_shedding',
  'illegal_occupation',
  'rickshaw'
);

insert into public.subcategories (id, segment_id, name_bn, name_en, active, sort_order)
values
  ('bribe-service-demand', 'extortion', 'সেবা পেতে ঘুষ দাবি', 'Bribe Demanded for a Service', true, 1),
  ('bribe-paid', 'extortion', 'ঘুষ প্রদান', 'Bribe Paid', true, 2),
  ('theft', 'public_safety', 'চুরি', 'Theft', true, 1),
  ('robbery-dacoity', 'public_safety', 'ডাকাতি', 'Robbery / Dacoity', true, 2),
  ('snatching', 'public_safety', 'ছিনতাই', 'Snatching', true, 3),
  ('road-repair-delay', 'road_transport', 'রাস্তা মেরামতে বিলম্ব', 'Road Repair Delay', true, 1),
  ('road-accident', 'road_transport', 'সড়ক দুর্ঘটনা', 'Road Accident', true, 2),
  ('road-block-obstruction', 'road_transport', 'সড়ক অবরোধ / চলাচলে প্রতিবন্ধকতা', 'Road Block / Obstruction', true, 3),
  ('road-footpath-overbridge-encroachment', 'illegal_occupation', 'রাস্তা / ফুটপাত / ফুটওভার ব্রিজ দখল', 'Road / Footpath / Foot-over-bridge Encroachment', true, 1),
  ('private-land-property-occupation', 'illegal_occupation', 'ব্যক্তিগত জমি/সম্পত্তি অবৈধ দখল', 'Illegal Occupation of Private Land / Property', true, 2),
  ('government-land-property-occupation', 'illegal_occupation', 'সরকারি জমি/সম্পত্তি অবৈধ দখল', 'Illegal Occupation of Government Land / Property', true, 3)
on conflict (id) do update
set segment_id = excluded.segment_id,
    name_bn = excluded.name_bn,
    name_en = excluded.name_en,
    active = excluded.active,
    sort_order = excluded.sort_order;

-- Keep all existing Extortion subcategory IDs intact and place them after Bribery.
update public.subcategories
set sort_order = case id
  when 'shop-business' then 3
  when 'transport-movement' then 4
  when 'construction-property' then 5
  when 'threat-money-demand' then 6
  when 'extortion-other' then 7
  else sort_order
end
where segment_id = 'extortion';

-- Root-cause fix: the legacy submit function had a permanent four-segment allowlist.
-- Replace only that exact known block so the function validates against active taxonomy.
do $phase1$
declare
  v_def text;
  v_old text := $old$
  IF v_segment NOT IN (
    'harassment',
    'rickshaw',
    'extortion',
    'load_shedding'
  ) THEN
    RAISE EXCEPTION
      'VALIDATION_FAILED: Invalid segment %',
      v_segment;
  END IF;
$old$;
  v_new text := $new$
  IF v_segment = '' OR NOT EXISTS (
    SELECT 1
    FROM public.segments s
    WHERE s.id = v_segment
      AND s.active = true
  ) THEN
    RAISE EXCEPTION
      'VALIDATION_FAILED: Selected reporting segment is not active.';
  END IF;

  IF v_subcategory = '' OR NOT EXISTS (
    SELECT 1
    FROM public.subcategories sc
    WHERE sc.id = v_subcategory
      AND sc.segment_id = v_segment
      AND sc.active = true
  ) THEN
    RAISE EXCEPTION
      'VALIDATION_FAILED: Selected complaint type is not active for this reporting segment.';
  END IF;
$new$;
begin
  select pg_get_functiondef(p.oid)
    into v_def
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'submit_public_complaint'
    and p.prokind = 'f'
    and pg_get_function_arguments(p.oid) = 'p_payload jsonb, p_client_submission_id text, p_reporter_context jsonb';

  if v_def is null then
    raise exception 'Expected public.submit_public_complaint(jsonb,text,jsonb) was not found.';
  end if;

  if position(v_old in v_def) = 0 then
    raise exception 'Expected legacy segment validation block was not found; migration aborted safely.';
  end if;

  v_def := replace(v_def, v_old, v_new);
  execute v_def;
end
$phase1$;

-- Migration contract assertions. Abort the migration rather than leave a partial taxonomy.
do $verify$
begin
  if (
    select count(*)
    from public.segments
    where active
      and id in (
        'harassment',
        'extortion',
        'public_safety',
        'road_transport',
        'load_shedding',
        'illegal_occupation',
        'rickshaw'
      )
  ) <> 7 then
    raise exception 'Phase 1 taxonomy verification failed: expected seven active segments.';
  end if;

  if not exists (
    select 1
    from public.subcategories
    where id = 'bribe-service-demand'
      and segment_id = 'extortion'
      and active
  ) then
    raise exception 'Phase 1 taxonomy verification failed: bribery subcategory missing.';
  end if;

  if pg_get_functiondef((
      select p.oid
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'submit_public_complaint'
        and p.prokind = 'f'
        and pg_get_function_arguments(p.oid) = 'p_payload jsonb, p_client_submission_id text, p_reporter_context jsonb'
      limit 1
    )) not ilike '%FROM public.segments s%'
  then
    raise exception 'Phase 1 submission guard verification failed.';
  end if;
end
$verify$;
