alter table public.public_visit_sessions
  drop constraint if exists public_visit_sessions_no_persisted_coordinates;

alter table public.public_visit_sessions
  add constraint public_visit_sessions_no_persisted_coordinates
  check (
    latitude is null
    and longitude is null
    and accuracy_meters is null
    and location_updated_at is null
  ) not valid;

alter table public.public_visit_sessions
  validate constraint public_visit_sessions_no_persisted_coordinates;
