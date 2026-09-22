-- Allow the dedicated evidence action in the public write-rate event ledger.

alter table public.public_write_rate_events
  drop constraint if exists public_write_rate_events_action_check;

alter table public.public_write_rate_events
  add constraint public_write_rate_events_action_check
  check (action = any (array[
    'complaint'::text,
    'evidence'::text,
    'response'::text,
    'engagement'::text,
    'session'::text,
    'ip_location'::text
  ]));
