-- Safe duplicate-prevention foundation for sourced reports.
-- Exact source reuse is blocked globally. Incident similarity is conservative:
-- high-confidence matches and ambiguous candidates require an explicit Admin review
-- before a sourced report can transition to published.

create or replace function public.normalize_source_url(p_url text)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select nullif(
    regexp_replace(
      regexp_replace(btrim(coalesce(p_url, '')), '#.*$', ''),
      '/$',
      ''
    ),
    ''
  );
$$;

create or replace function public.normalize_duplicate_text(p_value text)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select btrim(
    regexp_replace(
      regexp_replace(lower(coalesce(p_value, '')), '[[:punct:]]+', ' ', 'g'),
      '[[:space:]]+',
      ' ',
      'g'
    )
  );
$$;

create or replace function public.duplicate_token_similarity(p_left text, p_right text)
returns numeric
language sql
immutable
set search_path = pg_catalog, public
as $$
  with
  left_tokens as (
    select distinct token
    from regexp_split_to_table(public.normalize_duplicate_text(p_left), '[[:space:]]+') as token
    where char_length(token) >= 2
  ),
  right_tokens as (
    select distinct token
    from regexp_split_to_table(public.normalize_duplicate_text(p_right), '[[:space:]]+') as token
    where char_length(token) >= 2
  ),
  counts as (
    select
      (select count(*) from left_tokens) as left_count,
      (select count(*) from right_tokens) as right_count,
      (
        select count(*)
        from left_tokens l
        join right_tokens r using (token)
      ) as shared_count
  )
  select case
    when left_count = 0 or right_count = 0 then 0::numeric
    else round((2.0 * shared_count / (left_count + right_count))::numeric, 4)
  end
  from counts;
$$;

create or replace function public.duplicate_report_signature_values(
  p_segment_id text,
  p_subcategory_id text,
  p_title text,
  p_title_en text,
  p_incident_date date,
  p_district text,
  p_upazila_or_thana text,
  p_area text
)
returns text
language sql
immutable
set search_path = pg_catalog, public, extensions
as $$
  select encode(
    extensions.digest(
      concat_ws(
        '|',
        public.normalize_duplicate_text(p_segment_id),
        public.normalize_duplicate_text(p_subcategory_id),
        public.normalize_duplicate_text(p_title),
        public.normalize_duplicate_text(p_title_en),
        coalesce(p_incident_date::text, ''),
        public.normalize_duplicate_text(p_district),
        public.normalize_duplicate_text(p_upazila_or_thana),
        public.normalize_duplicate_text(p_area)
      ),
      'sha256'
    ),
    'hex'
  );
$$;

create unique index if not exists ux_complaint_sources_global_canonical_url
  on public.complaint_sources (public.normalize_source_url(canonical_url));

create index if not exists idx_complaints_sourced_duplicate_scan
  on public.complaints (segment_id, incident_date, status, subcategory_id)
  where origin_type = 'sourced_report';

create table if not exists public.report_duplicate_overrides (
  report_a_id text not null references public.complaints(id) on delete cascade,
  report_b_id text not null references public.complaints(id) on delete cascade,
  report_a_signature text not null,
  report_b_signature text not null,
  review_note text not null,
  reviewed_by uuid not null,
  reviewed_at timestamptz not null default now(),
  primary key (report_a_id, report_b_id),
  constraint report_duplicate_overrides_ordered_pair_chk
    check (report_a_id < report_b_id),
  constraint report_duplicate_overrides_note_chk
    check (char_length(btrim(review_note)) >= 8)
);

alter table public.report_duplicate_overrides enable row level security;
revoke all on table public.report_duplicate_overrides from public, anon, authenticated;

