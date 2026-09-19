-- Persistent server-side rate limiter for anonymous public write gateway.
create table if not exists public.public_write_rate_events (
  id bigint generated always as identity primary key,
  source_fingerprint text not null,
  action text not null check (action in ('complaint','response','engagement')),
  created_at timestamptz not null default now()
);

alter table public.public_write_rate_events enable row level security;
revoke all on table public.public_write_rate_events from anon, authenticated;

drop policy if exists "explicit deny direct client access" on public.public_write_rate_events;
create policy "explicit deny direct client access"
on public.public_write_rate_events
for all to anon, authenticated
using (false)
with check (false);

create index if not exists public_write_rate_fingerprint_action_created_idx
  on public.public_write_rate_events(source_fingerprint, action, created_at desc);

create or replace function public.service_assert_public_write_rate(
  p_source_fingerprint text,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public','pg_temp'
as $function$
declare
  v_fingerprint text := nullif(btrim(p_source_fingerprint),'');
  v_action text := lower(nullif(btrim(p_action),''));
  v_minute_count integer;
  v_hour_count integer;
  v_day_count integer;
begin
  if v_fingerprint is null or length(v_fingerprint) <> 64
     or v_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception 'INVALID_RATE_FINGERPRINT' using errcode='22000';
  end if;

  if v_action not in ('complaint','response','engagement') then
    raise exception 'INVALID_RATE_ACTION' using errcode='22000';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_fingerprint || ':' || v_action));

  select count(*) into v_minute_count
  from public.public_write_rate_events
  where source_fingerprint=v_fingerprint
    and action=v_action
    and created_at > now() - interval '1 minute';

  select count(*) into v_hour_count
  from public.public_write_rate_events
  where source_fingerprint=v_fingerprint
    and action=v_action
    and created_at > now() - interval '1 hour';

  select count(*) into v_day_count
  from public.public_write_rate_events
  where source_fingerprint=v_fingerprint
    and action=v_action
    and created_at > now() - interval '24 hours';

  if v_action='complaint' and (
       v_minute_count >= 2 or v_hour_count >= 5 or v_day_count >= 20
     ) then
    return jsonb_build_object('allowed',false,'retryAfterSeconds',3600);
  end if;

  if v_action='response' and (
       v_minute_count >= 3 or v_hour_count >= 10 or v_day_count >= 40
     ) then
    return jsonb_build_object('allowed',false,'retryAfterSeconds',3600);
  end if;

  if v_action='engagement' and (
       v_minute_count >= 90 or v_hour_count >= 600 or v_day_count >= 3000
     ) then
    return jsonb_build_object('allowed',false,'retryAfterSeconds',60);
  end if;

  insert into public.public_write_rate_events(source_fingerprint,action)
  values(v_fingerprint,v_action);

  return jsonb_build_object('allowed',true);
end;
$function$;

revoke all on function public.service_assert_public_write_rate(text,text)
from public, anon, authenticated;
grant execute on function public.service_assert_public_write_rate(text,text)
to service_role;
