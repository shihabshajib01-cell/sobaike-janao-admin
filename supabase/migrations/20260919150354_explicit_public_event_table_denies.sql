drop policy if exists "RPC-only table: deny direct reads" on public.public_engagement_events;
create policy "RPC-only table: deny direct reads"
on public.public_engagement_events
for select
to anon, authenticated
using (false);

drop policy if exists "RPC-only table: deny direct reads" on public.public_response_rate_events;
create policy "RPC-only table: deny direct reads"
on public.public_response_rate_events
for select
to anon, authenticated
using (false);

revoke all on table public.public_engagement_events from anon, authenticated;
revoke all on table public.public_response_rate_events from anon, authenticated;