create or replace function public.evaluate_sourced_report_duplicate_internal(p_complaint_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_target public.complaints%rowtype;
  v_target_signature text;
  v_exact_sources jsonb := '[]'::jsonb;
  v_candidates jsonb := '[]'::jsonb;
  v_candidate_count integer := 0;
  v_match_count integer := 0;
  v_review_count integer := 0;
  v_status text := 'clear';
begin
  select *
  into v_target
  from public.complaints
  where id = p_complaint_id;

  if v_target.id is null then
    raise exception 'Complaint with ID % not found', p_complaint_id using errcode='P0002';
  end if;

  if v_target.origin_type <> 'sourced_report' then
    return jsonb_build_object(
      'applicable', false,
      'status', 'clear',
      'requiresReview', false,
      'candidateCount', 0,
      'exactSourceDuplicates', '[]'::jsonb,
      'candidates', '[]'::jsonb
    );
  end if;

  v_target_signature := public.duplicate_report_signature_values(
    v_target.segment_id,
    v_target.subcategory_id,
    v_target.title,
    v_target.title_en,
    v_target.incident_date,
    v_target.district,
    v_target.upazila_or_thana,
    v_target.area
  );

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'complaintId', other_c.id,
        'status', other_c.status,
        'titleBn', other_c.title,
        'titleEn', other_c.title_en,
        'publisherName', other_s.publisher_name,
        'sourceTitle', other_s.source_title,
        'canonicalUrl', other_s.canonical_url
      )
      order by other_c.created_at desc, other_c.id
    ),
    '[]'::jsonb
  )
  into v_exact_sources
  from public.complaint_sources target_s
  join public.complaint_sources other_s
    on public.normalize_source_url(other_s.canonical_url) =
       public.normalize_source_url(target_s.canonical_url)
   and other_s.complaint_id <> target_s.complaint_id
  join public.complaints other_c on other_c.id = other_s.complaint_id
  where target_s.complaint_id = v_target.id
    and other_c.status <> 'rejected';

  with candidate_base as (
    select
      c.*,
      public.duplicate_report_signature_values(
        c.segment_id,
        c.subcategory_id,
        c.title,
        c.title_en,
        c.incident_date,
        c.district,
        c.upazila_or_thana,
        c.area
      ) as candidate_signature,
      greatest(
        public.duplicate_token_similarity(v_target.title, c.title),
        public.duplicate_token_similarity(v_target.title, c.title_en),
        public.duplicate_token_similarity(v_target.title_en, c.title),
        public.duplicate_token_similarity(v_target.title_en, c.title_en)
      ) as title_similarity,
      v_target.subcategory_id = c.subcategory_id as same_subcategory,
      v_target.incident_date = c.incident_date as same_date,
      abs(v_target.incident_date - c.incident_date) as date_delta,
      public.normalize_duplicate_text(v_target.district) <> ''
        and public.normalize_duplicate_text(v_target.district) =
            public.normalize_duplicate_text(c.district) as same_district,
      public.normalize_duplicate_text(v_target.upazila_or_thana) <> ''
        and public.normalize_duplicate_text(v_target.upazila_or_thana) =
            public.normalize_duplicate_text(c.upazila_or_thana) as same_upazila,
      public.normalize_duplicate_text(v_target.area) <> ''
        and public.normalize_duplicate_text(v_target.area) =
            public.normalize_duplicate_text(c.area) as same_area,
      (
        public.normalize_duplicate_text(v_target.title) <> ''
        and (
          public.normalize_duplicate_text(v_target.title) = public.normalize_duplicate_text(c.title)
          or public.normalize_duplicate_text(v_target.title) = public.normalize_duplicate_text(c.title_en)
        )
      ) or (
        public.normalize_duplicate_text(v_target.title_en) <> ''
        and (
          public.normalize_duplicate_text(v_target.title_en) = public.normalize_duplicate_text(c.title)
          or public.normalize_duplicate_text(v_target.title_en) = public.normalize_duplicate_text(c.title_en)
        )
      ) as exact_title
    from public.complaints c
    where c.id <> v_target.id
      and c.origin_type = 'sourced_report'
      and c.status in ('submitted', 'published', 'unpublished', 'edited')
      and c.segment_id = v_target.segment_id
      and (
        abs(v_target.incident_date - c.incident_date) <= 3
        or greatest(
          public.duplicate_token_similarity(v_target.title, c.title),
          public.duplicate_token_similarity(v_target.title, c.title_en),
          public.duplicate_token_similarity(v_target.title_en, c.title),
          public.duplicate_token_similarity(v_target.title_en, c.title_en)
        ) >= 0.50
      )
  ),
  without_valid_override as (
    select b.*
    from candidate_base b
    left join public.report_duplicate_overrides o
      on o.report_a_id = least(v_target.id, b.id)
     and o.report_b_id = greatest(v_target.id, b.id)
     and o.report_a_signature = case
       when v_target.id < b.id then v_target_signature else b.candidate_signature
     end
     and o.report_b_signature = case
       when v_target.id < b.id then b.candidate_signature else v_target_signature
     end
    where o.report_a_id is null
  ),
  scored as (
    select
      b.*,
      least(
        100,
          (case when same_subcategory then 25 else 0 end)
        + (case when same_date then 25 when date_delta = 1 then 15 when date_delta <= 3 then 5 else 0 end)
        + (case when same_district then 10 else 0 end)
        + (case when same_upazila then 15 else 0 end)
        + (case when same_area then 15 else 0 end)
        + (case when exact_title then 30 else round(title_similarity * 30)::integer end)
      ) as score
    from without_valid_override b
  ),
  classified as (
    select
      s.*,
      case
        when exact_title and same_subcategory and date_delta <= 1 then 'match'
        when score >= 75 and title_similarity >= 0.35 and (same_upazila or same_area) then 'match'
        when score >= 55 and (title_similarity >= 0.20 or same_area) then 'review'
        else 'clear'
      end as match_level
    from scored s
  ),
  flagged as (
    select *
    from classified
    where match_level in ('match', 'review')
  ),
  ranked as (
    select *
    from flagged
    order by
      case match_level when 'match' then 0 else 1 end,
      score desc,
      created_at desc,
      id
    limit 5
  )
  select
    coalesce(jsonb_agg(
      jsonb_build_object(
        'complaintId', r.id,
        'status', r.status,
        'titleBn', r.title,
        'titleEn', r.title_en,
        'segmentId', r.segment_id,
        'subcategoryId', r.subcategory_id,
        'incidentDate', to_char(r.incident_date, 'YYYY-MM-DD'),
        'district', r.district,
        'upazilaOrThana', r.upazila_or_thana,
        'area', r.area,
        'score', r.score,
        'titleSimilarity', r.title_similarity,
        'matchLevel', r.match_level,
        'reasons', to_jsonb(array_remove(array[
          case when r.same_subcategory then 'same_subcategory' end,
          case when r.same_date then 'same_incident_date' end,
          case when r.same_district then 'same_district' end,
          case when r.same_upazila then 'same_upazila_or_thana' end,
          case when r.same_area then 'same_area' end,
          case when r.exact_title then 'same_normalized_title' end,
          case when r.title_similarity >= 0.50 then 'strong_title_overlap'
               when r.title_similarity >= 0.20 then 'title_overlap' end
        ]::text[], null)),
        'sources', (
          select coalesce(jsonb_agg(
            jsonb_build_object(
              'publisherName', cs.publisher_name,
              'sourceTitle', cs.source_title,
              'canonicalUrl', cs.canonical_url,
              'sourcePublishedDate', to_char(cs.source_published_date, 'YYYY-MM-DD')
            )
            order by cs.created_at
          ), '[]'::jsonb)
          from public.complaint_sources cs
          where cs.complaint_id = r.id
        )
      )
      order by
        case r.match_level when 'match' then 0 else 1 end,
        r.score desc,
        r.created_at desc,
        r.id
    ), '[]'::jsonb),
    count(*)::integer,
    count(*) filter (where match_level = 'match')::integer,
    count(*) filter (where match_level = 'review')::integer
  into v_candidates, v_candidate_count, v_match_count, v_review_count
  from ranked r;

  if jsonb_array_length(v_exact_sources) > 0 then
    v_status := 'exact';
  elsif v_match_count > 0 then
    v_status := 'match';
  elsif v_review_count > 0 then
    v_status := 'review';
  else
    v_status := 'clear';
  end if;

  return jsonb_build_object(
    'applicable', true,
    'status', v_status,
    'requiresReview', v_status <> 'clear',
    'candidateCount', v_candidate_count,
    'matchCount', v_match_count,
    'reviewCount', v_review_count,
    'exactSourceDuplicates', v_exact_sources,
    'candidates', v_candidates
  );
