-- businesses_with_growth went out callable by anon.
--
-- The migration that made it did revoke from public, which is the rule
-- written down in docs/ENVIRONMENTS.md after #404 -- and the rule was
-- incomplete. Supabase keeps an `alter default privileges ... grant
-- execute on functions to anon, authenticated, service_role` on the
-- public schema, so a new function is granted to those three roles by
-- name the moment it is created. Revoking from PUBLIC removes the
-- pseudo-role's grant and leaves anon's own, untouched.
--
-- It is security definer, so it reads subscriptions past RLS. Business
-- ids are public -- they are in URLs -- so anybody could have asked
-- which of them are paying for Growth. Nothing about a customer, and
-- no money, but it is our customers' commercial information and it was
-- never meant to leave the wallet that asks.

revoke all on function public.businesses_with_growth(uuid[]) from public, anon;
grant execute on function public.businesses_with_growth(uuid[]) to authenticated, service_role;

-- The same default privileges reach views. This one is security
-- invoker, so anon already selected nothing from it -- RLS asks who is
-- calling and anon is nobody. Taken away anyway: a view that needs a
-- signed-in caller should say so, rather than rely on the policies
-- underneath staying as they are.
revoke all on public.business_voucher_history from anon;
grant select on public.business_voucher_history to authenticated;
