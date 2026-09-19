-- Keep Admin-only location helpers out of the anonymous Data API surface.
-- Both functions retain their internal active-admin authorization checks; authenticated
-- callers still need those checks to pass.

revoke execute on function public.admin_get_location_taxonomy()
from anon;

revoke execute on function public.admin_resolve_news_intake_location(text, text)
from anon;
