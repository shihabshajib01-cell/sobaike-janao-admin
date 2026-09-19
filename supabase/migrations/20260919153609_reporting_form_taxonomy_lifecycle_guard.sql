-- Keep published reporting-form schemas aligned with active taxonomy.
-- Invariant:
--   1. A published form may target only an active segment/subcategory.
--   2. Deactivating taxonomy automatically archives affected published forms.

create or replace function private.enforce_reporting_form_active_taxonomy()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $function$
declare
  v_active boolean := false;
begin
  if new.status <> 'published' then
    return new;
  end if;

  if new.scope_type = 'subcategory' then
    select (sc.active and s.active)
      into v_active
    from public.subcategories sc
    join public.segments s on s.id = sc.segment_id
    where sc.id = new.scope_id;

    if coalesce(v_active, false) is not true then
      raise exception 'PUBLISHED_FORM_REQUIRES_ACTIVE_SUBCATEGORY'
        using errcode = '23514';
    end if;
  elsif new.scope_type = 'segment' then
    select s.active
      into v_active
    from public.segments s
    where s.id = new.scope_id;

    if coalesce(v_active, false) is not true then
      raise exception 'PUBLISHED_FORM_REQUIRES_ACTIVE_SEGMENT'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$function$;

create or replace function private.archive_reporting_forms_for_inactive_taxonomy()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $function$
begin
  if old.active is true and new.active is false then
    if tg_table_name = 'subcategories' then
      update public.reporting_form_schemas
      set status = 'archived',
          updated_at = now()
      where status = 'published'
        and scope_type = 'subcategory'
        and scope_id = new.id;
    elsif tg_table_name = 'segments' then
      update public.reporting_form_schemas r
      set status = 'archived',
          updated_at = now()
      where r.status = 'published'
        and (
          (r.scope_type = 'segment' and r.scope_id = new.id)
          or (
            r.scope_type = 'subcategory'
            and exists (
              select 1
              from public.subcategories sc
              where sc.id = r.scope_id
                and sc.segment_id = new.id
            )
          )
        );
    end if;
  end if;

  return new;
end;
$function$;

revoke execute on function private.enforce_reporting_form_active_taxonomy()
from public, anon, authenticated;
revoke execute on function private.archive_reporting_forms_for_inactive_taxonomy()
from public, anon, authenticated;

drop trigger if exists trg_enforce_reporting_form_active_taxonomy
  on public.reporting_form_schemas;
create trigger trg_enforce_reporting_form_active_taxonomy
before insert or update of status, scope_type, scope_id
on public.reporting_form_schemas
for each row
execute function private.enforce_reporting_form_active_taxonomy();

drop trigger if exists trg_archive_forms_on_subcategory_deactivate
  on public.subcategories;
create trigger trg_archive_forms_on_subcategory_deactivate
after update of active
on public.subcategories
for each row
when (old.active is distinct from new.active and new.active is false)
execute function private.archive_reporting_forms_for_inactive_taxonomy();

drop trigger if exists trg_archive_forms_on_segment_deactivate
  on public.segments;
create trigger trg_archive_forms_on_segment_deactivate
after update of active
on public.segments
for each row
when (old.active is distinct from new.active and new.active is false)
execute function private.archive_reporting_forms_for_inactive_taxonomy();

update public.reporting_form_schemas r
set status = 'archived',
    updated_at = now()
where r.status = 'published'
  and (
    (
      r.scope_type = 'subcategory'
      and not exists (
        select 1
        from public.subcategories sc
        join public.segments s on s.id = sc.segment_id
        where sc.id = r.scope_id
          and sc.active
          and s.active
      )
    )
    or (
      r.scope_type = 'segment'
      and not exists (
        select 1
        from public.segments s
        where s.id = r.scope_id
          and s.active
      )
    )
  );
