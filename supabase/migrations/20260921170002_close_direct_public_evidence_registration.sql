-- Evidence registration is performed only by the source-rate-limited
-- public-write-gateway using the service role.

revoke execute on function public.register_public_complaint_evidence(text,text,text,bigint,text)
  from public, anon, authenticated;

grant execute on function public.register_public_complaint_evidence(text,text,text,bigint,text)
  to service_role;
