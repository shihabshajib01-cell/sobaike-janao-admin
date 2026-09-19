-- Mandatory AAL2 enforcement for every administrative API session.
-- Apply only after the Admin MFA login/enrollment UI is deployed.

create schema if not exists private;

do $rename$
begin
  if to_regprocedure('public.has_permission_aal1_internal(text)') is null then
    alter function public.has_permission(text) rename to has_permission_aal1_internal;
  end if;
  if to_regprocedure('public.is_active_admin_aal1_internal()') is null then
    alter function public.is_active_admin() rename to is_active_admin_aal1_internal;
  end if;
  if to_regprocedure('public.get_caller_effective_permission_set_aal1_internal()') is null then
    alter function public.get_caller_effective_permission_set() rename to get_caller_effective_permission_set_aal1_internal;
  end if;
  if to_regprocedure('public.admin_get_my_authorization_context_aal1_internal()') is null then
    alter function public.admin_get_my_authorization_context() rename to admin_get_my_authorization_context_aal1_internal;
  end if;
  if to_regprocedure('public.can_manage_role_scope_aal1_internal(text)') is null then
    alter function public.can_manage_role_scope(text) rename to can_manage_role_scope_aal1_internal;
  end if;
end
$rename$;

revoke all on function public.has_permission_aal1_internal(text) from public, anon, authenticated;
revoke all on function public.is_active_admin_aal1_internal() from public, anon, authenticated;
revoke all on function public.get_caller_effective_permission_set_aal1_internal() from public, anon, authenticated;
revoke all on function public.admin_get_my_authorization_context_aal1_internal() from public, anon, authenticated;
revoke all on function public.can_manage_role_scope_aal1_internal(text) from public, anon, authenticated;

create or replace function private.current_admin_session_is_aal2()
returns boolean
language sql
stable
security definer
set search_path to 'pg_catalog'
as $function$
  select auth.uid() is not null
     and coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2';
$function$;
revoke all on function private.current_admin_session_is_aal2() from public, anon, authenticated;

create or replace function public.has_permission(p_permission_id text)
returns boolean
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
begin
  if not private.current_admin_session_is_aal2() then
    return false;
  end if;
  return public.has_permission_aal1_internal(p_permission_id);
end;
$function$;
revoke all on function public.has_permission(text) from public, anon;
grant execute on function public.has_permission(text) to authenticated;

create or replace function public.is_active_admin()
returns boolean
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
begin
  if not private.current_admin_session_is_aal2() then
    return false;
  end if;
  return public.is_active_admin_aal1_internal();
end;
$function$;
revoke all on function public.is_active_admin() from public, anon;
grant execute on function public.is_active_admin() to authenticated;

create or replace function public.get_caller_effective_permission_set()
returns setof text
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
begin
  if not private.current_admin_session_is_aal2() then
    return;
  end if;
  return query
    select *
    from public.get_caller_effective_permission_set_aal1_internal();
end;
$function$;
revoke all on function public.get_caller_effective_permission_set() from public, anon;
grant execute on function public.get_caller_effective_permission_set() to authenticated;

create or replace function public.admin_get_my_authorization_context()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
begin
  if not private.current_admin_session_is_aal2() then
    return jsonb_build_object(
      'is_admin', false,
      'is_super_admin', false,
      'is_bootstrap', false,
      'role', null,
      'permission_ids', '[]'::jsonb,
      'mfa_required', true
    );
  end if;
  return public.admin_get_my_authorization_context_aal1_internal();
end;
$function$;
revoke all on function public.admin_get_my_authorization_context() from public, anon;
grant execute on function public.admin_get_my_authorization_context() to authenticated;

create or replace function public.can_manage_role_scope(p_role_id text)
returns boolean
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
begin
  if not private.current_admin_session_is_aal2() then
    return false;
  end if;
  return public.can_manage_role_scope_aal1_internal(p_role_id);
end;
$function$;
revoke all on function public.can_manage_role_scope(text) from public, anon;
grant execute on function public.can_manage_role_scope(text) to authenticated;

create or replace function private.enforce_admin_mfa_request()
returns void
language plpgsql
security definer
set search_path to 'pg_catalog', 'private'
as $function$
declare
  v_path text := coalesce(current_setting('request.path', true), '');
  v_is_admin_rpc boolean;
begin
  if auth.uid() is null then
    return;
  end if;

  if coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2' then
    return;
  end if;

  v_is_admin_rpc :=
    v_path like 'rpc/admin\_%' escape '\'
    or v_path in (
      'rpc/has_permission',
      'rpc/is_active_admin',
      'rpc/get_caller_effective_permission_set',
      'rpc/can_manage_role_scope',
      'rpc/can_manage_user_target'
    );

  if v_is_admin_rpc then
    raise sqlstate 'PGRST' using
      message = jsonb_build_object(
        'code', 'MFA_REQUIRED',
        'message', 'Multi-factor authentication is required for administrative access.',
        'details', null,
        'hint', 'Complete the authenticator challenge and retry.'
      )::text,
      detail = jsonb_build_object(
        'status', 403,
        'headers', jsonb_build_object('Cache-Control', 'no-store')
      )::text;
  end if;
end;
$function$;

revoke all on function private.enforce_admin_mfa_request() from public, anon, authenticated;
grant usage on schema private to authenticator;
grant execute on function private.enforce_admin_mfa_request() to authenticator;

alter role authenticator set pgrst.db_pre_request = 'private.enforce_admin_mfa_request';
notify pgrst, 'reload config';
