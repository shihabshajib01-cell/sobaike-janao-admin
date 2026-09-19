-- Service-only rate limiter for unauthenticated Edge Function utilities.
-- Raw client IPs are never stored; the existing private HMAC secret is reused.

create or replace function public.service_consume_public_edge_rate_limit(
  p_action text,
  p_ip text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
declare
  v_action text := btrim(coalesce(p_action, ''));
  v_ip text := btrim(coalesce(p_ip, ''));
  v_fingerprint bytea;
  v_count integer;
  v_window interval;
begin
  if v_action not in ('public_ip_location') then
    return false;
  end if;
  if v_ip = '' or length(v_ip) > 128 then
    return false;
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 10000 then
    return false;
  end if;
  if p_window_seconds is null or p_window_seconds < 1 or p_window_seconds > 86400 then
    return false;
  end if;

  v_window := make_interval(secs => p_window_seconds);
  v_fingerprint := private.public_abuse_hmac('edge-ip:' || v_ip);

  perform pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_action || ':' || encode(v_fingerprint, 'hex'), 0)
  );

  select count(*)::integer
  into v_count
  from private.public_api_rate_events e
  where e.action = v_action
    and e.ip_fingerprint = v_fingerprint
    and e.created_at >= now() - v_window;

  if v_count >= p_limit then
    return false;
  end if;

  insert into private.public_api_rate_events(
    action, ip_fingerprint, subject_fingerprint, created_at
  ) values (
    v_action, v_fingerprint, null, now()
  );

  return true;
end;
$function$;

revoke all on function public.service_consume_public_edge_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.service_consume_public_edge_rate_limit(text, text, integer, integer)
  to service_role;
