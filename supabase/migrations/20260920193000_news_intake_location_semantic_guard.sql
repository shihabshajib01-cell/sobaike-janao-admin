-- Keep the database publish guard aligned with the scanner's semantic
-- location checks. Narrative/date fragments and multiple administrative
-- locations must never be accepted as one specific incident place.

create or replace function public.news_intake_specific_location_text_is_safe(p_value text)
returns boolean
language sql
immutable
set search_path='pg_catalog'
as $function$
select case
  when nullif(btrim(coalesce(p_value,'')),'') is null then false
  when char_length(btrim(p_value))<5 or char_length(btrim(p_value))>120 then false
  when lower(btrim(p_value)) ~ '^(area|market|bazaar|thana|upazila|union|village|city|road|street|lane|station)$' then false
  when lower(btrim(p_value)) ~ '^(on|at|in|near)[[:space:]]+(the[[:space:]]+)?(road|street|lane|area|city|district|station)([[:space:]]+[0-9]+)?$' then false
  when lower(p_value) ~ '(various|several)[[:space:]]+areas?' then false
  when p_value ~ '(বিভিন্ন)[[:space:]]+এলাকা' then false
  when btrim(p_value) ~ '^(?:[০-৯0-9]{1,2}[[:space:]]+)?(?:জানুয়ারি|জানুয়ারি|ফেব্রুয়ারি|ফেব্রুয়ারি|মার্চ|এপ্রিল|মে|জুন|জুলাই|আগস্ট|সেপ্টেম্বর|অক্টোবর|নভেম্বর|ডিসেম্বর|সকাল|দুপুর|বিকেল|সন্ধ্যা|রাত)' then false
  when lower(btrim(p_value)) ~ '^(?:[0-9]{1,2}[[:space:]]+)?(?:january|february|march|april|may|june|july|august|september|october|november|december|morning|afternoon|evening|night)([[:space:]]|$)' then false
  when p_value ~ '(জেলার).{0,90}([[:space:]]ও[[:space:]]|[[:space:]]এবং[[:space:]]|,).{0,90}(উপজেলা|থানা)' then false
  when lower(p_value) ~ 'district(''s)? .{0,90}([[:space:]]and[[:space:]]|,).{0,90}(upazila|thana)' then false
  when p_value ~ '(উপজেলা|থানা).{0,70}([[:space:]]ও[[:space:]]|[[:space:]]এবং[[:space:]]|,).{0,70}(উপজেলা|থানা)' then false
  when lower(p_value) ~ '(upazila|thana).{0,70}([[:space:]]and[[:space:]]|,).{0,70}(upazila|thana)' then false
  when lower(p_value) ~ '(collected[[:space:]]+evidence|cordoned[[:space:]]+off|investigat(e|ed|ing|ion)|police[[:space:]]+said|officials?[[:space:]]+said|victims?|the[[:space:]]+victim|was[[:space:]]+arrested|were[[:space:]]+arrested|detained|went[[:space:]]+to[[:space:]]+the[[:space:]]+area|visited[[:space:]]+the[[:space:]]+area)' then false
  when p_value ~ '(ভুক্তভোগী|পুলিশ[[:space:]]+জানায়|পুলিশ[[:space:]]+জানায়|কর্তৃপক্ষ|তদন্ত|গ্রেপ্তার|আটক|নিহত|আহত|উদ্ধার|জানান|বলেন)' then false
  when p_value ~ '(^|[[:space:]])(এদিকে|অন্যদিকে|এ[[:space:]]+ঘটনায়|এ[[:space:]]+ঘটনায়|এই[[:space:]]+ঘটনায়|এই[[:space:]]+ঘটনায়)($|[[:space:]])' then false
  when p_value ~ '^(র|এর)[[:space:]]+' then false
  else true
end
$function$;

revoke all on function public.news_intake_specific_location_text_is_safe(text)
from public,anon,authenticated;
grant execute on function public.news_intake_specific_location_text_is_safe(text)
to service_role;
