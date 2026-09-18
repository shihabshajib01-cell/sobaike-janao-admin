BEGIN;

DO $$
DECLARE
  v_oid oid;
  v_def text;
  v_dashboard_route_count integer;
BEGIN
  SELECT p.oid
  INTO v_oid
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public'
    AND p.proname='admin_update_user'
    AND pg_get_function_identity_arguments(p.oid)='p_user_id uuid, p_display_name text, p_role_id text, p_active boolean'
  LIMIT 1;

  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'admin_update_user function not found';
  END IF;

  v_def:=pg_get_functiondef(v_oid);
  v_dashboard_route_count :=
    (length(v_def)-length(replace(v_def, 'p_route := ''/dashboard''', '')))
    / length('p_route := ''/dashboard''');

  IF v_dashboard_route_count <> 2 THEN
    RAISE EXCEPTION 'Expected exactly 2 personal /dashboard routes in admin_update_user, found %', v_dashboard_route_count;
  END IF;

  IF position('admin.activated:personal:' in v_def)=0
     OR position('admin.role_changed:personal:' in v_def)=0
  THEN
    RAISE EXCEPTION 'Expected personal activation/role-change notification producers were not found';
  END IF;

  v_def:=replace(v_def,'p_route := ''/dashboard''','p_route := ''/''');
  EXECUTE v_def;
END
$$;

UPDATE public.admin_notifications
SET route='/'
WHERE audience_mode='personal'
  AND event_key IN ('admin.activated','admin.role_changed')
  AND route='/dashboard';

DO $$
DECLARE
  v_def text;
BEGIN
  SELECT pg_get_functiondef(p.oid)
  INTO v_def
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public'
    AND p.proname='admin_update_user'
    AND pg_get_function_identity_arguments(p.oid)='p_user_id uuid, p_display_name text, p_role_id text, p_active boolean'
  LIMIT 1;

  IF v_def IS NULL
     OR position('p_route := ''/dashboard''' in v_def)>0
     OR position('admin.activated:personal:' in v_def)=0
     OR position('admin.role_changed:personal:' in v_def)=0
     OR position('p_route := ''/''' in v_def)=0
  THEN
    RAISE EXCEPTION 'Personal admin notification route hardening verification failed';
  END IF;
END
$$;

COMMIT;
