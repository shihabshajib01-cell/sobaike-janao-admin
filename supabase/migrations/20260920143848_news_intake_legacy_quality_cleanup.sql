-- Quarantine any trusted-auto report published before the source-quality gate
-- that would be rejected by the current production publishing contract.
with candidates as (
  select c.id
  from public.complaints c
  where c.status='published'
    and c.origin_type='sourced_report'
    and coalesce((c.custom_field_answers->>'trustedSourceAuto')::boolean,false)=true
    and (
      public.normalize_duplicate_text(c.title)=public.normalize_duplicate_text(c.description)
      or char_length(public.normalize_duplicate_text(c.description))<80
      or c.title ~* '(জামিন|রিমান্ড|আদালত|শুনানি|চার্জশিট|চার্জ[[:space:]]*শিট|অভিযোগপত্র|রায়|রায়|দণ্ড|সাজা|আপিল|বিচার[[:space:]]+শুরু|সাক্ষ্যগ্রহণ)'
      or lower(c.title) ~ '(bail|remand|court|hearing|charge[ -]?sheet|chargesheet|verdict|sentenced?|appeal|trial)'
      or (coalesce(c.title,'')||' '||coalesce(c.description,'')) ~* '(বলে[[:space:]]+প্রচার|দাবিটি[[:space:]]+সত্য[[:space:]]+নয়|দাবিটি[[:space:]]+সত্য[[:space:]]+নয়|ভুয়া[[:space:]]+দাবি|ভুয়া[[:space:]]+দাবি|ফ্যাক্ট[[:space:]]*চেক|তথ্য[[:space:]]+যাচাই|যাচাই[[:space:]]+করে[[:space:]]+দেখা[[:space:]]+গেছে|মিথ্যা[[:space:]]+দাবি|ভুল[[:space:]]+তথ্য)'
      or lower(coalesce(c.title,'')||' '||coalesce(c.description,'')) ~ '(fact[- ]?check|false[[:space:]]+claim|misinformation|misleading[[:space:]]+claim|debunk(ed|ing)?)'
      or coalesce(c.formatted_address,'') ~* '(এদিকে|অন্যদিকে|এ[[:space:]]+ঘটনায়|এ[[:space:]]+ঘটনায়|করে[[:space:]]+[^, ]+[[:space:]]+(থানা|উপজেলা))'
    )
),
updated as (
  update public.complaints c
  set status='submitted',
      custom_field_answers=
        coalesce(c.custom_field_answers,'{}'::jsonb)
        || jsonb_build_object(
          'newsIntakeReviewRequired',true,
          'newsIntakeReviewReason',
          'Legacy trusted-source report quarantined because it does not meet the current News Intake source-quality gate.'
        ),
      updated_at=now()
  from candidates q
  where c.id=q.id
  returning c.id
)
insert into public.admin_audit_logs(actor_id,action,target_type,target_id,details)
select auth.uid(),
       'news_intake.legacy_quality_quarantine',
       'complaint',
       u.id,
       jsonb_build_object(
         'reason','Published before the final source-quality gate and would now be rejected by that gate.',
         'timestamp',clock_timestamp()
       )
from updated u
where not exists (
  select 1
  from public.admin_audit_logs l
  where l.action='news_intake.legacy_quality_quarantine'
    and l.target_id=u.id
);
