-- Canonical News Intake cron parity.
-- The cron job wakes every minute; the dispatcher itself enforces the 36-hour
-- next_auto_due_at gate and refuses overlapping runs.

do $$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select jobid from cron.job
    where jobname='sobaike-janao-news-intake-auto-dispatch'
  loop
    perform cron.unschedule(v_job_id);
  end loop;
end
$$;

select cron.schedule(
  'sobaike-janao-news-intake-auto-dispatch',
  '* * * * *',
  $$select private.dispatch_news_intake_auto_scan();$$
);
