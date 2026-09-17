-- Phase 1 popular-post engagement source alignment.
-- Live database columns/RPCs already exist; this migration keeps repository history reproducible
-- and safely converges environments without changing existing publication/privacy behavior.

alter table public.complaints
  add column if not exists public_view_count bigint not null default 0,
  add column if not exists public_share_count bigint not null default 0;

do $$ begin
  if not exists (select 1 from pg_constraint where conrelid='public.complaints'::regclass and conname='complaints_public_view_count_check') then
    alter table public.complaints add constraint complaints_public_view_count_check check (public_view_count >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.complaints'::regclass and conname='complaints_public_share_count_check') then
    alter table public.complaints add constraint complaints_public_share_count_check check (public_share_count >= 0);
  end if;
end $$;

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

revoke all on function public.track_public_report_view(text) from public;
revoke all on function public.track_public_report_share(text) from public;
grant execute on function public.track_public_report_view(text) to anon, authenticated;
grant execute on function public.track_public_report_share(text) to anon, authenticated;
