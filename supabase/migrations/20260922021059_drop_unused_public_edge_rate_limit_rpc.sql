-- Remove a legacy service-role RPC that has no caller in the current
-- Admin app, Public Edge Functions, database functions/triggers, or pg_cron.

drop function if exists public.service_consume_public_edge_rate_limit(
  text,
  text,
  integer,
  integer
);
