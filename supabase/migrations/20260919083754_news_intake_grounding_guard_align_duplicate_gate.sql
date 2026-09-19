create or replace function public.guard_sourced_report_publish_readiness()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
begin
  if new.origin_type = 'sourced_report'
     and new.status = 'published'
     and old.status is distinct from 'published'
     and coalesce(new.custom_field_answers->>'newsIntakeReviewRequired','false') = 'true' then
    raise exception 'SOURCE_GROUNDING_REVIEW_REQUIRED: This sourced report is flagged for source-grounding review before publication.'
      using errcode='22023';
  end if;

  return new;
end;
$function$;

revoke execute on function public.guard_sourced_report_publish_readiness()
from public, anon, authenticated, service_role;
