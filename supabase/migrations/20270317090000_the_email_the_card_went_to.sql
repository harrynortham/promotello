-- The email a guest card went to.
--
-- A guest card moves into an account when the account's email matches
-- the one on the card -- claim_guest_loyalty_cards() does it the next
-- time they open their wallet, stamps and all. That match is the whole
-- mechanism, and until now it was left to the person to retype their
-- own address from memory. Get it wrong and nothing says so: the card
-- still works, it simply never appears in the account, and the stamps
-- sit on a link.
--
-- So the signup page prefills it. It is handed the card token, not the
-- address -- the token is already in the address bar of the page the
-- button was pressed on, so nothing new travels in a URL, nothing is
-- written into browser history, and nothing leaks in a referrer.
--
-- get_guest_loyalty_card() deliberately does not return the email, and
-- that stays true: the card page is readable by anybody holding the
-- link, and the address does not belong on it. This answers one
-- question, for one token, and only while the card is still a guest's.

create or replace function public.guest_card_email(card_token uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select c.guest_email
  from public.loyalty_cards c
  where c.guest_token = card_token
    -- Only an unclaimed card. Once it belongs to an account there is
    -- nothing to prefill and no reason to answer.
    and c.user_id is null
    and c.guest_email is not null
  limit 1;
$$;

comment on function public.guest_card_email(uuid) is
  'The email a guest card was issued to, for prefilling signup. Nothing for a card that already belongs to an account.';

revoke all on function public.guest_card_email(uuid) from public;
grant execute on function public.guest_card_email(uuid) to anon, authenticated;
