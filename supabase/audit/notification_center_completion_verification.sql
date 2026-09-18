-- Notification Center Completion Verification
-- Read-only checks. Fails loudly when a required production invariant is missing.

DO $$
DECLARE
  v_missing integer;
  v_def text;
BEGIN
  SELECT count(*) INTO v_missing
  FROM (
    VALUES
      ('complaint.submitted'),
      ('taxonomy.category_created'),
      ('taxonomy.category_published'),
      ('taxonomy.subcategory_created'),
      ('taxonomy.subcategory_published'),
      ('taxonomy.subcategory_moved'),
      ('reporting_form.published'),
      ('banner.published')
  ) expected(event_key)
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.admin_notification_event_catalogue c
    WHERE c.event_key = expected.event_key
      AND c.active = true
  );

  IF v_missing <> 0 THEN
    RAISE EXCEPTION 'Notification catalogue verification failed: % required events missing', v_missing;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_admin_notify_complaint_submitted'
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'complaint.submitted notification trigger is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'admin_notifications'
  ) THEN
    RAISE EXCEPTION 'admin_notifications is not enabled for Supabase Realtime';
  END IF;

  SELECT pg_get_functiondef(p.oid)
  INTO v_def
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'admin_list_notifications'
    AND p.prokind = 'f'
  LIMIT 1;

  IF v_def IS NULL
     OR v_def NOT ILIKE '%p_category = ''security''%'
     OR v_def NOT ILIKE '%security_privilege%'
  THEN
    RAISE EXCEPTION 'Server-side Security notification filter is missing';
  END IF;

  IF has_function_privilege(
    'anon',
    'public.admin_list_notifications(integer,timestamp with time zone,uuid,boolean,text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Anonymous role can execute admin_list_notifications';
  END IF;

  IF has_function_privilege(
    'authenticated',
    'public.admin_emit_notification(text,text,text,text,text,uuid,text,text,text,text,jsonb,text[],text[],text,uuid,text,text,boolean,boolean)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Authenticated client can execute internal admin_emit_notification';
  END IF;

  IF NOT has_table_privilege('authenticated', 'public.admin_notifications', 'SELECT') THEN
    RAISE EXCEPTION 'Authenticated role lacks notification SELECT required for Realtime RLS';
  END IF;

  IF has_table_privilege('anon', 'public.admin_notifications', 'SELECT') THEN
    RAISE EXCEPTION 'Anonymous role can SELECT admin notifications';
  END IF;

  RAISE NOTICE 'Notification center completion verification passed.';
END;
$$;
