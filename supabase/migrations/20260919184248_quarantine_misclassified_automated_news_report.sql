-- Quarantine the known automated News Intake report that was published as
-- Theft even though the source wording describes a killing following a theft
-- accusation. Do not guess a replacement category in a data migration; return
-- it to human review and let an admin verify the source before republishing.
--
-- The guards make this correction idempotent and narrowly scoped to the exact
-- automated report state observed during the 2026-09-19 News Intake audit.

update public.complaints
set
  status = 'submitted',
  custom_field_answers =
    coalesce(custom_field_answers, '{}'::jsonb)
    || jsonb_build_object(
      'newsIntakeReviewRequired', true,
      'newsIntakeReviewReason',
      'Classification safety correction: theft-accusation violence requires human category review before publication.'
    ),
  updated_at = now()
where id = 'SJ-2026-240019'
  and origin_type = 'sourced_report'
  and coalesce(custom_field_answers->>'automatedIntake', 'false') = 'true'
  and status = 'published'
  and segment_id = 'public_safety'
  and subcategory_id = 'theft'
  and title = 'খুলনায় চুরির অপবাদে যুবককে পিটিয়ে হত্যা';