end;
$$;

revoke all on function public.evaluate_sourced_report_duplicate_internal(text)
  from public, anon, authenticated;

create or replace function public.admin_check_source_duplicate(p_canonical_url text)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_normalized text;
  v_result jsonb;
begin
  if not public.is_active_admin()
     or not (
       public.has_permission('complaints.view')
       or public.has_permission('complaints.publish')
     ) then
    raise exception 'Access denied.' using errcode='42501';
  end if;

  v_normalized := public.normalize_source_url(p_canonical_url);
  if v_normalized is null then
    raise exception 'A valid source URL is required.' using errcode='22023';
  end if;

  select jsonb_build_object(
    'duplicate', true,
    'normalizedUrl', v_normalized,
    'complaintId', c.id,
    'complaintStatus', c.status,
    'titleBn', c.title,
    'titleEn', c.title_en,
    'publisherName', s.publisher_name,
    'sourceTitle', s.source_title,
    'canonicalUrl', s.canonical_url
  )
  into v_result
  from public.complaint_sources s
  join public.complaints c on c.id = s.complaint_id
  where public.normalize_source_url(s.canonical_url) = v_normalized
  order by
    case when c.status = 'published' then 0 else 1 end,
    c.created_at desc
  limit 1;

  return coalesce(
    v_result,
    jsonb_build_object(
      'duplicate', false,
      'normalizedUrl', v_normalized
    )
  );
