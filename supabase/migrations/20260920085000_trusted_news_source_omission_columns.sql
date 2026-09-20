-- Allow approved-publisher News Intake reports to preserve source omissions.
-- Citizen/manual reports keep incident date + division + district as hard requirements.

ALTER TABLE public.complaints
  ALTER COLUMN incident_date DROP NOT NULL,
  ALTER COLUMN division DROP NOT NULL,
  ALTER COLUMN district DROP NOT NULL;

ALTER TABLE public.complaints
  DROP CONSTRAINT IF EXISTS complaints_core_facts_required_unless_trusted_source;

ALTER TABLE public.complaints
  ADD CONSTRAINT complaints_core_facts_required_unless_trusted_source
  CHECK (
    (
      incident_date IS NOT NULL
      AND nullif(btrim(division),'') IS NOT NULL
      AND nullif(btrim(district),'') IS NOT NULL
    )
    OR
    (
      origin_type='sourced_report'
      AND lower(coalesce(custom_field_answers->>'trustedSourceAuto','false'))='true'
      AND coalesce(custom_field_answers->>'sourceTruthMode','')='approved_publisher'
    )
  );

COMMENT ON CONSTRAINT complaints_core_facts_required_unless_trusted_source
ON public.complaints IS
  'Citizen/manual reports require incident date, division, and district. Approved-publisher automation may omit facts the source does not state.';
