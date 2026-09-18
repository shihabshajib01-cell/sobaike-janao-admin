-- Atomic Admin taxonomy updates.
-- Re-parenting + metadata + activation now succeed or roll back together.

begin;

create or replace function public.admin_update_taxonomy_full(
  p_item_type text,
  p_item_id text,
  p_parent_segment_id text,
  p_name_en text,
  p_name_bn text,
  p_active boolean,
  p_sort_order integer,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_type text := lower(nullif(btrim(p_item_type),''));
  v_id text := nullif(btrim(p_item_id),'');
  v_parent text := nullif(btrim(p_parent_segment_id),'');
  v_current_parent text;
  v_config_status text;
  v_effective_active boolean := false;
begin
  if not public.is_active_admin() or not public.has_permission('categories.manage') then
    raise exception 'Access denied.' using errcode='42501';
  end if;

  if v_type not in ('segment','subcategory') or v_id is null then
    raise exception 'Invalid taxonomy update request.' using errcode='22023';
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Taxonomy configuration payload must be an object.' using errcode='22023';
  end if;

  if v_type='subcategory' then
    select segment_id,config_status
      into v_current_parent,v_config_status
    from public.subcategories
    where id=v_id
    for update;

    if v_current_parent is null then
      raise exception 'Subcategory not found: %',v_id using errcode='P0002';
    end if;

    if v_parent is not null and v_parent <> v_current_parent then
      perform public.admin_move_subcategory(v_id,v_parent,p_sort_order);
    end if;
  else
    select config_status
      into v_config_status
    from public.segments
    where id=v_id
    for update;

    if v_config_status is null then
      raise exception 'Category not found: %',v_id using errcode='P0002';
    end if;
  end if;

  perform public.admin_update_taxonomy_configuration(v_type,v_id,p_payload);

  if v_type='segment' then
    select config_status into v_config_status
    from public.segments where id=v_id;
  else
    select config_status into v_config_status
    from public.subcategories where id=v_id;
  end if;

  v_effective_active := coalesce(p_active,false) and v_config_status='published';

  perform public.admin_update_taxonomy_item(
    v_type,
    v_id,
    p_name_en,
    p_name_bn,
    v_effective_active,
    p_sort_order
  );

  return jsonb_build_object(
    'success',true,
    'itemType',v_type,
    'id',v_id,
    'active',v_effective_active,
    'configStatus',v_config_status,
    'parentSegmentId',
      case
        when v_type='subcategory' then
          (select segment_id from public.subcategories where id=v_id)
        else null
      end
  );
end;
$$;

revoke all on function public.admin_update_taxonomy_full(text,text,text,text,text,boolean,integer,jsonb)
from public, anon;

grant execute on function public.admin_update_taxonomy_full(text,text,text,text,text,boolean,integer,jsonb)
to authenticated;

commit;
