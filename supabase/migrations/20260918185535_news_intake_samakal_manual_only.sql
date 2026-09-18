
update public.news_source_domains
set scan_enabled=false,
    automation_note='Trusted source; canonical Samakal pages currently block automated server-side reading, so use manual News Intake for this publisher.',
    updated_at=now()
where hostname='samakal.com';
