-- Restore the hardened legacy submission surface after the Bribery contract migration
-- recreated submit_public_complaint and re-granted direct execution.
-- The Public client submits through submit_public_complaint_v2; that active RPC is intentionally unchanged.

REVOKE EXECUTE ON FUNCTION public.submit_public_complaint(jsonb, text, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.submit_public_complaint(jsonb, text, jsonb) FROM PUBLIC;
