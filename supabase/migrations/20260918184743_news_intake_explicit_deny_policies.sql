
drop policy if exists news_intake_runs_anon_deny on public.news_intake_runs;
create policy news_intake_runs_anon_deny
on public.news_intake_runs for all to anon
using (false) with check (false);

drop policy if exists news_intake_runs_authenticated_deny on public.news_intake_runs;
create policy news_intake_runs_authenticated_deny
on public.news_intake_runs for all to authenticated
using (false) with check (false);

drop policy if exists news_intake_run_items_anon_deny on public.news_intake_run_items;
create policy news_intake_run_items_anon_deny
on public.news_intake_run_items for all to anon
using (false) with check (false);

drop policy if exists news_intake_run_items_authenticated_deny on public.news_intake_run_items;
create policy news_intake_run_items_authenticated_deny
on public.news_intake_run_items for all to authenticated
using (false) with check (false);
