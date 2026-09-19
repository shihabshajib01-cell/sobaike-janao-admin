-- Close legacy anonymous engagement bypasses and reduce extension attack surface.
revoke all on function public.track_public_report_view_v2(text,text)
  from public, anon, authenticated;
revoke all on function public.track_public_report_share_v2(text,text)
  from public, anon, authenticated;

-- pg_net is used only by trusted server-side scheduler code. Client roles do not
-- need schema visibility or direct outbound HTTP execution. Hosted Supabase may
-- retain extension-owned ACLs; the intended application boundary is recorded here.
revoke usage on schema net from public, anon, authenticated;
revoke execute on all functions in schema net from public, anon, authenticated;
grant usage on schema net to service_role;
grant execute on all functions in schema net to service_role;

-- Extend the persistent server-side limiter to approximate IP geolocation.
alter table public.public_write_rate_events
  drop constraint if exists public_write_rate_events_action_check;

alter table public.public_write_rate_events
  add constraint public_write_rate_events_action_check
  check (action in ('complaint','response','engagement','session','ip_location'));

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

  if v_action not in ('complaint','response','engagement','session','ip_location') then
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
       v_minute_count >= 6 or v_hour_count >= 30 or v_day_count >= 100
     ) then
    return jsonb_build_object('allowed',false,'retryAfterSeconds',3600);
  end if;

  if v_action='response' and (
       v_minute_count >= 15 or v_hour_count >= 120 or v_day_count >= 500
     ) then
    return jsonb_build_object('allowed',false,'retryAfterSeconds',3600);
  end if;

  if v_action='engagement' and (
       v_minute_count >= 120 or v_hour_count >= 1000 or v_day_count >= 5000
     ) then
    return jsonb_build_object('allowed',false,'retryAfterSeconds',60);
  end if;

  if v_action='session' and (
       v_minute_count >= 60 or v_hour_count >= 600 or v_day_count >= 2000
     ) then
    return jsonb_build_object('allowed',false,'retryAfterSeconds',60);
  end if;

  if v_action='ip_location' and (
       v_minute_count >= 60 or v_hour_count >= 600 or v_day_count >= 2000
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
