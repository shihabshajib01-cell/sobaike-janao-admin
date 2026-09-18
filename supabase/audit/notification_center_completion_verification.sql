-- Notification Center Final Completion Verification
-- Read-only production checks. Fails loudly when a required invariant is missing.

DO $$
DECLARE
  v_missing integer;
  v_def text;
  v_compact text;
  v_user_update_def text;
BEGIN
  WITH expected(event_key) AS (
    VALUES
      ('complaint.submitted'), ('complaint.evidence_attached'), ('complaint.published'),
      ('complaint.unpublished'), ('complaint.rejected'), ('admin.created'), ('admin.activated'),
      ('admin.deactivated'), ('admin.role_changed'), ('role.created'), ('role.updated'),
      ('role.permissions_changed'), ('taxonomy.category_created'), ('taxonomy.category_published'),
      ('taxonomy.subcategory_created'), ('taxonomy.subcategory_published'),
      ('taxonomy.subcategory_moved'), ('reporting_form.published'), ('banner.published')
  )
  SELECT count(*) INTO v_missing FROM expected e
  WHERE NOT EXISTS (SELECT 1 FROM public.admin_notification_event_catalogue c WHERE c.event_key=e.event_key AND c.active=true);
  IF v_missing<>0 THEN RAISE EXCEPTION 'Notification catalogue verification failed: % active events missing',v_missing; END IF;

  WITH expected(event_key) AS (
    VALUES
      ('complaint.submitted'), ('complaint.evidence_attached'), ('complaint.published'),
      ('complaint.unpublished'), ('complaint.rejected'), ('admin.created'), ('admin.activated'),
      ('admin.deactivated'), ('admin.role_changed'), ('role.created'), ('role.updated'),
      ('role.permissions_changed'), ('taxonomy.category_created'), ('taxonomy.category_published'),
      ('taxonomy.subcategory_created'), ('taxonomy.subcategory_published'),
      ('taxonomy.subcategory_moved'), ('reporting_form.published'), ('banner.published')
  )
  SELECT count(*) INTO v_missing FROM expected e
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prokind='f' AND strpos(pg_get_functiondef(p.oid),quote_literal(e.event_key))>0
  );
  IF v_missing<>0 THEN RAISE EXCEPTION 'Notification producer verification failed: % events have no producer reference',v_missing; END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='admin_notifications') THEN
    RAISE EXCEPTION 'admin_notifications is not enabled for Supabase Realtime';
  END IF;

  SELECT pg_get_functiondef(p.oid) INTO v_def
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='admin_list_notifications'
    AND pg_get_function_identity_arguments(p.oid)='p_limit integer, p_before_created_at timestamp with time zone, p_before_id uuid, p_unread_only boolean, p_category text'
  LIMIT 1;
  v_compact := regexp_replace(COALESCE(v_def, ''), '\\s+', '', 'g');
  IF v_def IS NULL
     OR v_compact NOT ILIKE '%p_category=''security''%'
     OR v_compact NOT ILIKE '%p_category=''configuration''%'
     OR v_compact NOT ILIKE '%p_category=''administration''%'
     OR v_compact NOT ILIKE '%security_privilege%'
  THEN
    RAISE EXCEPTION 'Server-side notification filter contract is incomplete';
  END IF;

  IF has_function_privilege('anon','public.admin_list_notifications(integer,timestamp with time zone,uuid,boolean,text)','EXECUTE') THEN RAISE EXCEPTION 'Anonymous role can execute admin_list_notifications'; END IF;
  IF NOT has_function_privilege('authenticated','public.admin_list_notifications(integer,timestamp with time zone,uuid,boolean,text)','EXECUTE') THEN RAISE EXCEPTION 'Authenticated admins cannot execute admin_list_notifications'; END IF;
  IF has_function_privilege('authenticated','public.admin_emit_notification(text,text,text,text,text,uuid,text,text,text,text,jsonb,text[],text[],text,uuid,text,text,boolean,boolean)','EXECUTE') THEN RAISE EXCEPTION 'Authenticated client can execute internal admin_emit_notification'; END IF;
  IF NOT has_table_privilege('authenticated','public.admin_notifications','SELECT') THEN RAISE EXCEPTION 'Authenticated role lacks notification SELECT required for Realtime RLS'; END IF;
  IF has_table_privilege('anon','public.admin_notifications','SELECT') THEN RAISE EXCEPTION 'Anonymous role can SELECT admin notifications'; END IF;

  IF EXISTS (SELECT 1 FROM public.admin_notifications GROUP BY recipient_user_id,dedupe_key HAVING dedupe_key IS NOT NULL AND count(*)>1) THEN RAISE EXCEPTION 'Duplicate notification dedupe groups exist'; END IF;
  IF EXISTS (SELECT 1 FROM public.admin_notifications WHERE route IS NOT NULL AND route !~ '^/(|dashboard|complaints(/[^/]+)?|responses|categories|banners|map|location-activity|roles(/[^/]+(/edit)?)?|users(/[^/]+(/edit)?)?|notifications|activity-log)/?$') THEN RAISE EXCEPTION 'Unsafe or unknown notification route exists'; END IF;
  IF EXISTS (SELECT 1 FROM public.admin_notifications WHERE event_key='admin.created' AND audience_mode='personal' AND route='/dashboard') THEN RAISE EXCEPTION 'Stale personal welcome notification still targets /dashboard'; END IF;
  IF EXISTS (SELECT 1 FROM public.admin_notifications WHERE event_key IN ('admin.activated','admin.role_changed') AND audience_mode='personal' AND route='/dashboard') THEN RAISE EXCEPTION 'Personal admin account notification still targets /dashboard'; END IF;

  SELECT pg_get_functiondef(p.oid) INTO v_user_update_def
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='admin_update_user'
    AND pg_get_function_identity_arguments(p.oid)='p_user_id uuid, p_display_name text, p_role_id text, p_active boolean'
  LIMIT 1;
  IF v_user_update_def IS NULL
     OR position('admin.activated:personal:' in v_user_update_def)=0
     OR position('admin.role_changed:personal:' in v_user_update_def)=0
     OR position('p_route := ''/dashboard''' in v_user_update_def)>0
  THEN
    RAISE EXCEPTION 'Personal admin producer route contract is not permission-safe';
  END IF;

  RAISE NOTICE 'Notification center final completion verification passed.';
END;
$$;
