-- Cover the News Intake source-domain audit foreign key.
create index if not exists idx_news_source_domains_created_by
  on public.news_source_domains(created_by);
