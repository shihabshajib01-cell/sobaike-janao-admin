-- Final cutover: all anonymous public mutations must pass through public-write-gateway.
revoke all on function public.submit_public_complaint_v2(jsonb,text,jsonb)
  from public, anon, authenticated;
revoke all on function public.submit_public_complaint_v3(jsonb,text,jsonb)
  from public, anon, authenticated;
revoke all on function public.submit_public_configured_complaint(jsonb,text,jsonb)
  from public, anon, authenticated;
revoke all on function public.submit_public_response_v2(text,text,jsonb,text,text)
  from public, anon, authenticated;
revoke all on function public.track_public_report_engagement(text,text,text,text)
  from public, anon, authenticated;
revoke all on function public.record_public_visit_session(
  text,text,text,numeric,numeric,numeric,text,text,text,text,text,text,text,integer,integer,text
) from public, anon, authenticated;

grant execute on function public.submit_public_complaint_v2(jsonb,text,jsonb) to service_role;
grant execute on function public.submit_public_complaint_v3(jsonb,text,jsonb) to service_role;
grant execute on function public.submit_public_configured_complaint(jsonb,text,jsonb) to service_role;
grant execute on function public.submit_public_response_v2(text,text,jsonb,text,text) to service_role;
grant execute on function public.track_public_report_engagement(text,text,text,text) to service_role;
grant execute on function public.record_public_visit_session(
  text,text,text,numeric,numeric,numeric,text,text,text,text,text,text,text,integer,integer,text
) to service_role;
