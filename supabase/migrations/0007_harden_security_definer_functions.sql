-- Security hardening: the domain-enforcement trigger function and the
-- RLS auto-enable event trigger are SECURITY DEFINER and were executable by
-- the anon/authenticated API roles via PostgREST RPC. They are trigger
-- functions (not directly callable in practice), but there is no reason to
-- expose them — revoke EXECUTE from all API-facing roles.
revoke execute on function public.enforce_adt_email_domain() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
