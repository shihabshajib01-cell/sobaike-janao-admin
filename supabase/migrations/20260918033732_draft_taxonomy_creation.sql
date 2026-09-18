-- Draft-only taxonomy creation.
-- New categories/subcategories remain inactive and cannot affect Public until a later publish phase.

begin;

create or replace function public.admin_create_taxonomy_item(
  p_item_type text,
  p_item_id text,
  p_parent_segment_id text,
  p_name_en text,
  p_name_bn text,
  p_sort_order integer
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_item_type text := lower(nullif(btrim(p_item_type), ''));
  v_item_id text := lower(nullif(btrim(p_item_id), ''));
  v_parent_segment_id text := nullif(btrim(p_parent_segment_id), '');
  v_name_en text := nullif(btrim(p_name_en), '');
  v_name_bn text := nullif(btrim(p_name_bn), '');
  v_slug text;
  v_created jsonb;
  v_schema_id uuid;
begin
  if not public.is_active_admin() then
    raise exception 'Access denied. Active administrative session required.'
      using errcode = '42501';
  end if;

  if not public.has_permission('categories.manage') then
    raise exception 'Access denied. Missing categories.manage permission.'
      using errcode = '42501';
  end if;

  if v_item_type not in ('segment','subcategory') then
    raise exception 'Invalid taxonomy item type.' using errcode = '22023';
  end if;

  if v_item_id is null or v_item_id !~ '^[a-z0-9]+(?:_[a-z0-9]+)*$' then
    raise exception 'ID must use lowercase letters, numbers, and underscores only.'
      using errcode = '22023';
  end if;

  if v_name_en is null or v_name_bn is null then
    raise exception 'Both English and Bangla names are required.'
      using errcode = '22023';
  end if;

  if p_sort_order is null or p_sort_order < 1 or p_sort_order > 999 then
    raise exception 'Sort order must be an integer from 1 to 999.'
      using errcode = '22023';
  end if;

  if v_item_type = 'segment' then
    if exists (select 1 from public.segments where id = v_item_id) then
      raise exception 'Segment already exists: %', v_item_id using errcode = '23505';
    end if;

    v_slug := replace(v_item_id, '_', '-');

    if exists (select 1 from public.segments where slug = v_slug) then
      raise exception 'Category slug already exists: %', v_slug using errcode = '23505';
    end if;

    insert into public.segments (
      id,
      name_en,
      name_bn,
      short_name_en,
      short_name_bn,
      description_en,
      description_bn,
      slug,
      icon_key,
      theme_key,
      active,
      sort_order,
      config_status
    )
    values (
      v_item_id,
      v_name_en,
      v_name_bn,
      v_name_en,
      v_name_bn,
      '',
      '',
      v_slug,
      'generic',
      'neutral',
      false,
      p_sort_order,
      'draft'
    );

    v_created := jsonb_build_object(
      'id', v_item_id,
      'item_type', 'segment',
      'name_en', v_name_en,
      'name_bn', v_name_bn,
      'slug', v_slug,
      'active', false,
      'sort_order', p_sort_order,
      'config_status', 'draft'
    );
  else
    if v_parent_segment_id is null then
      raise exception 'Parent segment is required for a subcategory.'
        using errcode = '22023';
    end if;

    if not exists (
      select 1
      from public.segments
      where id = v_parent_segment_id
        and config_status <> 'archived'
    ) then
      raise exception 'Parent segment not found or archived: %', v_parent_segment_id
        using errcode = 'P0002';
    end if;

    if exists (select 1 from public.subcategories where id = v_item_id) then
      raise exception 'Subcategory already exists: %', v_item_id using errcode = '23505';
    end if;

    insert into public.subcategories (
      id,
      segment_id,
      name_en,
      name_bn,
      description_en,
      description_bn,
      is_sensitive,
      active,
      sort_order,
      config_status
    )
    values (
      v_item_id,
      v_parent_segment_id,
      v_name_en,
      v_name_bn,
      '',
      '',
      false,
      false,
      p_sort_order,
      'draft'
    );

    insert into public.reporting_form_schemas (
      scope_type,
      scope_id,
      version,
      status,
      engine_mode,
      notes,
      created_by
    )
    values (
      'subcategory',
      v_item_id,
      1,
      'draft',
      'schema',
      'Initial Admin-created form schema draft. Not visible to Public.',
      auth.uid()
    )
    returning id into v_schema_id;

    v_created := jsonb_build_object(
      'id', v_item_id,
      'item_type', 'subcategory',
      'segment_id', v_parent_segment_id,
      'name_en', v_name_en,
      'name_bn', v_name_bn,
      'active', false,
      'sort_order', p_sort_order,
      'config_status', 'draft',
      'form_schema_id', v_schema_id,
      'form_schema_version', 1
    );
  end if;

  insert into public.admin_audit_logs (
    actor_id,
    action,
    target_type,
    target_id,
    details
  )
  values (
    auth.uid(),
    'taxonomy.draft_create',
    v_item_type,
    v_item_id,
    jsonb_build_object(
      'item', v_created,
      'timestamp', clock_timestamp()
    )
  );

  return jsonb_build_object(
    'success', true,
    'item', v_created
  );
end;
$$;

revoke all on function public.admin_create_taxonomy_item(text,text,text,text,text,integer)
  from public, anon;
grant execute on function public.admin_create_taxonomy_item(text,text,text,text,text,integer)
  to authenticated;

-- Preserve the current edit contract, but block accidental activation of draft/ready/archived items.
create or replace function public.admin_update_taxonomy_item(
  p_item_type text,
  p_item_id text,
  p_name_en text,
  p_name_bn text,
  p_active boolean,
  p_sort_order integer
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_item_type text;
  v_item_id text;
  v_name_en text;
  v_name_bn text;
  v_config_status text;
  v_before jsonb;
  v_after jsonb;
begin
  if not public.is_active_admin() then
    raise exception 'Access denied. Active administrative session required.'
      using errcode = '42501';
  end if;

  if not public.has_permission('categories.manage') then
    raise exception 'Access denied. Missing categories.manage permission.'
      using errcode = '42501';
  end if;

  v_item_type := lower(nullif(btrim(p_item_type), ''));
  v_item_id := nullif(btrim(p_item_id), '');
  v_name_en := nullif(btrim(p_name_en), '');
  v_name_bn := nullif(btrim(p_name_bn), '');

  if v_item_type not in ('segment', 'subcategory') then
    raise exception 'Invalid taxonomy item type.' using errcode = '22023';
  end if;

  if v_item_id is null then
    raise exception 'Taxonomy item ID is required.' using errcode = '22023';
  end if;

  if v_name_en is null or v_name_bn is null then
    raise exception 'Both English and Bangla names are required.' using errcode = '22023';
  end if;

  if p_active is null or p_sort_order is null then
    raise exception 'Active state and sort order are required.' using errcode = '22023';
  end if;

  if p_sort_order < 1 or p_sort_order > 999 then
    raise exception 'Sort order must be from 1 to 999.' using errcode = '22023';
  end if;

  if v_item_type = 'segment' then
    select
      s.config_status,
      jsonb_build_object(
        'id', s.id,
        'name_en', s.name_en,
        'name_bn', s.name_bn,
        'active', s.active,
        'sort_order', s.sort_order,
        'config_status', s.config_status
      )
    into v_config_status, v_before
    from public.segments s
    where s.id = v_item_id
    for update;

    if v_before is null then
      raise exception 'Segment not found: %', v_item_id using errcode = 'P0002';
    end if;

    if v_config_status <> 'published' and p_active then
      raise exception 'Only published categories can be activated.'
        using errcode = '22023';
    end if;

    update public.segments
    set
      name_en = v_name_en,
      name_bn = v_name_bn,
      active = case when config_status = 'published' then p_active else false end,
      sort_order = p_sort_order
    where id = v_item_id;

    select jsonb_build_object(
      'id', s.id,
      'name_en', s.name_en,
      'name_bn', s.name_bn,
      'active', s.active,
      'sort_order', s.sort_order,
      'config_status', s.config_status
    )
    into v_after
    from public.segments s
    where s.id = v_item_id;
  else
    select
      sc.config_status,
      jsonb_build_object(
        'id', sc.id,
        'segment_id', sc.segment_id,
        'name_en', sc.name_en,
        'name_bn', sc.name_bn,
        'active', sc.active,
        'sort_order', sc.sort_order,
        'config_status', sc.config_status
      )
    into v_config_status, v_before
    from public.subcategories sc
    where sc.id = v_item_id
    for update;

    if v_before is null then
      raise exception 'Subcategory not found: %', v_item_id using errcode = 'P0002';
    end if;

    if v_config_status <> 'published' and p_active then
      raise exception 'Only published subcategories can be activated.'
        using errcode = '22023';
    end if;

    update public.subcategories
    set
      name_en = v_name_en,
      name_bn = v_name_bn,
      active = case when config_status = 'published' then p_active else false end,
      sort_order = p_sort_order
    where id = v_item_id;

    select jsonb_build_object(
      'id', sc.id,
      'segment_id', sc.segment_id,
      'name_en', sc.name_en,
      'name_bn', sc.name_bn,
      'active', sc.active,
      'sort_order', sc.sort_order,
      'config_status', sc.config_status
    )
    into v_after
    from public.subcategories sc
    where sc.id = v_item_id;
  end if;

  insert into public.admin_audit_logs (
    actor_id,
    action,
    target_type,
    target_id,
    details
  )
  values (
    auth.uid(),
    'taxonomy.update',
    v_item_type,
    v_item_id,
    jsonb_build_object(
      'before', v_before,
      'after', v_after,
      'timestamp', clock_timestamp()
    )
  );

  return jsonb_build_object(
    'success', true,
    'item_type', v_item_type,
    'item', v_after
  );
end;
$$;

revoke all on function public.admin_update_taxonomy_item(text,text,text,text,boolean,integer)
  from public, anon;
grant execute on function public.admin_update_taxonomy_item(text,text,text,text,boolean,integer)
  to authenticated;

commit;
