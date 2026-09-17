-- Keep the existing taxonomy IDs stable while aligning the canonical display order
-- across Public, SQL and Admin.

update public.segments
set sort_order = case id
  when 'harassment' then 1
  when 'load_shedding' then 2
  when 'extortion' then 3
  when 'public_safety' then 4
  when 'road_transport' then 5
  when 'illegal_occupation' then 6
  when 'rickshaw' then 7
  else sort_order
end
where id in (
  'harassment',
  'load_shedding',
  'extortion',
  'public_safety',
  'road_transport',
  'illegal_occupation',
  'rickshaw'
);

update public.segments
set
  name_bn = 'অবৈধ অটো-রিকশা চার্জিং স্টেশন',
  name_en = 'Illegal Auto-rickshaw Charging Station'
where id = 'rickshaw';

update public.subcategories
set
  name_bn = 'অবৈধ অটো-রিকশা চার্জিং স্টেশন',
  name_en = 'Illegal Auto-rickshaw Charging Station'
where id = 'charging-station-location'
  and segment_id = 'rickshaw';
