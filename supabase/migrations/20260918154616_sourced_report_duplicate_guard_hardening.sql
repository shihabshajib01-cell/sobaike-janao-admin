create index if not exists idx_report_duplicate_overrides_report_b_id
  on public.report_duplicate_overrides (report_b_id);

drop policy if exists report_duplicate_overrides_anon_deny
  on public.report_duplicate_overrides;
create policy report_duplicate_overrides_anon_deny
  on public.report_duplicate_overrides
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists report_duplicate_overrides_authenticated_deny
  on public.report_duplicate_overrides;
create policy report_duplicate_overrides_authenticated_deny
  on public.report_duplicate_overrides
  for all
  to authenticated
  using (false)
  with check (false);
