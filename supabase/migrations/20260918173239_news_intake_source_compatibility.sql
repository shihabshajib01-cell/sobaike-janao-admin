create or replace function public.admin_check_news_source_domain(p_url text)
returns jsonb
language plpgsql
stable security definer
set search_path to 'pg_catalog','public'
as $function$
declare
  v_host text;
  v_source public.news_source_domains%rowtype;
begin
  if not public.is_active_admin()
     or not public.has_permission('complaints.publish') then
    raise exception 'Access denied.' using errcode='42501';
  end if;

  if p_url is null or btrim(p_url) !~ '^https://[^/]+(?:/.*)?$' then
    raise exception 'A valid HTTPS source URL is required.' using errcode='22023';
  end if;

  v_host:=public.source_hostname(p_url);
  if v_host is null then
    raise exception 'Could not determine source hostname.' using errcode='22023';
  end if;

  select * into v_source
  from public.news_source_domains
  where hostname=v_host and active=true;

  return jsonb_build_object(
    'approved',v_source.hostname is not null,
    'hostname',v_host,
    'publisherName',v_source.publisher_name
  );
end;
$function$;

revoke all on function public.admin_check_news_source_domain(text) from public,anon;
grant execute on function public.admin_check_news_source_domain(text) to authenticated;

insert into public.news_source_domains(
  hostname,publisher_name,active,homepage_url,language_hint,scan_enabled,scan_priority
) values
  ('prothomalo.com','Prothom Alo',true,null,'bn',false,90),
  ('thedailystar.net','The Daily Star',true,null,'en',false,90),
  ('jugantor.com','Jugantor',true,null,'bn',false,90),
  ('kalerkantho.com','Kaler Kantho',true,null,'bn',false,90),
  ('ittefaq.com.bd','The Daily Ittefaq',true,null,'bn',false,90),
  ('jagonews24.com','Jago News',true,null,'bn',false,90),
  ('banglatribune.com','Bangla Tribune',true,null,'bn',false,90),
  ('dhakapost.com','Dhaka Post',true,null,'bn',false,90),
  ('banglanews24.com','Banglanews24.com',true,null,'bn',false,90),
  ('dhakatribune.com','Dhaka Tribune',true,null,'en',false,90),
  ('newagebd.net','New Age',true,null,'en',false,90),
  ('tbsnews.net','The Business Standard',true,null,'en',false,90),
  ('bssnews.net','Bangladesh Sangbad Sangstha',true,null,'en',false,90),
  ('www.bonikbarta.com','Bonik Barta',true,null,'bn',false,90),
  ('www.unb.com.bd','UNB',true,null,'en',false,90),
  ('www.bdnews24.com','bdnews24.com',true,null,'en',false,90)
on conflict (hostname) do update
set publisher_name=excluded.publisher_name,
    active=true,
    language_hint=excluded.language_hint,
    scan_enabled=false,
    updated_at=now();
