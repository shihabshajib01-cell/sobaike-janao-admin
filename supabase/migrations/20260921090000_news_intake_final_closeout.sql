-- Final News Intake closeout.
-- 1) Require positive geographic evidence before trusted automatic reports can publish.
-- 2) Quarantine any already-published trusted-auto report that fails this stronger proof.
-- Live reporting-form schema validation remains authoritative through
-- sourced_report_schema_validation_errors_internal().

CREATE OR REPLACE FUNCTION public.news_intake_specific_location_has_positive_evidence(p_value text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO 'pg_catalog'
AS $function$
  select case
    when nullif(btrim(coalesce(p_value,'')),'') is null then false
    when char_length(btrim(p_value)) < 5 or char_length(btrim(p_value)) > 120 then false
    when p_value ~* '(থানা|উপজেলা|ইউনিয়ন|ইউনিয়ন|বাজার|মার্কেট|এলাকা|মহল্লা|গ্রাম|সড়ক|সড়ক|মহাসড়ক|মহাসড়ক|রোড|লেন|গলি|মোড়|মোড়|রেলগেট|স্টেশন|শহর|নগরী|মহানগরী|police[[:space:]]+station|thana|upazila|union|market|bazaar|area|neighbou?rhood|village|road|street|lane|avenue|highway|rail[[:space:]]*gate|station|city|metropolitan[[:space:]]+area)' then true
    when btrim(p_value) ~ '^[A-Z][A-Za-z0-9.''’\-]*(?:[[:space:],]+[A-Z0-9][A-Za-z0-9.''’\-]*){0,6}$' then true
    else false
  end
$function$;

REVOKE ALL ON FUNCTION public.news_intake_specific_location_has_positive_evidence(text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.news_intake_specific_location_has_positive_evidence(text)
TO service_role;

CREATE OR REPLACE FUNCTION public.guard_trusted_news_intake_positive_location()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog','public'
AS $function$
begin
  if new.origin_type <> 'sourced_report'
     or coalesce((new.custom_field_answers->>'trustedSourceAuto')::boolean,false) is not true
     or new.status <> 'published' then
    return new;
  end if;

  if (new.area is not null and (
        not public.news_intake_specific_location_text_is_safe(new.area)
        or not public.news_intake_specific_location_has_positive_evidence(new.area)
      ))
     or (new.road is not null and (
        not public.news_intake_specific_location_text_is_safe(new.road)
        or not public.news_intake_specific_location_has_positive_evidence(new.road)
      ))
     or (new.landmark is not null and (
        not public.news_intake_specific_location_text_is_safe(new.landmark)
        or not public.news_intake_specific_location_has_positive_evidence(new.landmark)
      ))
     or (new.formatted_address is not null and (
        not public.news_intake_specific_location_text_is_safe(new.formatted_address)
        or not public.news_intake_specific_location_has_positive_evidence(new.formatted_address)
      )) then
    raise exception 'SOURCE_LOCATION_QUALITY_FAILED: Trusted News Intake requires positively identifiable geographic place text.'
      using errcode='22023';
  end if;

  return new;
end
$function$;

REVOKE ALL ON FUNCTION public.guard_trusted_news_intake_positive_location()
FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_trusted_news_intake_positive_location
ON public.complaints;

CREATE TRIGGER trg_guard_trusted_news_intake_positive_location
BEFORE INSERT OR UPDATE ON public.complaints
FOR EACH ROW
EXECUTE FUNCTION public.guard_trusted_news_intake_positive_location();

WITH unsafe AS (
  SELECT c.id
  FROM public.complaints c
  WHERE c.origin_type='sourced_report'
    AND c.status='published'
    AND coalesce((c.custom_field_answers->>'trustedSourceAuto')::boolean,false)=true
    AND (
      (c.area is not null and not public.news_intake_specific_location_has_positive_evidence(c.area))
      OR (c.road is not null and not public.news_intake_specific_location_has_positive_evidence(c.road))
      OR (c.landmark is not null and not public.news_intake_specific_location_has_positive_evidence(c.landmark))
      OR (c.formatted_address is not null and not public.news_intake_specific_location_has_positive_evidence(c.formatted_address))
    )
),
updated AS (
  UPDATE public.complaints c
  SET status='submitted',
      custom_field_answers=
        coalesce(c.custom_field_answers,'{}'::jsonb)
        || jsonb_build_object(
          'newsIntakeReviewRequired',true,
          'newsIntakeReviewReason','Automatic quarantine: specific location did not contain positive geographic evidence.'
        ),
      updated_at=now()
  FROM unsafe u
  WHERE c.id=u.id
  RETURNING c.id
)
INSERT INTO public.admin_audit_logs(actor_id,action,target_type,target_id,details)
SELECT auth.uid(),'news_intake.positive_location_quarantine','complaint',u.id,
       jsonb_build_object(
         'reason','Trusted automatic report failed positive geographic place validation.',
         'timestamp',clock_timestamp()
       )
FROM updated u
WHERE NOT EXISTS (
  SELECT 1
  FROM public.admin_audit_logs l
  WHERE l.action='news_intake.positive_location_quarantine'
    AND l.target_id=u.id
);
