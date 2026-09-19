-- Require an MFA-elevated AAL2 session for privileged admin control-plane actions.
create or replace function public.has_permission(p_permission_id text)
returns boolean
language plpgsql
stable
security definer
set search_path to 'pg_catalog','public'
as $function$
declare
    v_is_super_admin boolean;
    v_perm_exists boolean;
    v_requires_aal2 boolean;
begin
    if auth.uid() is null then
        return false;
    end if;

    v_requires_aal2 := p_permission_id = any(array[
        'admin_users.manage',
        'banners.manage',
        'categories.manage',
        'complaints.publish',
        'complaints.reject',
        'complaints.unpublish',
        'responses.publish',
        'responses.reject',
        'responses.resubmit',
        'responses.unpublish',
        'roles.manage'
    ]::text[]);

    if v_requires_aal2
       and coalesce(auth.jwt()->>'aal','aal1') <> 'aal2' then
        return false;
    end if;

    select coalesce(is_super_admin, false)
    into v_is_super_admin
    from public.admin_users
    where user_id = auth.uid()
      and active = true;

    if v_is_super_admin is true then
        select exists (
            select 1
            from public.permissions
            where id = p_permission_id
        )
        into v_perm_exists;

        return v_perm_exists;
    end if;

    return exists (
        select 1
        from public.admin_users au
        join public.user_roles ur
          on ur.user_id = au.user_id
        join public.roles r
          on r.id = ur.role_id
        join public.role_permissions rp
          on rp.role_id = r.id
        where au.user_id = auth.uid()
          and au.active = true
          and r.active = true
          and rp.permission_id = p_permission_id
    );
end;
$function$;

create or replace function public.can_manage_roles()
returns boolean
language plpgsql
stable
security definer
set search_path to 'pg_catalog','public'
as $function$
declare
    v_is_admin boolean;
    v_has_any_assignments boolean;
begin
    select exists (
        select 1
        from public.admin_users
        where user_id = auth.uid()
          and active = true
    )
    into v_is_admin;

    if not v_is_admin then
        return false;
    end if;

    if coalesce(auth.jwt()->>'aal','aal1') <> 'aal2' then
        return false;
    end if;

    select exists (
        select 1
        from public.user_roles
    )
    into v_has_any_assignments;

    if not v_has_any_assignments then
        return true;
    end if;

    return public.has_permission('roles.manage');
end;
$function$;
