-- News Intake safe-source and pre-insert duplicate foundation.
-- Production migration: 20260918161717_news_intake_foundation

create table if not exists public.news_source_domains (
  hostname text primary key,
  publisher_name text not null,
  active boolean not null default true,
  created_by uuid references public.admin_users(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint news_source_domains_hostname_chk check (
    hostname = lower(hostname)
    and hostname ~ '^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$'
    and hostname not like '%.local'
    and hostname <> 'localhost'
  )
);

alter table public.news_source_domains enable row level security;
revoke all on table public.news_source_domains from public, anon, authenticated;

drop policy if exists news_source_domains_anon_deny on public.news_source_domains;
create policy news_source_domains_anon_deny
on public.news_source_domains for all to anon
using (false) with check (false);

drop policy if exists news_source_domains_authenticated_deny on public.news_source_domains;
create policy news_source_domains_authenticated_deny
on public.news_source_domains for all to authenticated
using (false) with check (false);

insert into public.news_source_domains(hostname,publisher_name,active)
select
  lower(substring(s.canonical_url from '^https://([^/:?#]+)')) as hostname,
  min(nullif(btrim(s.publisher_name),'')) as publisher_name,
  true
from public.complaint_sources s
where s.verification_status='verified'
  and s.is_final_detail_page=true
  and s.canonical_url ~ '^https://[^/:?#]+/.+'
group by lower(substring(s.canonical_url from '^https://([^/:?#]+)'))
on conflict(hostname) do update set
  publisher_name=excluded.publisher_name,
  active=true,
  updated_at=now();

CREATE OR REPLACE FUNCTION public.source_hostname(p_url text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog'
AS $function$
  select lower(substring(btrim(coalesce(p_url,'')) from '^https://([^/:?#]+)'));
$function$

revoke all on function public.source_hostname(text) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.admin_check_news_source_domain(p_url text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_host text;
  v_source public.news_source_domains%rowtype;
begin
  if not public.is_active_admin()
     or not public.has_permission('complaints.publish') then
    raise exception 'Access denied.' using errcode='42501';
  end if;

  if p_url is null or btrim(p_url) !~ '^https://[^/]+/.+' then
    raise exception 'A valid HTTPS article URL is required.' using errcode='22023';
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
$function$

revoke all on function public.admin_check_news_source_domain(text) from public,anon;
grant execute on function public.admin_check_news_source_domain(text) to authenticated;

CREATE OR REPLACE FUNCTION public.evaluate_sourced_report_candidate_internal(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_report jsonb:=coalesce(p_payload->'report','{}'::jsonb);
  v_source jsonb:=coalesce(p_payload->'source','{}'::jsonb);
  v_segment text:=nullif(btrim(v_report->>'segmentId'),'');
  v_subcategory text:=nullif(btrim(v_report->>'subcategoryId'),'');
  v_title text:=nullif(btrim(v_report->>'titleBn'),'');
  v_title_en text:=nullif(btrim(v_report->>'titleEn'),'');
  v_incident_date date;
  v_district text:=nullif(btrim(v_report->>'district'),'');
  v_upazila text:=nullif(btrim(v_report->>'upazilaOrThana'),'');
  v_area text:=nullif(btrim(v_report->>'area'),'');
  v_url text:=nullif(btrim(v_source->>'canonicalUrl'),'');
  v_exact jsonb:='[]'::jsonb;
  v_candidates jsonb:='[]'::jsonb;
  v_candidate_count integer:=0;
  v_match_count integer:=0;
  v_review_count integer:=0;
  v_status text:='clear';
begin
  begin
    v_incident_date:=(v_report->>'incidentDate')::date;
  exception when others then
    raise exception 'A valid incident date is required.' using errcode='22023';
  end;

  if v_segment is null or v_subcategory is null or coalesce(v_title,v_title_en) is null
     or v_district is null then
    raise exception 'Category, subcategory, title, incident date, and district are required for duplicate preview.'
      using errcode='22023';
  end if;

  if v_url is not null then
    select coalesce(jsonb_agg(jsonb_build_object(
      'complaintId',c.id,
      'status',c.status,
      'titleBn',c.title,
      'titleEn',c.title_en,
      'publisherName',s.publisher_name,
      'sourceTitle',s.source_title,
      'canonicalUrl',s.canonical_url
    ) order by case when c.status='published' then 0 else 1 end,c.created_at desc),'[]'::jsonb)
    into v_exact
    from public.complaint_sources s
    join public.complaints c on c.id=s.complaint_id
    where public.normalize_source_url(s.canonical_url)=public.normalize_source_url(v_url);
  end if;

  with candidate_base as (
    select
      c.*,
      greatest(
        public.duplicate_token_similarity(v_title,c.title),
        public.duplicate_token_similarity(v_title,c.title_en),
        public.duplicate_token_similarity(v_title_en,c.title),
        public.duplicate_token_similarity(v_title_en,c.title_en)
      ) title_similarity,
      v_subcategory=c.subcategory_id same_subcategory,
      v_incident_date=c.incident_date same_date,
      abs(v_incident_date-c.incident_date) date_delta,
      public.normalize_duplicate_text(v_district)<>'' and
        public.normalize_duplicate_text(v_district)=public.normalize_duplicate_text(c.district) same_district,
      public.normalize_duplicate_text(v_upazila)<>'' and
        public.normalize_duplicate_text(v_upazila)=public.normalize_duplicate_text(c.upazila_or_thana) same_upazila,
      public.normalize_duplicate_text(v_area)<>'' and
        public.normalize_duplicate_text(v_area)=public.normalize_duplicate_text(c.area) same_area,
      (
        public.normalize_duplicate_text(v_title)<>'' and (
          public.normalize_duplicate_text(v_title)=public.normalize_duplicate_text(c.title)
          or public.normalize_duplicate_text(v_title)=public.normalize_duplicate_text(c.title_en)
        )
      ) or (
        public.normalize_duplicate_text(v_title_en)<>'' and (
          public.normalize_duplicate_text(v_title_en)=public.normalize_duplicate_text(c.title)
          or public.normalize_duplicate_text(v_title_en)=public.normalize_duplicate_text(c.title_en)
        )
      ) exact_title
    from public.complaints c
    where c.origin_type='sourced_report'
      and c.status in ('submitted','published','unpublished','edited')
      and c.segment_id=v_segment
      and (
        abs(v_incident_date-c.incident_date)<=3
        or greatest(
          public.duplicate_token_similarity(v_title,c.title),
          public.duplicate_token_similarity(v_title,c.title_en),
          public.duplicate_token_similarity(v_title_en,c.title),
          public.duplicate_token_similarity(v_title_en,c.title_en)
        )>=0.50
      )
  ),
  scored as (
    select *,
      least(100,
        (case when same_subcategory then 25 else 0 end)
        +(case when same_date then 25 when date_delta=1 then 15 when date_delta<=3 then 5 else 0 end)
        +(case when same_district then 10 else 0 end)
        +(case when same_upazila then 15 else 0 end)
        +(case when same_area then 15 else 0 end)
        +(case when exact_title then 30 else round(title_similarity*30)::integer end)
      ) score
    from candidate_base
  ),
  classified as (
    select *,
      case
        when exact_title and same_subcategory and date_delta<=1 then 'match'
        when score>=75 and title_similarity>=0.35 and (same_upazila or same_area) then 'match'
        when score>=55 and (title_similarity>=0.20 or same_area) then 'review'
        else 'clear'
      end match_level
    from scored
  ),
  ranked as (
    select * from classified
    where match_level in ('match','review')
    order by case match_level when 'match' then 0 else 1 end,score desc,created_at desc,id
    limit 5
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'complaintId',r.id,
      'status',r.status,
      'titleBn',r.title,
      'titleEn',r.title_en,
      'segmentId',r.segment_id,
      'subcategoryId',r.subcategory_id,
      'incidentDate',to_char(r.incident_date,'YYYY-MM-DD'),
      'district',r.district,
      'upazilaOrThana',r.upazila_or_thana,
      'area',r.area,
      'score',r.score,
      'titleSimilarity',r.title_similarity,
      'matchLevel',r.match_level,
      'reasons',to_jsonb(array_remove(array[
        case when r.same_subcategory then 'same_subcategory' end,
        case when r.same_date then 'same_incident_date' end,
        case when r.same_district then 'same_district' end,
        case when r.same_upazila then 'same_upazila_or_thana' end,
        case when r.same_area then 'same_area' end,
        case when r.exact_title then 'same_normalized_title' end,
        case when r.title_similarity>=0.50 then 'strong_title_overlap'
             when r.title_similarity>=0.20 then 'title_overlap' end
      ]::text[],null)),
      'sources',(
        select coalesce(jsonb_agg(jsonb_build_object(
          'publisherName',cs.publisher_name,
          'sourceTitle',cs.source_title,
          'canonicalUrl',cs.canonical_url,
          'sourcePublishedDate',to_char(cs.source_published_date,'YYYY-MM-DD')
        ) order by cs.created_at),'[]'::jsonb)
        from public.complaint_sources cs where cs.complaint_id=r.id
      )
    ) order by case r.match_level when 'match' then 0 else 1 end,r.score desc,r.created_at desc),'[]'::jsonb),
    count(*)::integer,
    count(*) filter(where match_level='match')::integer,
    count(*) filter(where match_level='review')::integer
  into v_candidates,v_candidate_count,v_match_count,v_review_count
  from ranked r;

  if jsonb_array_length(v_exact)>0 then v_status:='exact';
  elsif v_match_count>0 then v_status:='match';
  elsif v_review_count>0 then v_status:='review';
  end if;

  return jsonb_build_object(
    'applicable',true,
    'status',v_status,
    'requiresReview',v_status<>'clear',
    'candidateCount',v_candidate_count,
    'matchCount',v_match_count,
    'reviewCount',v_review_count,
    'exactSourceDuplicates',v_exact,
    'candidates',v_candidates
  );
end;
$function$

revoke all on function public.evaluate_sourced_report_candidate_internal(jsonb) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.admin_preview_sourced_report_intake(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_source_check jsonb;
  v_duplicate jsonb;
begin
  if not public.is_active_admin() or not public.has_permission('complaints.publish') then
    raise exception 'Access denied.' using errcode='42501';
  end if;

  v_source_check:=public.admin_check_news_source_domain(p_payload#>>'{source,canonicalUrl}');
  if coalesce((v_source_check->>'approved')::boolean,false) is not true then
    raise exception 'SOURCE_DOMAIN_NOT_APPROVED: Source domain is not in the approved news-source registry.'
      using errcode='22023';
  end if;

  v_duplicate:=public.evaluate_sourced_report_candidate_internal(p_payload);

  return jsonb_build_object(
    'sourceDomain',v_source_check,
    'duplicate',v_duplicate,
    'canCreateDraft',jsonb_array_length(coalesce(v_duplicate->'exactSourceDuplicates','[]'::jsonb))=0,
    'canPublishImmediately',coalesce(v_duplicate->>'status','clear')='clear'
  );
end;
$function$

revoke all on function public.admin_preview_sourced_report_intake(jsonb) from public,anon;
grant execute on function public.admin_preview_sourced_report_intake(jsonb) to authenticated;
