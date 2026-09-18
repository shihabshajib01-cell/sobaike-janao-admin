-- Narrow taxonomy read contract for admins who can publish complaints.
-- Production migration: 20260918162008_news_intake_taxonomy_contract

CREATE OR REPLACE FUNCTION public.admin_get_news_intake_taxonomy()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_segments jsonb;
  v_subcategories jsonb;
begin
  if not public.is_active_admin() or not public.has_permission('complaints.publish') then
    raise exception 'Access denied.' using errcode='42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',s.id,
    'nameEn',s.name_en,
    'nameBn',s.name_bn,
    'order',s.sort_order
  ) order by s.sort_order,s.id),'[]'::jsonb)
  into v_segments
  from public.segments s
  where s.active=true and s.config_status='published';

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',sc.id,
    'segmentId',sc.segment_id,
    'nameEn',sc.name_en,
    'nameBn',sc.name_bn,
    'order',sc.sort_order,
    'isSensitive',coalesce(sc.is_sensitive,false)
  ) order by sc.segment_id,sc.sort_order,sc.id),'[]'::jsonb)
  into v_subcategories
  from public.subcategories sc
  join public.segments s on s.id=sc.segment_id
  where sc.active=true and sc.config_status='published'
    and s.active=true and s.config_status='published';

  return jsonb_build_object(
    'segments',v_segments,
    'subcategories',v_subcategories
  );
end;
$function$

revoke all on function public.admin_get_news_intake_taxonomy() from public,anon;
grant execute on function public.admin_get_news_intake_taxonomy() to authenticated;
