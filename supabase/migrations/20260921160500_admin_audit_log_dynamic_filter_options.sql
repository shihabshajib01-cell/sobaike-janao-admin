create or replace function public.admin_get_audit_log_filter_options()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actions jsonb;
  v_target_types jsonb;
begin
  if not public.is_active_admin()
     or not public.has_permission('audit.view') then
    raise exception 'Access denied. Audit log view authorization required.'
      using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(action order by action), '[]'::jsonb)
  into v_actions
  from (
    select distinct a.action
    from public.admin_audit_logs a
    where nullif(btrim(a.action), '') is not null
  ) actions;

  select coalesce(jsonb_agg(target_type order by target_type), '[]'::jsonb)
  into v_target_types
  from (
    select distinct
      case
        when lower(btrim(a.target_type)) = 'complaint' then 'complaint'
        when lower(btrim(a.target_type)) in ('user', 'admin_user') then 'admin_user'
        when lower(btrim(a.target_type)) = 'role' then 'role'
        else lower(btrim(a.target_type))
      end as target_type
    from public.admin_audit_logs a
    where nullif(btrim(a.target_type), '') is not null
  ) targets;

  return jsonb_build_object(
    'actions', v_actions,
    'target_types', v_target_types
  );
end;
$function$;

revoke all on function public.admin_get_audit_log_filter_options() from public, anon;
grant execute on function public.admin_get_audit_log_filter_options() to authenticated;
