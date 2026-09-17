alter table public.complaints
  add column if not exists mob_justice_details jsonb;

alter table public.complaints
  drop constraint if exists complaints_mob_justice_details_check;

alter table public.complaints
  add constraint complaints_mob_justice_details_check
  check (
    mob_justice_details is null
    or (
      segment_id = 'public_safety'
      and subcategory_id = 'mob-justice'
      and jsonb_typeof(mob_justice_details) = 'object'
      and (mob_justice_details->>'trigger') in (
        'suspected_theft_robbery',
        'snatching_allegation',
        'kidnapping_allegation',
        'sexual_offence_allegation',
        'religious_sentiment_allegation',
        'personal_local_dispute',
        'informal_punishment',
        'other_accusation_dispute',
        'unknown'
      )
      and (
        nullif(trim(coalesce(mob_justice_details->>'spread', '')), '') is null
        or (mob_justice_details->>'spread') in (
          'direct_accusation',
          'word_of_mouth',
          'social_media',
          'message_group_post',
          'loudspeaker_announcement',
          'local_arbitration_meeting',
          'organized_gathering',
          'unknown',
          'other'
        )
      )
      and (mob_justice_details->>'outcome') in (
        'threatened_harassed',
        'restrained_surrounded',
        'physically_assaulted',
        'seriously_injured',
        'death_reported',
        'property_damaged',
        'rescued_intervention',
        'ongoing',
        'unknown'
      )
      and (mob_justice_details->>'ongoingStatus') in ('ongoing', 'ended', 'unknown')
      and (
        not (mob_justice_details ? 'targetedCount')
        or mob_justice_details->'targetedCount' is null
        or mob_justice_details->'targetedCount' = 'null'::jsonb
        or case
          when jsonb_typeof(mob_justice_details->'targetedCount') = 'number' then
            (mob_justice_details->>'targetedCount')::numeric between 1 and 9999
            and (mob_justice_details->>'targetedCount')::numeric = trunc((mob_justice_details->>'targetedCount')::numeric)
          else false
        end
      )
    )
  );

insert into public.subcategories (
  id,
  segment_id,
  name_bn,
  name_en,
  active,
  sort_order
)
values (
  'mob-justice',
  'public_safety',
  'গণপিটুনি / মব সহিংসতা',
  'Mob Justice / Mob Violence',
  true,
  4
)
on conflict (id) do update
set segment_id = excluded.segment_id,
    name_bn = excluded.name_bn,
    name_en = excluded.name_en,
    active = excluded.active,
    sort_order = excluded.sort_order;

