-- An email knows who it is writing to.
--
-- business_manager_emails() returns addresses and nothing else, so every
-- email to a business opens with no name — while the two that do have
-- one (the sign-up reminder, the customer welcome) read noticeably
-- better for it.
--
-- A sibling rather than a change: four places call the array version and
-- none of them needs names, so leaving it alone is one less thing that
-- can go wrong on a deploy.
--
-- The name is whatever they told us. Nobody is made to give one, so
-- every caller has to read null as "no greeting" rather than as a gap to
-- fill with something.

create or replace function public.business_manager_contacts(requested_business_id uuid)
returns table (email text, full_name text)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.email::text,
    nullif(btrim(coalesce(u.raw_user_meta_data ->> 'full_name', '')), '')
  from public.business_members m
  join auth.users u on u.id = m.user_id
  where m.business_id = requested_business_id
    and m.role in ('owner', 'admin')
    and u.email is not null;
$$;

comment on function public.business_manager_contacts(uuid) is
  'Who to write to about a business, with their name where they gave one. The service role only: it reads auth.users.';

revoke all on function public.business_manager_contacts(uuid) from public, anon, authenticated;
grant execute on function public.business_manager_contacts(uuid) to service_role;
