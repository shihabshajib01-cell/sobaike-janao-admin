-- Supabase documents pg_net as non-relocatable. Reinstall it with the
-- extension metadata in extensions, only when no outbound request is queued.
do $$
begin
  if exists (select 1 from net.http_request_queue limit 1) then
    raise exception 'PG_NET_QUEUE_NOT_EMPTY';
  end if;
end $$;

create schema if not exists extensions;

drop extension pg_net;
create extension pg_net with schema extensions;

revoke all on schema net from public;
revoke all on schema net from anon, authenticated;
revoke execute on all functions in schema net from public, anon, authenticated;
revoke all on all tables in schema net from public, anon, authenticated;
revoke all on all sequences in schema net from public, anon, authenticated;

grant usage on schema net to postgres;
grant execute on all functions in schema net to postgres;
