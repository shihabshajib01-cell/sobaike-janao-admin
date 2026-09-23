-- Recover abandoned News Intake scans independently of the 36-hour auto-dispatch.
-- This job never initiates a scan or publishes a report.
create or replace function private.recover_abandoned_news_intake_runs()
returns integer
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $function$
declare
  v_count integer;
begin
  update public.news_intake_runs
  set status = 'failed',
      completed_at = clock_timestamp(),
      error_summary = concat_ws(
        ' ',
        nullif(error_summary, ''),
        'Automatic recovery: scan exceeded the established 20-minute run timeout.'
      )
  where status = 'running'
    and started_at < clock_timestamp() - interval '20 minutes';

  get diagnostics v_count = row_count;
  return v_count;
end;
$function$;

revoke all on function private.recover_abandoned_news_intake_runs() from public, anon, authenticated;

do $schedule$
declare
  v_existing bigint;
begin
  select jobid into v_existing
  from cron.job
  where jobname = 'sobaike-janao-news-intake-stale-run-recovery';

  if v_existing is not null then
    perform cron.unschedule(v_existing);
  end if;

  perform cron.schedule(
    'sobaike-janao-news-intake-stale-run-recovery',
    '*/5 * * * *',
    'select private.recover_abandoned_news_intake_runs();'
  );
end;
$schedule$;
