BEGIN;

CREATE OR REPLACE FUNCTION public.admin_list_notifications(
  p_limit integer DEFAULT 20,
  p_before_created_at timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_before_id uuid DEFAULT NULL::uuid,
  p_unread_only boolean DEFAULT false,
  p_category text DEFAULT NULL::text
)
RETURNS TABLE(id uuid,event_group_id uuid,event_key text,category text,layer text,severity text,audience_mode text,actor_user_id uuid,actor_display_name text,target_type text,target_id text,target_label text,title_en text,title_bn text,body_en text,body_bn text,metadata jsonb,route text,created_at timestamp with time zone,read_at timestamp with time zone)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $function$
DECLARE v_caller_id UUID; v_safe_limit INTEGER;
BEGIN
  IF NOT public.is_active_admin() THEN RAISE EXCEPTION 'Active administrator required' USING ERRCODE='42501'; END IF;
  v_caller_id:=auth.uid(); IF v_caller_id IS NULL THEN RETURN; END IF;
  v_safe_limit:=LEAST(GREATEST(COALESCE(p_limit,20),1),50);
  RETURN QUERY
  SELECT n.id,n.event_group_id,n.event_key,n.category,n.layer,n.severity,n.audience_mode,n.actor_user_id,n.actor_display_name,n.target_type,n.target_id,n.target_label,n.title_en,n.title_bn,n.body_en,n.body_bn,n.metadata,n.route,n.created_at,n.read_at
  FROM public.admin_notifications n
  WHERE n.recipient_user_id=v_caller_id
    AND public.admin_notification_can_currently_view(n.recipient_user_id,n.audience_mode,n.required_all_permissions,n.required_any_permissions,n.target_type,n.target_id)
    AND (p_unread_only IS NOT TRUE OR n.read_at IS NULL)
    AND (
      p_category IS NULL
      OR (p_category='security' AND (n.severity='security' OR n.layer='security_privilege' OR n.event_key IN ('admin.role_changed','role.permissions_changed') OR n.category='security'))
      OR (p_category='configuration' AND n.event_key IN ('taxonomy.category_created','taxonomy.category_published','taxonomy.subcategory_created','taxonomy.subcategory_published','taxonomy.subcategory_moved','reporting_form.published','banner.published'))
      OR (p_category NOT IN ('security','configuration') AND n.category=p_category)
    )
    AND (p_before_created_at IS NULL OR (n.created_at,n.id)<(p_before_created_at,COALESCE(p_before_id,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)))
  ORDER BY n.created_at DESC,n.id DESC LIMIT v_safe_limit;
END;
$function$;

DO $$
DECLARE v_oid oid; v_def text;
BEGIN
  SELECT p.oid INTO v_oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='admin_finalize_user_membership'
    AND pg_get_function_identity_arguments(p.oid)='p_user_id uuid, p_display_name text, p_role_id text, p_active boolean' LIMIT 1;
  IF v_oid IS NULL THEN RAISE EXCEPTION 'admin_finalize_user_membership function not found'; END IF;
  v_def:=pg_get_functiondef(v_oid);
  IF position('p_route := ''/dashboard''' in v_def)>0 THEN
    v_def:=replace(v_def,'p_route := ''/dashboard''','p_route := ''/''');
    EXECUTE v_def;
  ELSIF position('p_route := ''/''' in v_def)=0 THEN
    RAISE EXCEPTION 'Expected welcome notification route was not found';
  END IF;
END $$;

UPDATE public.admin_notifications SET route='/'
WHERE event_key='admin.created' AND audience_mode='personal' AND route='/dashboard'
  AND dedupe_key LIKE 'admin.created:personal:%';

COMMIT;
