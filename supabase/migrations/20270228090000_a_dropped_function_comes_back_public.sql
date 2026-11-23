-- Postgres grants EXECUTE to PUBLIC on every new function. The previous
-- migration dropped these two to change their return type and granted
-- the roles it wanted back -- which read like it was setting access, and
-- was only adding to a default that had already let everyone in.
--
-- issue_automation_vouchers is SECURITY DEFINER and inserts. Called with
-- no arguments it runs the whole batch for every Growth business, issues
-- vouchers and causes email to go to real customers, so anon holding
-- EXECUTE on it is the serious half.
--
-- Revoking from PUBLIC is the part that does the work: granting to
-- service_role alone never removes what PUBLIC already has.

revoke all on function public.issue_automation_vouchers(uuid, uuid) from public;
revoke all on function public.issue_automation_vouchers(uuid, uuid) from anon, authenticated;
grant execute on function public.issue_automation_vouchers(uuid, uuid) to service_role;

revoke all on function public.staff_get_reward_voucher(text) from public;
revoke all on function public.staff_get_reward_voucher(text) from anon;
grant execute on function public.staff_get_reward_voucher(text) to authenticated, service_role;
