alter table public.complaints
  add column public_view_count bigint not null default 0 check (public_view_count >= 0),
  add column public_share_count bigint not null default 0 check (public_share_count >= 0);

comment on column public.complaints.public_view_count is
  'Phase 1 public engagement counter. Incremented once per successful public report-detail open.';
comment on column public.complaints.public_share_count is
  'Phase 1 public engagement counter. Incremented after a successful public share/copy action.';

create or replace function public.track_public_report_view(p_report_id text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_view_count bigint;
  v_share_count bigint;
begin
  update public.complaints as c
  set public_view_count = c.public_view_count + 1
  where upper(c.id) = upper(nullif(btrim(p_report_id), ''))
    and c.status = 'published'
  returning c.public_view_count, c.public_share_count into v_view_count, v_share_count;

  if not found then return null; end if;
  return jsonb_build_object('viewCount', v_view_count, 'shareCount', v_share_count);
end;
$$;

create or replace function public.track_public_report_share(p_report_id text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_view_count bigint;
  v_share_count bigint;
begin
  update public.complaints as c
  set public_share_count = c.public_share_count + 1
  where upper(c.id) = upper(nullif(btrim(p_report_id), ''))
    and c.status = 'published'
  returning c.public_view_count, c.public_share_count into v_view_count, v_share_count;

  if not found then return null; end if;
  return jsonb_build_object('viewCount', v_view_count, 'shareCount', v_share_count);
end;
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
  ), items as (
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
      ) order by items.ordinality
    ), '[]'::jsonb
  )
  from items
  left join public.complaints c
    on c.id = items.item ->> 'id' and c.status = 'published';
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
    on c.id = base.payload ->> 'id' and c.status = 'published';
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
      when lower(coalesce(nullif(btrim(p_filter), ''), 'all')) = 'latest' then 'latest'
      else 'all'
    end as requested_filter
  ), base as (
    select public.get_public_home_feed(
      p_visitor_lat,
      p_visitor_lng,
      case when params.requested_filter in ('popular', 'most_shared') then 'all' else params.requested_filter end,
      p_district
    ) as payload, params.requested_filter
    from params
  ), items as (
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
      on c.id = x.item ->> 'id' and c.status = 'published'
  )
  select coalesce(
    jsonb_agg(
      items.item || jsonb_build_object('viewCount', items.view_count, 'shareCount', items.share_count)
      order by
        case when items.requested_filter = 'popular' then items.view_count end desc nulls last,
        case when items.requested_filter = 'popular' then items.share_count end desc nulls last,
        case when items.requested_filter = 'most_shared' then items.share_count end desc nulls last,
        case when items.requested_filter = 'most_shared' then items.view_count end desc nulls last,
        items.ordinality
    ), '[]'::jsonb
  )
  from items;
$$;

revoke all on function public.track_public_report_view(text) from public;
revoke all on function public.track_public_report_share(text) from public;
revoke all on function public.get_public_published_reports_with_engagement() from public;
revoke all on function public.get_public_published_report_with_engagement(text) from public;
revoke all on function public.get_public_home_feed_with_engagement(double precision, double precision, text, text) from public;

grant execute on function public.track_public_report_view(text) to anon, authenticated, service_role;
grant execute on function public.track_public_report_share(text) to anon, authenticated, service_role;
grant execute on function public.get_public_published_reports_with_engagement() to anon, authenticated, service_role;
grant execute on function public.get_public_published_report_with_engagement(text) to anon, authenticated, service_role;
grant execute on function public.get_public_home_feed_with_engagement(double precision, double precision, text, text) to anon, authenticated, service_role;
