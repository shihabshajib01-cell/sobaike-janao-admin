-- Remove Admin RPC surfaces that have no callers in the current Admin app,
-- Edge Functions, database functions/triggers, or pg_cron jobs.

drop function if exists public.admin_create_reporting_form_draft(text, text);
drop function if exists public.admin_delete_user(uuid);
drop function if exists public.service_begin_news_intake_run();
drop function if exists public.admin_unpublish_complaint(text);
