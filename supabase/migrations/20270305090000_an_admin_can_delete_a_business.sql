-- There was no way to delete a business anywhere in the product.
--
-- For a real one that is right: nobody should have a button that
-- destroys somebody's stamp cards in one press, and approve, reject,
-- suspend and close cover everything a real business needs. But it also
-- meant a test business could only be removed by hand in the Supabase
-- dashboard, and one of them sat approved and open in the public
-- Bristol directory called "Automation Test Cafe (delete me)".
--
-- So: an admin can delete, and it is made deliberately hard to do by
-- accident. The name has to be typed, and it is checked here rather
-- than only in the browser.

alter table public.audit_logs drop constraint if exists audit_logs_action_check;

alter table public.audit_logs
  add constraint audit_logs_action_check check (
    action in (
      'business_created',
      'business_approved',
      'business_rejected',
      'business_suspended',
      'business_deleted',
      'offer_created',
      'offer_approved',
      'offer_rejected',
      'offer_suspended',
      'invitation_created',
      'invitation_accepted',
      'invitation_revoked',
      'member_role_changed',
      'member_removed',
      'redemption_created',
      'redemption_used'
    )
  );

create or replace function public.admin_delete_business(
    requested_business_id uuid,
    confirm_name text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  target public.businesses;
  summary jsonb;
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
$function$;

revoke all on function public.admin_delete_business(uuid, text) from public, anon;
grant execute on function public.admin_delete_business(uuid, text) to authenticated;
