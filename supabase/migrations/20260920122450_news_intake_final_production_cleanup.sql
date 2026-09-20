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
        'newsIntakeReviewReason','Quarantined: attempted child murder is not Child Abduction / Murder unless an abduction or reported death is present.'
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


-- A quarantined trusted-source report must never regain the trusted auto-publish
-- bypass simply because it still carries its original source provenance.
create or replace function public.guard_sourced_report_publish_readiness()
returns trigger
language plpgsql
set search_path to 'pg_catalog','public'
as $function$
declare
  v_privacy_review_required boolean:=false;
begin
  if new.origin_type = 'sourced_report'
     and new.status = 'published'
     and old.status is distinct from 'published' then

    if coalesce(new.custom_field_answers->>'newsIntakeReviewRequired','false') = 'true' then
      raise exception 'SOURCE_GROUNDING_REVIEW_REQUIRED: This sourced report is flagged for review before publication.'
        using errcode='22023';
    end if;

    if lower(coalesce(new.custom_field_answers->>'trustedSourceAuto','false'))='true'
       and coalesce(new.custom_field_answers->>'sourceTruthMode','')='approved_publisher' then
      return new;
    end if;

    v_privacy_review_required:=public.news_intake_privacy_review_required(new.subcategory_id);

    if v_privacy_review_required
       and lower(coalesce(new.custom_field_answers->>'sensitiveContentReviewed','false')) <> 'true' then
      raise exception 'SOURCE_SENSITIVE_CONTENT_REVIEW_REQUIRED: Review the public title, summary, location, and identifying details before publishing this sensitive sourced report.'
        using errcode='22023';
    end if;
  end if;

  return new;
end;
$function$;
