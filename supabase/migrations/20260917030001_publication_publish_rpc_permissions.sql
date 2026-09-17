-- Preserve the existing moderation RPC exposure after recreating admin_publish_complaint
-- with optional public-presentation arguments. Publishing remains authenticated-only.

REVOKE ALL ON FUNCTION public.admin_publish_complaint(text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_publish_complaint(text, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_publish_complaint(text, text, text, text, text) TO authenticated;

-- Public report reads remain intentionally available to both anonymous and signed-in visitors.
GRANT EXECUTE ON FUNCTION public.get_public_published_reports() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_published_report(text) TO anon, authenticated;
