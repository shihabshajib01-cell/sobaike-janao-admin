-- Re-assert least-privilege grants after pg_net installation.
-- Hosted Supabase may restore managed net-schema grants; the net schema remains
-- outside the Data API. This migration records the intended application boundary.
revoke all on schema net from public, anon, authenticated;
revoke execute on all functions in schema net from public, anon, authenticated;
revoke all on all tables in schema net from public, anon, authenticated;
revoke all on all sequences in schema net from public, anon, authenticated;
grant usage on schema net to postgres;
grant execute on all functions in schema net to postgres;
