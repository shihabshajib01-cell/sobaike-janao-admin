create schema if not exists private;

create or replace function private.archive_reporting_forms_for_inactive_taxonomy()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_scope_type text;
begin
  if old.active is true and new.active is false then
    v_scope_type := case
      when tg_table_name = 'subcategories' then 'subcategory'
      when tg_table_name = 'segments' then 'segment'
      else null
    end;

    if v_scope_type is null then
      raise exception 'Unsupported taxonomy table for reporting-form lifecycle: %', tg_table_name;
    end if;

    update public.reporting_form_schemas
    set status = 'archived'
    where scope_type = v_scope_type
      and scope_id = old.id
      and status = 'published';
  end if;

  return new;
end;
$function$;

revoke all on function private.archive_reporting_forms_for_inactive_taxonomy()
from public, anon, authenticated;
grant execute on function private.archive_reporting_forms_for_inactive_taxonomy()
to service_role;

drop trigger if exists trg_archive_reporting_forms_on_subcategory_deactivate
  on public.subcategories;
create trigger trg_archive_reporting_forms_on_subcategory_deactivate
after update of active on public.subcategories
for each row
when (old.active is true and new.active is false)
execute function private.archive_reporting_forms_for_inactive_taxonomy();

drop trigger if exists trg_archive_reporting_forms_on_segment_deactivate
  on public.segments;
create trigger trg_archive_reporting_forms_on_segment_deactivate
after update of active on public.segments
for each row
when (old.active is true and new.active is false)
execute function private.archive_reporting_forms_for_inactive_taxonomy();

create or replace function private.guard_reporting_form_active_taxonomy()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_active boolean;
begin
  if new.status <> 'published' then
    return new;
  end if;

  if new.scope_type = 'subcategory' then
    select s.active
    into v_active
    from public.subcategories s
    where s.id = new.scope_id;
  elsif new.scope_type = 'segment' then
    select s.active
    into v_active
    from public.segments s
    where s.id = new.scope_id;
  else
    raise exception 'Unsupported reporting form scope type: %', new.scope_type
      using errcode = '23514';
  end if;

  if coalesce(v_active, false) is not true then
    raise exception 'Cannot publish reporting form for inactive or missing %: %',
      new.scope_type, new.scope_id
      using errcode = '23514';
  end if;

  return new;
end;
$function$;

revoke all on function private.guard_reporting_form_active_taxonomy()
from public, anon, authenticated;
grant execute on function private.guard_reporting_form_active_taxonomy()
to service_role;

drop trigger if exists trg_guard_reporting_form_active_taxonomy
  on public.reporting_form_schemas;
create trigger trg_guard_reporting_form_active_taxonomy
before insert or update of status, scope_type, scope_id
on public.reporting_form_schemas
for each row
when (new.status = 'published')
execute function private.guard_reporting_form_active_taxonomy();

update public.reporting_form_schemas r
set status = 'archived'
where r.status = 'published'
  and (
    (
      r.scope_type = 'subcategory'
      and not exists (
        select 1
        from public.subcategories s
        where s.id = r.scope_id
          and s.active is true
      )
    )
    or
    (
      r.scope_type = 'segment'
      and not exists (
        select 1
        from public.segments s
        where s.id = r.scope_id
          and s.active is true
      )
    )
  );

create or replace function public.get_platform_sync_contract_version()
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  select '2026-09-19.2'::text
$$;

revoke all on function public.get_platform_sync_contract_version() from public;
grant execute on function public.get_platform_sync_contract_version()
to anon, authenticated, service_role;
