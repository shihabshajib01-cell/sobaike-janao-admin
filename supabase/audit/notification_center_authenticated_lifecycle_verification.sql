-- Notification Center Authenticated Lifecycle Verification
-- Requires an elevated SQL session. Temporary rows are rolled back.

BEGIN;
SELECT set_config('app.notification_verification_run',gen_random_uuid()::text,true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',au.user_id::text,'role','authenticated')::text,true)
FROM public.admin_users au WHERE au.active=true ORDER BY au.is_super_admin DESC,au.created_at ASC LIMIT 1;
SELECT set_config('app.notification_verification_expected',(SELECT count(*)::text FROM public.admin_notification_event_catalogue WHERE active=true),true);
SELECT set_config('app.notification_verification_baseline',public.admin_get_unread_notification_count()::text,true);

DO $$
DECLARE v_event record; v_run text:=current_setting('app.notification_verification_run'); v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Verification could not establish an authenticated admin identity'; END IF;
  FOR v_event IN SELECT event_key FROM public.admin_notification_event_catalogue WHERE active=true ORDER BY event_key LOOP
    v_result:=public.admin_emit_notification(
      p_event_key:=v_event.event_key,p_title_en:='Notification verification '||v_event.event_key,p_title_bn:='বিজ্ঞপ্তি যাচাই '||v_event.event_key,
      p_body_en:='Transactional verification row. This transaction will be rolled back.',p_body_bn:='লেনদেনভিত্তিক যাচাই সারি। এই লেনদেনটি রোলব্যাক করা হবে।',
      p_actor_user_id:=auth.uid(),p_actor_display_name:='Notification Verification',p_target_type:=null,p_target_id:=null,p_target_label:='Verification',
      p_metadata:=jsonb_build_object('verification_run',v_run,'event_key',v_event.event_key),p_required_all_permissions:='{}'::text[],p_required_any_permissions:='{}'::text[],
      p_audience_mode:='personal',p_personal_recipient_id:=auth.uid(),p_route:='/notifications',p_dedupe_key:='notification-verification:'||v_run||':'||v_event.event_key,
      p_exclude_actor:=false,p_include_super_admin:=true
    );
    IF COALESCE((v_result->>'recipient_count')::integer,0)<>1 THEN RAISE EXCEPTION 'Verification emit failed for %: %',v_event.event_key,v_result; END IF;
  END LOOP;
END $$;

SET LOCAL ROLE authenticated;
DO $$
DECLARE
  v_run text:=current_setting('app.notification_verification_run');v_expected integer:=current_setting('app.notification_verification_expected')::integer;
  v_baseline bigint:=current_setting('app.notification_verification_baseline')::bigint;v_visible integer;v_count bigint;v_notification_id uuid;v_marked boolean;v_marked_all integer;
BEGIN
  SELECT count(*) INTO v_visible FROM public.admin_list_notifications(50,null,null,false,null) WHERE metadata->>'verification_run'=v_run;
  IF v_visible<>v_expected THEN RAISE EXCEPTION 'Expected % verification notifications, found %',v_expected,v_visible; END IF;
  SELECT public.admin_get_unread_notification_count() INTO v_count;
  IF v_count<>v_baseline+v_expected THEN RAISE EXCEPTION 'Unread count after emit mismatch: expected %, got %',v_baseline+v_expected,v_count; END IF;
  SELECT id INTO v_notification_id FROM public.admin_list_notifications(50,null,null,false,null) WHERE metadata->>'verification_run'=v_run ORDER BY created_at DESC,id DESC LIMIT 1;
  v_marked:=public.admin_mark_notification_read(v_notification_id); IF v_marked IS NOT TRUE THEN RAISE EXCEPTION 'Single notification mark-read verification failed'; END IF;
  SELECT public.admin_get_unread_notification_count() INTO v_count; IF v_count<>v_baseline+v_expected-1 THEN RAISE EXCEPTION 'Unread count after single mark-read mismatch'; END IF;
  v_marked_all:=public.admin_mark_all_notifications_read(); IF v_marked_all<>v_baseline+v_expected-1 THEN RAISE EXCEPTION 'Mark-all count mismatch'; END IF;
  SELECT public.admin_get_unread_notification_count() INTO v_count; IF v_count<>0 THEN RAISE EXCEPTION 'Unread count after mark-all should be 0, got %',v_count; END IF;
  RAISE NOTICE 'Authenticated notification lifecycle verification passed for % active event types.',v_expected;
END $$;
RESET ROLE;
ROLLBACK;
