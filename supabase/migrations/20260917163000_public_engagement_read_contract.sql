-- Phase 1 popular-post engagement read/ranking contract.
-- Mirrors the shared production contract used by Public and Admin.

create or replace function public.get_public_report_engagement_counts()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'viewCount', c.public_view_count,
        'shareCount', c.public_share_count
      )
      order by c.created_at desc, c.id desc
    ),
    '[]'::jsonb
  )
  from public.complaints as c
  where c.status = 'published';
$$;

create or replace function public.get_public_published_report_with_engagement(p_report_id text)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with base as (
    select public.get_public_published_report(p_report_id) as payload
  )
  select case
    when base.payload is null or jsonb_typeof(base.payload) <> 'object' then base.payload
    else base.payload || jsonb_build_object(
      'viewCount', coalesce(c.public_view_count, 0),
      'shareCount', coalesce(c.public_share_count, 0)
    )
  end
  from base
  left join public.complaints c
    on c.id = base.payload ->> 'id'
   and c.status = 'published';
$$;

create or replace function public.get_public_published_reports_with_engagement()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with base as (
    select public.get_public_published_reports() as payload
  ),
  items as (
    select x.item, x.ordinality
    from base
    cross join lateral jsonb_array_elements(coalesce(base.payload, '[]'::jsonb))
      with ordinality as x(item, ordinality)
  )
  select coalesce(
    jsonb_agg(
      items.item || jsonb_build_object(
        'viewCount', coalesce(c.public_view_count, 0),
        'shareCount', coalesce(c.public_share_count, 0)
      )
      order by items.ordinality
    ),
    '[]'::jsonb
  )
  from items
  left join public.complaints c
    on c.id = items.item ->> 'id'
   and c.status = 'published';
$$;

create or replace function public.get_public_home_feed_with_engagement(
  p_visitor_lat double precision default null,
  p_visitor_lng double precision default null,
  p_filter text default 'all',
  p_district text default 'all'
)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with params as (
    select case
      when lower(coalesce(nullif(btrim(p_filter), ''), 'all')) in ('popular', 'most_shared')
        then lower(coalesce(nullif(btrim(p_filter), ''), 'all'))
      when lower(coalesce(nullif(btrim(p_filter), ''), 'all')) = 'latest'
        then 'latest'
      else 'all'
    end as requested_filter
  ),
  base as (
    select public.get_public_home_feed(
      p_visitor_lat,
      p_visitor_lng,
      case when params.requested_filter in ('popular', 'most_shared') then 'all' else params.requested_filter end,
      p_district
    ) as payload,
    params.requested_filter
    from params
  ),
  items as (
    select
      x.item,
      x.ordinality,
      base.requested_filter,
      coalesce(c.public_view_count, 0) as view_count,
      coalesce(c.public_share_count, 0) as share_count
    from base
    cross join lateral jsonb_array_elements(coalesce(base.payload, '[]'::jsonb))
      with ordinality as x(item, ordinality)
    left join public.complaints c
      on c.id = x.item ->> 'id'
     and c.status = 'published'
  )
  select coalesce(
    jsonb_agg(
      items.item || jsonb_build_object(
        'viewCount', items.view_count,
        'shareCount', items.share_count
      )
      order by
        case when items.requested_filter = 'popular' then items.view_count end desc nulls last,
        case when items.requested_filter = 'popular' then items.share_count end desc nulls last,
        case when items.requested_filter = 'most_shared' then items.share_count end desc nulls last,
        case when items.requested_filter = 'most_shared' then items.view_count end desc nulls last,
        items.ordinality
    ),
    '[]'::jsonb
  )
  from items;
$$;

revoke all on function public.get_public_report_engagement_counts() from public;
revoke all on function public.get_public_published_report_with_engagement(text) from public;
revoke all on function public.get_public_published_reports_with_engagement() from public;
revoke all on function public.get_public_home_feed_with_engagement(double precision, double precision, text, text) from public;

grant execute on function public.get_public_report_engagement_counts() to anon, authenticated;
grant execute on function public.get_public_published_report_with_engagement(text) to anon, authenticated;
grant execute on function public.get_public_published_reports_with_engagement() to anon, authenticated;
grant execute on function public.get_public_home_feed_with_engagement(double precision, double precision, text, text) to anon, authenticated;
