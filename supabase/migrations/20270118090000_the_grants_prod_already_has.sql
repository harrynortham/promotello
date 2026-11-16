-- The grants prod already has.
--
-- Found by the first `supabase db diff --remote` ever run against the
-- live project (docs/ENVIRONMENTS.md): prod is tighter than these files
-- describe, on two tables, and nothing records why.
--
-- Prod today:
--
--   account_notification_settings   authenticated = INSERT, SELECT, UPDATE
--                                   anon = nothing
--   contact_form_rate_limits        anon and authenticated = nothing
--
-- A database built from these files gets neither. New tables in public
-- are granted everything to anon and authenticated by default on this
-- platform, so both tables come out fully writable through the Data API
-- — which is what the local copy has right now.
--
-- RLS is what actually guards them, and it is on for both: the settings
-- table has three policies, and the rate-limit table has none at all,
-- which denies everybody who is not the service role. So nothing was
-- exposed. This is the second layer that prod has and the files did
-- not, and it belongs in the files so a rebuild keeps it.
--
-- On prod this changes nothing; it is already in this state.

revoke all on table public.account_notification_settings from anon;
revoke all on table public.account_notification_settings from authenticated;
grant insert, select, update on table public.account_notification_settings to authenticated;

revoke all on table public.contact_form_rate_limits from anon;
revoke all on table public.contact_form_rate_limits from authenticated;
