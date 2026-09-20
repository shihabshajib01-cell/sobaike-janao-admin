-- UNB's current-news page redirects automated fetches to the homepage in
-- production, so it cannot currently provide reliable automatic article
-- discovery. Keep the domain approved for manual intake, but remove it from
-- the 36-hour automatic scan until its server-rendered discovery path is stable.

update public.news_source_domains
set scan_enabled=false,
    automation_note='Manual-only: automated discovery redirects to the UNB homepage and cannot reliably enumerate final article pages.',
    updated_at=now()
where hostname='unb.com.bd'
  and active=true;
