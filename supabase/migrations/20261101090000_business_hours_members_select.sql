-- Members couldn't read their own opening hours until the business was
-- approved: business_hours only had the public policy. Saving the edit form
-- upserts the hours, and an upsert's new rows must also pass a SELECT
-- policy, so every pending business failed with "new row violates
-- row-level security policy". Matches business_locations_select_members.

drop policy if exists business_hours_select_members on public.business_hours;

create policy business_hours_select_members
  on public.business_hours
  for select
  to authenticated
  using (public.is_business_member(business_id, 'member'));
