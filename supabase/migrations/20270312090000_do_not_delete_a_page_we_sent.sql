-- Not from here.
--
-- admin_delete_business() takes a business and everything that
-- references it, and it is right to: it exists for test businesses and
-- for a business that asks to be erased. What it never knew about is a
-- preview.
--
-- deleteLeadPreview() and deleteLead() both refuse to leave one
-- orphaned — "A preview is a business and a page of its own, built by
-- hand" — and admin_delete_business() has had no such guard. An admin
-- on /admin/businesses could delete, with no warning, a business whose
-- page we built, published and posted a link to. The link would stop
-- working, the lead would keep pointing at nothing, and the only
-- record would be an audit row.
--
-- It mattered less when a preview was private and rare. There are ten
-- pages out there now, each one emailed to somebody, so it is worth
-- one more check.
--
-- An unclaimed preview only. Once a business has claimed its page it is
-- theirs, and deleting it is exactly the decision this function is for
-- — which is why it already makes you type the name.

create or replace function public.admin_delete_business(
  requested_business_id uuid,
  confirm_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.businesses;
  summary jsonb;
  preview public.business_previews;
begin
  if not public.is_platform_admin() then
    raise exception using
      errcode = '42501',
      message = 'Only a platform admin can delete a business';
  end if;

  select * into target from public.businesses where id = requested_business_id;

  if target.id is null then
    raise exception using
      errcode = 'P0002',
      message = 'That business no longer exists';
  end if;

  -- The typed name, checked on this side. A confirmation that only the
  -- browser enforces is not a confirmation.
  if btrim(coalesce(confirm_name, '')) <> target.name then
    raise exception using
      errcode = 'P0001',
      message = 'The name typed does not match this business';
  end if;

  -- The guard. Named route rather than a flat refusal: there is a
  -- button that does this properly, and it tidies the lead up on the
  -- way out.
  select * into preview
  from public.business_previews
  where business_id = target.id;

  if preview.business_id is not null and preview.claimed_at is null then
    raise exception using
      errcode = 'P0006',
      message = 'This business is an unclaimed preview with a page and a link somebody may be holding. Delete the preview from its lead instead.';
  end if;

  -- Counted before it goes, because afterwards there is nothing left to
  -- count and this is the only record anybody will have.
  select jsonb_build_object(
    'name', target.name,
    'slug', target.slug,
    'offers', (select count(*) from public.offers where business_id = target.id),
    'claimed_vouchers', (
      select count(*)
      from public.offer_redemptions r
      join public.offers o on o.id = r.offer_id
      where o.business_id = target.id
    ),
    'gift_vouchers', (select count(*) from public.reward_vouchers where business_id = target.id),
    'loyalty_cards', (
      select count(*)
      from public.loyalty_cards c
      join public.loyalty_programs p on p.id = c.program_id
      where p.business_id = target.id
    ),
    'followers', (select count(*) from public.business_followers where business_id = target.id),
    'team', (select count(*) from public.business_members where business_id = target.id)
  ) into summary;

  -- Written before the delete, and with no business_id: audit_logs
  -- cascades from businesses, so a record of the deletion that pointed
  -- at the deleted row would delete itself. The id is kept in
  -- entity_id, which nothing cascades from.
  insert into public.audit_logs (actor_user_id, business_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), null, 'business_deleted', 'business', target.id, summary);

  -- Everything that references a business cascades or sets null, so
  -- this is the whole of it: offers, vouchers, cards, photos, posters,
  -- the team, the subscription row. Stripe is cancelled by the caller
  -- first, because once this row is gone the webhook has nothing to
  -- write back to.
  delete from public.businesses where id = target.id;

  return summary;
end;
$$;

revoke all on function public.admin_delete_business(uuid, text) from public, anon;
grant execute on function public.admin_delete_business(uuid, text) to authenticated;
