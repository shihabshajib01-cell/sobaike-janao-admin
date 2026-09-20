-- Final production cleanup for approved-source News Intake.
-- 1) Point UNB automation at a server-rendered current-news index.
-- 2) Quarantine the one attempted-child-murder report that was incorrectly
--    classified as Child Abduction / Murder before the classifier guard landed.

update public.news_source_domains
set homepage_url='https://unb.com.bd/newstoday',
    updated_at=now()
where hostname='unb.com.bd'
  and active=true
  and scan_enabled=true;

update public.complaints
set status='unpublished',
    custom_field_answers=
      coalesce(custom_field_answers,'{}'::jsonb)
      || jsonb_build_object(
        'newsIntakeReviewRequired',true,
        'newsIntakeReviewReason','Quarantined: attempted child murder is not Child Abduction / Murder unless an abduction or reported death is present.',
        'trustedSourceAuto',false,
        'sourceTruthMode','quarantined_mismatch'
      ),
    updated_at=now()
where id='SJ-2026-917489'
  and origin_type='sourced_report'
  and subcategory_id='child_abduction_murder';

insert into public.complaint_updates(
  complaint_id,update_type,note,is_public,created_at
)
select
  'SJ-2026-917489',
  'unpublished',
  'Automatically unpublished after News Intake classification regression audit: attempted child murder does not match Child Abduction / Murder without abduction or a reported death.',
  false,
  now()
where exists(
  select 1 from public.complaints
  where id='SJ-2026-917489'
    and status='unpublished'
)
and not exists(
  select 1 from public.complaint_updates
  where complaint_id='SJ-2026-917489'
    and update_type='unpublished'
    and note like 'Automatically unpublished after News Intake classification regression audit:%'
);

insert into public.admin_audit_logs(
  actor_id,action,target_type,target_id,details
)
select
  null,
  'news_intake.classification_quarantine',
  'complaint',
  'SJ-2026-917489',
  jsonb_build_object(
    'reason','attempted_child_murder_not_supported_by_child_abduction_murder',
    'previous_subcategory','child_abduction_murder',
    'timestamp',clock_timestamp()
  )
where exists(
  select 1 from public.complaints where id='SJ-2026-917489'
)
and not exists(
  select 1 from public.admin_audit_logs
  where action='news_intake.classification_quarantine'
    and target_id='SJ-2026-917489'
);
