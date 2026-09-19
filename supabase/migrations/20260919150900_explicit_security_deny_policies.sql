-- Explicit deny policies for RPC-owned/internal tables.
do $$
declare
  t text;
begin
  foreach t in array array[
    'public_category_popularity_snapshot',
    'reporting_form_schema_fields',
    'reporting_form_schemas',
    'site_banners',
    'public_engagement_events',
    'public_response_rate_events'
  ]
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      'explicit deny direct client access',
      t
    );
    execute format(
      'create policy %I on public.%I for all to anon, authenticated using (false) with check (false)',
      'explicit deny direct client access',
      t
    );
  end loop;
end $$;
