-- Structured bribery reporting contract.
-- Preserve the stable extortion segment and historical subcategory IDs.

ALTER TABLE public.complaints
  ADD COLUMN IF NOT EXISTS bribery_department text,
  ADD COLUMN IF NOT EXISTS bribery_service text,
  ADD COLUMN IF NOT EXISTS bribery_amount numeric;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'complaints_bribery_amount_positive'
      AND conrelid = 'public.complaints'::regclass
  ) THEN
    ALTER TABLE public.complaints
      ADD CONSTRAINT complaints_bribery_amount_positive
      CHECK (bribery_amount IS NULL OR bribery_amount > 0);
  END IF;
END
$$;

UPDATE public.segments
SET
  name_bn = 'চাঁদাবাজি ও ঘুষ',
  name_en = 'Extortion & Bribery'
WHERE id = 'extortion';

UPDATE public.subcategories
SET
  name_bn = 'ঘুষ',
  name_en = 'Bribery',
  active = true,
  sort_order = 1
WHERE id = 'bribe-demanded-service'
  AND segment_id = 'extortion';

-- Historical reports may still reference this row, so keep it but prevent new submissions.
UPDATE public.subcategories
SET active = false
WHERE id = 'bribe-paid'
  AND segment_id = 'extortion';

DO $migration$
DECLARE
  v_def text;
  v_old text;
  v_new text;
BEGIN
  SELECT pg_get_functiondef('public.submit_public_complaint(jsonb,text,jsonb)'::regprocedure)
  INTO v_def;

  v_old := E'  v_previous_bill_amount numeric;\n\n  v_response jsonb;';
  v_new := E'  v_previous_bill_amount numeric;\n\n  v_bribery_department text;\n  v_bribery_service text;\n  v_bribery_amount numeric;\n\n  v_response jsonb;';
  IF position(v_old in v_def) = 0 THEN
    RAISE EXCEPTION 'Bribery migration guard failed: declaration anchor not found';
  END IF;
  v_def := replace(v_def, v_old, v_new);

  v_old := E'  -- ===========================================================================\n  -- 4.9 INCIDENT LOCATION';
  v_new := E'  -- ===========================================================================\n  -- 4.9 BRIBERY DETAILS\n  -- ===========================================================================\n\n  v_bribery_department := NULL;\n  v_bribery_service := NULL;\n  v_bribery_amount := NULL;\n\n  IF v_segment = ''extortion''\n     AND v_subcategory = ''bribe-demanded-service''\n  THEN\n    v_bribery_department := nullif(trim(coalesce(p_payload->>''briberyDepartment'', p_payload->>''bribery_department'', '''')), '''');\n    v_bribery_service := nullif(trim(coalesce(p_payload->>''briberyService'', p_payload->>''bribery_service'', '''')), '''');\n\n    IF v_bribery_department IS NOT NULL AND v_bribery_department NOT IN (\n      ''land_office'', ''immigration_office'', ''tax_office'', ''customs_office'',\n      ''traffic_police'', ''brta'', ''passport_office'', ''city_corporation'',\n      ''sub_registry_office'', ''education_office'', ''government_hospital'',\n      ''other_government_service''\n    ) THEN\n      RAISE EXCEPTION ''VALIDATION_FAILED: Invalid bribery department.'';\n    END IF;\n\n    IF v_bribery_service IS NOT NULL AND length(v_bribery_service) > 250 THEN\n      RAISE EXCEPTION ''VALIDATION_FAILED: Bribery service/process exceeds 250 characters.'';\n    END IF;\n\n    IF nullif(trim(coalesce(p_payload->>''briberyAmount'', p_payload->>''bribery_amount'', '''')), '''') IS NOT NULL THEN\n      BEGIN\n        v_bribery_amount := coalesce(\n          nullif(trim(p_payload->>''briberyAmount''), '''')::numeric,\n          nullif(trim(p_payload->>''bribery_amount''), '''')::numeric\n        );\n      EXCEPTION WHEN OTHERS THEN\n        RAISE EXCEPTION ''VALIDATION_FAILED: Bribery amount must be a valid number.'';\n      END;\n\n      IF v_bribery_amount <= 0 THEN\n        RAISE EXCEPTION ''VALIDATION_FAILED: Bribery amount must be greater than zero.'';\n      END IF;\n    END IF;\n  END IF;\n\n  -- ===========================================================================\n  -- 4.10 INCIDENT LOCATION';
  IF position(v_old in v_def) = 0 THEN
    RAISE EXCEPTION 'Bribery migration guard failed: location anchor not found';
  END IF;
  v_def := replace(v_def, v_old, v_new);

  v_old := E'    previous_bill_month,\n    previous_bill_amount,\n\n    status,';
  v_new := E'    previous_bill_month,\n    previous_bill_amount,\n\n    bribery_department,\n    bribery_service,\n    bribery_amount,\n\n    status,';
  IF position(v_old in v_def) = 0 THEN
    RAISE EXCEPTION 'Bribery migration guard failed: insert-column anchor not found';
  END IF;
  v_def := replace(v_def, v_old, v_new);

  v_old := E'    v_previous_bill_month,\n    v_previous_bill_amount,\n\n    ''submitted'',';
  v_new := E'    v_previous_bill_month,\n    v_previous_bill_amount,\n\n    v_bribery_department,\n    v_bribery_service,\n    v_bribery_amount,\n\n    ''submitted'',';
  IF position(v_old in v_def) = 0 THEN
    RAISE EXCEPTION 'Bribery migration guard failed: insert-value anchor not found';
  END IF;
  v_def := replace(v_def, v_old, v_new);

  EXECUTE v_def;
END
$migration$;

-- Preserve the established RPC privilege model after CREATE OR REPLACE.
REVOKE ALL ON FUNCTION public.submit_public_complaint(jsonb, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_complaint(jsonb, text, jsonb) TO anon, authenticated;
