create index if not exists idx_news_intake_runs_started_by
  on public.news_intake_runs(started_by);

create index if not exists idx_news_intake_run_items_segment_id
  on public.news_intake_run_items(segment_id)
  where segment_id is not null;

create index if not exists idx_news_intake_run_items_subcategory_id
  on public.news_intake_run_items(subcategory_id)
  where subcategory_id is not null;
