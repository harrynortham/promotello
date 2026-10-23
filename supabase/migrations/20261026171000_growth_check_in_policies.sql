-- The business_automations write policy calls business_has_growth(), and
-- policies run as the signed-in user, so they need to be able to call it.
-- It only reveals whether a business is on Growth.
grant execute on function public.business_has_growth(uuid) to authenticated;
