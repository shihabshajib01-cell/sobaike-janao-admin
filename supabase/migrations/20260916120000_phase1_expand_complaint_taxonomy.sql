-- Phase 1: expand the public complaint taxonomy without rewriting existing reports.
-- Existing internal segment IDs are preserved for backward compatibility.

INSERT INTO public.segments (id, name_bn, name_en, active, sort_order)
VALUES
  ('harassment', 'হয়রানি ও নির্যাতন', 'Harassment & abuse', true, 1),
  ('extortion', 'ঘুষ ও চাঁদাবাজি', 'Bribery & Extortion', true, 2),
  ('public_safety', 'জননিরাপত্তা', 'Public Safety', true, 3),
  ('road_transport', 'সড়ক ও যাতায়াত সমস্যা', 'Road & Transport Issues', true, 4),
  ('load_shedding', 'ইউটিলিটি সমস্যা', 'Utility issues', true, 5),
  ('illegal_occupation', 'অবৈধ দখল', 'Illegal Occupation', true, 6),
  ('rickshaw', 'অবৈধ অটো চার্জিং', 'Illegal auto-rickshaw charging', true, 7)
ON CONFLICT (id) DO UPDATE
SET
  name_bn = EXCLUDED.name_bn,
  name_en = EXCLUDED.name_en,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order;

INSERT INTO public.subcategories (id, segment_id, name_bn, name_en, active, sort_order)
VALUES
  -- Harassment & Abuse (existing, normalized order)
  ('rape-sexual-violence', 'harassment', 'ধর্ষণ / যৌন সহিংসতা', 'Rape / Sexual Violence', true, 1),
  ('sexual-harassment', 'harassment', 'যৌন হয়রানি', 'Sexual Harassment', true, 2),
  ('domestic-violence', 'harassment', 'পারিবারিক সহিংসতা', 'Domestic Violence', true, 3),
  ('blackmail-coercion', 'harassment', 'ব্ল্যাকমেইল / জবরদস্তি', 'Blackmailing / Coercion', true, 4),
  ('honeytrap', 'harassment', 'হানিট্র্যাপ', 'Honeytrap', true, 5),

  -- Bribery & Extortion (existing segment key retained)
  ('bribe-demanded-service', 'extortion', 'সেবা পেতে ঘুষ দাবি', 'Bribe Demanded for a Service', true, 1),
  ('bribe-paid', 'extortion', 'ঘুষ প্রদান', 'Bribe Paid', true, 2),
  ('shop-business', 'extortion', 'দোকান ও ব্যবসা প্রতিষ্ঠানে চাঁদা দাবি', 'Extortion from Shops & Businesses', true, 3),
  ('transport-movement', 'extortion', 'পরিবহন বা চলাচলে চাঁদা দাবি', 'Extortion in Transport & Transit', true, 4),
  ('construction-property', 'extortion', 'নির্মাণ/সম্পত্তি সংক্রান্ত চাঁদা দাবি', 'Construction & Property Extortion', true, 5),
  ('threat-money-demand', 'extortion', 'হুমকি দিয়ে টাকা দাবি', 'Threats & Coercive Demands', true, 6),
  ('extortion-other', 'extortion', 'অন্যান্য চাঁদাবাজি', 'Other Extortion', true, 7),

  -- Public Safety
  ('theft', 'public_safety', 'চুরি', 'Theft', true, 1),
  ('robbery', 'public_safety', 'ডাকাতি', 'Robbery / Dacoity', true, 2),
  ('snatching', 'public_safety', 'ছিনতাই', 'Snatching', true, 3),

  -- Road & Transport Issues
  ('road-repair-delay', 'road_transport', 'রাস্তা মেরামতে বিলম্ব', 'Road Repair Delay', true, 1),
  ('road-accident', 'road_transport', 'সড়ক দুর্ঘটনা', 'Road Accident', true, 2),
  ('road-block', 'road_transport', 'সড়ক অবরোধ', 'Road Block / Obstruction', true, 3),

  -- Utility Issues
  ('load-shedding-outage', 'load_shedding', 'লোডশেডিং', 'Load Shedding', true, 1),
  ('gas-shortage', 'load_shedding', 'গ্যাস সংকট', 'Gas Shortage', true, 2),
  ('excess-electricity-bill', 'load_shedding', 'অতিরিক্ত বিদ্যুৎ বিল', 'Excess Electricity Bill', true, 3),

  -- Illegal Occupation
  ('road-public-space-encroachment', 'illegal_occupation', 'রাস্তা / ফুটপাত / ফুটওভার ব্রিজ দখল', 'Road / Footpath / Foot-over-bridge Encroachment', true, 1),
  ('private-property-occupation', 'illegal_occupation', 'ব্যক্তিগত জমি/সম্পত্তি অবৈধ দখল', 'Illegal Occupation of Private Land / Property', true, 2),
  ('government-property-occupation', 'illegal_occupation', 'সরকারি জমি/সম্পত্তি অবৈধ দখল', 'Illegal Occupation of Government Land / Property', true, 3),

  -- Illegal auto-rickshaw charging
  ('charging-station-location', 'rickshaw', 'অবৈধ অটো চার্জিং', 'Illegal auto-rickshaw charging', true, 1)
ON CONFLICT (id) DO UPDATE
SET
  segment_id = EXCLUDED.segment_id,
  name_bn = EXCLUDED.name_bn,
  name_en = EXCLUDED.name_en,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order;

-- The v2 wrapper already validates segment/subcategory activity dynamically, but the
-- underlying legacy submit_public_complaint function still contains the original
-- four-segment allow-list. Patch only that exact guard and preserve every other line
-- of the proven submission function.
DO $migration$
DECLARE
  v_definition text;
  v_patched text;
  v_old_guard text := E'IF v_segment NOT IN (\n    ''harassment'',\n    ''rickshaw'',\n    ''extortion'',\n    ''load_shedding''\n  ) THEN';
  v_new_guard text := E'IF v_segment NOT IN (\n    ''harassment'',\n    ''rickshaw'',\n    ''extortion'',\n    ''load_shedding'',\n    ''public_safety'',\n    ''road_transport'',\n    ''illegal_occupation''\n  ) THEN';
BEGIN
  SELECT pg_get_functiondef('public.submit_public_complaint(jsonb,text,jsonb)'::regprocedure)
  INTO v_definition;

  IF v_definition IS NULL THEN
    RAISE EXCEPTION 'submit_public_complaint(jsonb,text,jsonb) was not found.';
  END IF;

  IF position(v_old_guard IN v_definition) = 0 THEN
    -- Idempotent reruns are allowed when the expanded guard is already present.
    IF position(v_new_guard IN v_definition) > 0 THEN
      RETURN;
    END IF;

    RAISE EXCEPTION 'Submission segment guard has changed; refusing to patch an unexpected function body.';
  END IF;

  v_patched := replace(v_definition, v_old_guard, v_new_guard);

  IF v_patched = v_definition THEN
    RAISE EXCEPTION 'Submission segment guard patch produced no change.';
  END IF;

  EXECUTE v_patched;
END;
$migration$;

COMMENT ON FUNCTION public.submit_public_complaint(jsonb, text, jsonb)
IS 'Public complaint submission core. Phase 1 supports harassment, bribery/extortion, public safety, road/transport, utility, illegal occupation, and illegal auto-rickshaw charging.';