end;
$$;

revoke all on function public.admin_check_source_duplicate(text)
  from public, anon;
grant execute on function public.admin_check_source_duplicate(text)
  to authenticated;

create or replace function public.admin_check_report_duplicate(p_complaint_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_active_admin()
     or not (
       public.has_permission('complaints.view')
       or public.has_permission('complaints.publish')
     ) then
    raise exception 'Access denied.' using errcode='42501';
  end if;

  return public.evaluate_sourced_report_duplicate_internal(p_complaint_id);
end;
$$;

revoke all on function public.admin_check_report_duplicate(text)
  from public, anon;
grant execute on function public.admin_check_report_duplicate(text)
  to authenticated;

create or replace function public.admin_confirm_reports_are_distinct(
  p_complaint_id text,
  p_candidate_complaint_id text,
  p_review_note text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_left public.complaints%rowtype;
  v_right public.complaints%rowtype;
  v_eval jsonb;
  v_a_id text;
  v_b_id text;
  v_a_signature text;
  v_b_signature text;
  v_left_signature text;
  v_right_signature text;
begin
  if not public.is_active_admin()
     or not public.has_permission('complaints.publish') then
    raise exception 'Access denied.' using errcode='42501';
  end if;

  if p_complaint_id is null
     or p_candidate_complaint_id is null
     or p_complaint_id = p_candidate_complaint_id then
    raise exception 'Two different report IDs are required.' using errcode='22023';
  end if;

  if char_length(btrim(coalesce(p_review_note, ''))) < 8 then
    raise exception 'A review note of at least 8 characters is required.' using errcode='22023';
  end if;

  select * into v_left
  from public.complaints
  where id = p_complaint_id
  for update;

  select * into v_right
  from public.complaints
  where id = p_candidate_complaint_id
  for update;

  if v_left.id is null or v_right.id is null then
    raise exception 'One or both reports were not found.' using errcode='P0002';
  end if;

  if v_left.origin_type <> 'sourced_report'
     or v_right.origin_type <> 'sourced_report' then
    raise exception 'Distinct-incident review is only available for sourced reports.' using errcode='22023';
  end if;

  v_eval := public.evaluate_sourced_report_duplicate_internal(v_left.id);

  if not exists (
    select 1
    from jsonb_array_elements(coalesce(v_eval->'candidates', '[]'::jsonb)) item
    where item->>'complaintId' = v_right.id
  ) then
    raise exception 'This report is not an active duplicate candidate.' using errcode='22023';
  end if;

  v_left_signature := public.duplicate_report_signature_values(
    v_left.segment_id, v_left.subcategory_id, v_left.title, v_left.title_en,
    v_left.incident_date, v_left.district, v_left.upazila_or_thana, v_left.area
  );
  v_right_signature := public.duplicate_report_signature_values(
    v_right.segment_id, v_right.subcategory_id, v_right.title, v_right.title_en,
    v_right.incident_date, v_right.district, v_right.upazila_or_thana, v_right.area
  );

  v_a_id := least(v_left.id, v_right.id);
  v_b_id := greatest(v_left.id, v_right.id);
  v_a_signature := case when v_left.id < v_right.id then v_left_signature else v_right_signature end;
  v_b_signature := case when v_left.id < v_right.id then v_right_signature else v_left_signature end;

  insert into public.report_duplicate_overrides (
    report_a_id,
    report_b_id,
    report_a_signature,
    report_b_signature,
    review_note,
    reviewed_by,
    reviewed_at
  )
  values (
    v_a_id,
    v_b_id,
    v_a_signature,
    v_b_signature,
    btrim(p_review_note),
    auth.uid(),
    now()
  )
  on conflict (report_a_id, report_b_id)
  do update set
    report_a_signature = excluded.report_a_signature,
    report_b_signature = excluded.report_b_signature,
    review_note = excluded.review_note,
    reviewed_by = excluded.reviewed_by,
    reviewed_at = excluded.reviewed_at;

  insert into public.admin_audit_logs (
    actor_id,
    action,
    target_type,
    target_id,
    details
  )
  values (
    auth.uid(),
    'complaint.duplicate_distinct_confirmed',
    'complaint',
    v_left.id,
    jsonb_build_object(
      'candidate_complaint_id', v_right.id,
      'review_note', btrim(p_review_note),
      'report_signature', v_left_signature,
      'candidate_signature', v_right_signature,
      'timestamp', now()
    )
  );

  return public.evaluate_sourced_report_duplicate_internal(v_left.id);
end;
$$;

revoke all on function public.admin_confirm_reports_are_distinct(text, text, text)
  from public, anon;
grant execute on function public.admin_confirm_reports_are_distinct(text, text, text)
  to authenticated;

create or replace function public.enforce_sourced_report_duplicate_review()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_eval jsonb;
  v_status text;
  v_candidate_ids text;
begin
  if new.status = 'published'
     and coalesce(old.status, '') <> 'published'
     and new.origin_type = 'sourced_report' then

    v_eval := public.evaluate_sourced_report_duplicate_internal(new.id);
    v_status := coalesce(v_eval->>'status', 'clear');

    if v_status <> 'clear' then
      select string_agg(item->>'complaintId', ', ')
      into v_candidate_ids
      from jsonb_array_elements(coalesce(v_eval->'candidates', '[]'::jsonb)) item;

      raise exception
        'DUPLICATE_REVIEW_REQUIRED: Sourced report % has unresolved duplicate candidates (%). Review before publishing.',
        new.id,
        coalesce(nullif(v_candidate_ids, ''), v_status)
        using errcode='22023';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_sourced_report_duplicate_review()
  from public, anon, authenticated;

drop trigger if exists trg_enforce_sourced_report_duplicate_review
  on public.complaints;

create trigger trg_enforce_sourced_report_duplicate_review
before update of status on public.complaints
for each row
execute function public.enforce_sourced_report_duplicate_review();

comment on table public.report_duplicate_overrides is
  'Admin-reviewed sourced-report pairs confirmed to represent separate incidents. Stored signatures invalidate the override automatically when incident-defining fields change.';

comment on function public.admin_check_source_duplicate(text) is
  'Admin-only exact canonical source lookup. Used before creating/importing a sourced report.';

comment on function public.admin_check_report_duplicate(text) is
  'Admin-only conservative duplicate incident evaluation for an existing sourced report.';

comment on function public.admin_confirm_reports_are_distinct(text,text,text) is
  'Admin-only explicit override for a duplicate candidate after human review. Override expires if incident-defining fields change.';
