-- News Intake: keep public sourced reports in their original source language and
-- repair legacy automatic drafts created before strict date/location grounding.

create or replace function public.normalize_sourced_report_public_language()
returns trigger
language plpgsql
set search_path = 'pg_catalog','public'
as $$
declare
  v_lang text;
  v_prefs jsonb;
  v_title text;
  v_summary text;
begin
  if new.origin_type <> 'sourced_report' or new.status <> 'published' then
    return new;
  end if;

  v_lang := lower(coalesce(nullif(btrim(new.custom_field_answers->>'sourceLanguage'),''),'unknown'));
  v_prefs := coalesce(new.publication_preferences,'{}'::jsonb);

  if v_lang = 'bn' then
    v_title := coalesce(
      nullif(btrim(v_prefs->>'publicTitleBn'),''),
      nullif(btrim(new.title),''),
      nullif(btrim(new.title_en),''),
      new.id
    );
    v_summary := coalesce(
      nullif(btrim(v_prefs->>'publicSummaryBn'),''),
      nullif(btrim(new.description),''),
      nullif(btrim(new.description_en),'')
    );

    v_prefs := v_prefs - 'publicTitleEn' - 'publicSummaryEn';
    v_prefs := jsonb_set(v_prefs,'{publicTitleBn}',to_jsonb(v_title),true);
    if coalesce((v_prefs->>'showDescription')::boolean,true) and v_summary is not null then
      v_prefs := jsonb_set(v_prefs,'{publicSummaryBn}',to_jsonb(v_summary),true);
    else
      v_prefs := v_prefs - 'publicSummaryBn';
    end if;
  elsif v_lang = 'en' then
    v_title := coalesce(
      nullif(btrim(v_prefs->>'publicTitleEn'),''),
      nullif(btrim(v_prefs->>'publicTitleBn'),''),
      nullif(btrim(new.title_en),''),
      nullif(btrim(new.title),''),
      new.id
    );
    v_summary := coalesce(
      nullif(btrim(v_prefs->>'publicSummaryEn'),''),
      nullif(btrim(v_prefs->>'publicSummaryBn'),''),
      nullif(btrim(new.description_en),''),
      nullif(btrim(new.description),'')
    );

    v_prefs := v_prefs - 'publicTitleBn' - 'publicSummaryBn';
    v_prefs := jsonb_set(v_prefs,'{publicTitleEn}',to_jsonb(v_title),true);
    if coalesce((v_prefs->>'showDescription')::boolean,true) and v_summary is not null then
      v_prefs := jsonb_set(v_prefs,'{publicSummaryEn}',to_jsonb(v_summary),true);
    else
      v_prefs := v_prefs - 'publicSummaryEn';
    end if;
  end if;

  new.publication_preferences := v_prefs;
  return new;
end;
$$;

drop trigger if exists trg_normalize_sourced_report_public_language on public.complaints;
create trigger trg_normalize_sourced_report_public_language
before insert or update of status, publication_preferences
on public.complaints
for each row
execute function public.normalize_sourced_report_public_language();

update public.complaints
set incident_date='2026-09-17'::date,
    updated_at=now()
where id='SJ-2026-606979'
  and origin_type='sourced_report';

update public.complaints
set custom_field_answers =
      coalesce(custom_field_answers,'{}'::jsonb)
      || jsonb_build_object(
        'newsIntakeReviewRequired',true,
        'newsIntakeReviewReason','incident_date_not_safely_grounded'
      ),
    updated_at=now()
where id='SJ-2026-261240'
  and origin_type='sourced_report';

update public.complaints
set area='Gopalnagar',
    formatted_address='Gopalnagar, Bheramara, Kushtia',
    description='According to the complaint, a motorcycle waylaid Toma at Gopalnagar around 9pm on Thursday and picked her up at an abandoned place when she was returning to her home in Fakirabad Bakshipara. A 20-year-old girl who was reportedly raped by four people on Thursday (17 September) died at Rajshahi Medical College and Hospital today (19 September). The deceased was identified as Tama Khatun, daughter of Tofazzal Hossain in Bheramara upazila of Kushtia district. Rafiqul Islam, Officer-in-Charge of Bheramara Police Station, said mother of the girl lodged a complaint with the police station.',
    updated_at=now()
where id='SJ-2026-448169'
  and origin_type='sourced_report';

update public.complaints
set area='বেতগর্ভ গ্রাম, সরিকল ইউনিয়ন',
    formatted_address='বেতগর্ভ গ্রাম, সরিকল ইউনিয়ন, গৌরনদী, বরিশাল',
    updated_at=now()
where id='SJ-2026-931987'
  and origin_type='sourced_report';

update public.complaints
set incident_date='2026-09-18'::date,
    upazila_or_thana='Harintana',
    area='ইসলামনগর মসজিদ গলি',
    formatted_address='ইসলামনগর মসজিদ গলি, হরিণটানা, খুলনা',
    description='খুলনা মহানগরীতে চুরির অপবাদে আজমল ওরফে আযম (২৩) নামের এক যুবককে পিটিয়ে হত্যার অভিযোগ উঠেছে। শুক্রবার (১৮ সেপ্টেম্বর) দিবাগত রাতে নগরীর হরিণটানা থানার ইসলামনগর মসজিদ গলিতে এ ঘটনা ঘটে। নিহত আজমল ওরফে আযম চুয়াডাঙ্গা জেলা সদরের কুতুবের ছেলে। পুলিশ ও স্থানীয়রা জানান, আজমল খুলনা বিশ্ববিদ্যালয়ের খানজাহান আলী হলের বিপরীত গলির আকিবের বাড়ির পঞ্চমতলার একটি মেসে ভাড়াটিয়া হিসেবে বসবাস করেন।',
    publication_preferences =
      jsonb_set(
        coalesce(publication_preferences,'{}'::jsonb),
        '{publicSummaryBn}',
        to_jsonb('খুলনা মহানগরীতে চুরির অপবাদে আজমল ওরফে আযম (২৩) নামের এক যুবককে পিটিয়ে হত্যার অভিযোগ উঠেছে। শুক্রবার (১৮ সেপ্টেম্বর) দিবাগত রাতে নগরীর হরিণটানা থানার ইসলামনগর মসজিদ গলিতে এ ঘটনা ঘটে।'::text),
        true
      ),
    updated_at=now()
where id='SJ-2026-240019'
  and origin_type='sourced_report';

update public.complaints
set publication_preferences = coalesce(publication_preferences,'{}'::jsonb),
    updated_at=updated_at
where origin_type='sourced_report'
  and status='published'
  and coalesce(custom_field_answers->>'sourceLanguage','') in ('bn','en');
