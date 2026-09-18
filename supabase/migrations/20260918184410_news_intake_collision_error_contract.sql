create or replace function public.guard_automated_sourced_report_collision()
returns trigger
language plpgsql
set search_path to 'pg_catalog','public'
as $function$
begin
  if new.origin_type='sourced_report'
     and coalesce(new.custom_field_answers->>'automatedIntake','false')='true'
     and exists(
       select 1
       from public.complaints c
       where c.origin_type='sourced_report'
         and c.status in ('submitted','published','unpublished','edited')
         and c.subcategory_id=new.subcategory_id
         and c.incident_date=new.incident_date
         and public.normalize_duplicate_text(c.district)=public.normalize_duplicate_text(new.district)
     ) then
    raise exception 'DUPLICATE_REVIEW_REQUIRED: Automated sourced report collides with an existing same-category, same-date, same-district report.'
      using errcode='P0001';
  end if;
  return new;
end;
$function$;

revoke all on function public.guard_automated_sourced_report_collision() from public,anon,authenticated;
