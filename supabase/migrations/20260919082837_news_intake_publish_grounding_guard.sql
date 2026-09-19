create or replace function public.guard_sourced_report_publish_readiness()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
declare
  v_duplicate jsonb;
begin
  if new.origin_type = 'sourced_report'
     and new.status = 'published'
     and old.status is distinct from 'published' then

    if coalesce(new.custom_field_answers->>'newsIntakeReviewRequired','false') = 'true' then
      raise exception 'SOURCE_GROUNDING_REVIEW_REQUIRED: This sourced report is flagged for source-grounding review before publication.'
        using errcode='22023';
    end if;

    v_duplicate := public.evaluate_sourced_report_duplicate_internal(new.id);
    if coalesce(v_duplicate->>'status','clear') <> 'clear' then
      raise exception 'SOURCE_DUPLICATE_REVIEW_REQUIRED: Current duplicate evaluation requires review before publication.'
        using errcode='22023',
              detail = left(v_duplicate::text, 2000);
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_guard_sourced_report_publish_readiness on public.complaints;
create trigger trg_guard_sourced_report_publish_readiness
before update of status on public.complaints
for each row
execute function public.guard_sourced_report_publish_readiness();

revoke execute on function public.guard_sourced_report_publish_readiness()
from public, anon, authenticated, service_role;