create or replace function public.submit_public_complaint_v2(
  p_payload jsonb,
  p_client_submission_id text,
  p_reporter_context jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_segment text;
  v_subcategory text;
  v_age_group text;
  v_relationship text;
  v_reporting_for text;
  v_mob_details jsonb;
  v_mob_trigger text;
  v_mob_spread text;
  v_mob_outcome text;
  v_mob_ongoing_status text;
  v_mob_targeted_count numeric;
  v_result jsonb;
  v_report_id text;
begin
  v_segment := trim(coalesce(p_payload->>'segment', ''));
  v_subcategory := trim(coalesce(p_payload->>'subcategoryId', p_payload->>'subcategory_id', ''));

  if v_segment = '' or not exists (
    select 1
    from public.segments s
    where s.id = v_segment
      and s.active = true
  ) then
    raise exception 'VALIDATION_FAILED: Selected reporting segment is not active.';
  end if;

  if v_subcategory = '' or not exists (
    select 1
    from public.subcategories sc
    where sc.id = v_subcategory
      and sc.segment_id = v_segment
      and sc.active = true
  ) then
    raise exception 'VALIDATION_FAILED: Selected complaint type is not active for this reporting segment.';
  end if;

  if v_segment = 'harassment' then
    v_age_group := nullif(trim(coalesce(p_payload->>'affectedPersonAgeGroup', p_payload->>'affected_person_age_group', '')), '');
    v_relationship := nullif(trim(coalesce(p_payload->>'allegedAbuserRelationship', p_payload->>'alleged_abuser_relationship', '')), '');
    v_reporting_for := nullif(trim(coalesce(p_payload->>'reportingFor', p_payload->>'reporting_for', '')), '');

    if v_age_group is null or v_age_group not in ('under_18', '18_29', '30_59', '60_plus', 'prefer_not_to_say') then
      raise exception 'VALIDATION_FAILED: A valid affected person age group is required for harassment reports.';
    end if;

    if v_relationship is null or v_relationship not in (
      'intimate_partner', 'household_family', 'other_relative',
      'friend_acquaintance', 'coworker_classmate',
      'authority_caregiver_service_provider', 'stranger', 'other_or_unknown'
    ) then
      raise exception 'VALIDATION_FAILED: A valid relationship with the alleged abuser is required for harassment reports.';
    end if;

    if v_reporting_for is null or v_reporting_for not in ('self', 'someone_else') then
      raise exception 'VALIDATION_FAILED: Reporting-for selection is required for harassment reports.';
    end if;
  else
    v_age_group := null;
    v_relationship := null;
    v_reporting_for := null;
  end if;

  if v_segment = 'public_safety' and v_subcategory = 'mob-justice' then
    v_mob_details := coalesce(p_payload->'mobJusticeDetails', p_payload->'mob_justice_details');

    if v_mob_details is null or jsonb_typeof(v_mob_details) <> 'object' then
      raise exception 'VALIDATION_FAILED: Mob Justice details are required.';
    end if;

    v_mob_trigger := nullif(trim(coalesce(v_mob_details->>'trigger', '')), '');
    v_mob_spread := nullif(trim(coalesce(v_mob_details->>'spread', '')), '');
    v_mob_outcome := nullif(trim(coalesce(v_mob_details->>'outcome', '')), '');
    v_mob_ongoing_status := nullif(trim(coalesce(v_mob_details->>'ongoingStatus', v_mob_details->>'ongoing_status', '')), '');

    if v_mob_trigger is null or v_mob_trigger not in (
      'suspected_theft_robbery', 'snatching_allegation', 'kidnapping_allegation',
      'sexual_offence_allegation', 'religious_sentiment_allegation',
      'personal_local_dispute', 'informal_punishment', 'other_accusation_dispute', 'unknown'
    ) then
      raise exception 'VALIDATION_FAILED: A valid Mob Justice trigger is required.';
    end if;

    if v_mob_spread is not null and v_mob_spread not in (
      'direct_accusation', 'word_of_mouth', 'social_media', 'message_group_post',
      'loudspeaker_announcement', 'local_arbitration_meeting', 'organized_gathering',
      'unknown', 'other'
    ) then
      raise exception 'VALIDATION_FAILED: Invalid Mob Justice spread channel.';
    end if;

    if v_mob_outcome is null or v_mob_outcome not in (
      'threatened_harassed', 'restrained_surrounded', 'physically_assaulted',
      'seriously_injured', 'death_reported', 'property_damaged',
      'rescued_intervention', 'ongoing', 'unknown'
    ) then
      raise exception 'VALIDATION_FAILED: A valid Mob Justice outcome is required.';
    end if;

    if v_mob_ongoing_status is null or v_mob_ongoing_status not in ('ongoing', 'ended', 'unknown') then
      raise exception 'VALIDATION_FAILED: A valid Mob Justice ongoing status is required.';
    end if;

    v_mob_targeted_count := null;
    if nullif(trim(coalesce(v_mob_details->>'targetedCount', v_mob_details->>'targeted_count', '')), '') is not null then
      begin
        v_mob_targeted_count := coalesce(
          nullif(trim(v_mob_details->>'targetedCount'), '')::numeric,
          nullif(trim(v_mob_details->>'targeted_count'), '')::numeric
        );
      exception when others then
        raise exception 'VALIDATION_FAILED: Mob Justice targeted count must be a valid whole number.';
      end;

      if v_mob_targeted_count < 1 or v_mob_targeted_count > 9999 or v_mob_targeted_count <> trunc(v_mob_targeted_count) then
        raise exception 'VALIDATION_FAILED: Mob Justice targeted count must be a whole number between 1 and 9999.';
      end if;
    end if;

    v_mob_details := jsonb_strip_nulls(jsonb_build_object(
      'trigger', v_mob_trigger,
      'spread', v_mob_spread,
      'outcome', v_mob_outcome,
      'targetedCount', v_mob_targeted_count,
      'ongoingStatus', v_mob_ongoing_status
    ));
  else
    v_mob_details := null;
  end if;

  v_result := public.submit_public_complaint(p_payload, p_client_submission_id, p_reporter_context);
  v_report_id := nullif(trim(coalesce(v_result->>'reportId', '')), '');

  if v_report_id is null then
    raise exception 'SUBMISSION_FAILED: Missing report identifier from the underlying submission.';
  end if;

  update public.complaints
  set affected_person_age_group = v_age_group,
      alleged_abuser_relationship = v_relationship,
      reporting_for = v_reporting_for,
      mob_justice_details = v_mob_details,
      updated_at = now()
  where id = v_report_id;

  return v_result;
end;
$function$;
