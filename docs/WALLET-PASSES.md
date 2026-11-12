# Wallet passes

Apple and Google Wallet passes are Phase 1, still to build (docs/ROADMAP.md).
A pass is a copy of a loyalty card living in somebody's phone; `loyalty_cards`
stays the only truth, and the pass is caught up by push whenever that row
changes. This is what the card already does for it, and what is left.

## Already there

- **`loyalty_cards.updated_at`**, kept by the shared `set_updated_at` trigger
  (`20261227090000_a_card_says_when_it_changed.sql`), with an index on it.
  Both platforms update a pass by asking which cards have changed since the
  last time they asked; this is the answer. Every way a card can change is an
  update inside a SECURITY DEFINER function, so the trigger catches all of
  them.
- **One place a card changes in the app.** `app/stamp/[code]/actions.ts` is the
  only caller of `add_loyalty_stamp()` and `redeem_loyalty_reward()`, and they
  hand back what the press did — `card_full`, `card_finished`,
  `issued_card_id`, `issued_is_new` — not just the row. The push belongs
  beside `tellThemAboutTheNewCard()` in `lib/loyalty-handover.ts`, which
  already runs there for the in-app notification. Not from the database: it
  has no network and no secrets.
- **`finished_at`** is the end state a pass needs — Apple's `expirationDate`
  or `voided`, Google's `state: EXPIRED` — so a closed card's pass stops
  claiming stamps it cannot take
  (`20261226090000_a_closed_card_gets_one_last_lap.sql`).
- **A handover is a new serial.** When a closed card fills, the customer is
  given a card on the open programme: a new row with a new `card_code`. That
  is what both platforms expect — a pass's serial is never rewritten. Void the
  old pass, issue the new one, both keyed on `issued_is_new` so it happens
  once.
- **Guests are not a special case.** A pass belongs to a card, not an account;
  a guest card carries its own `guest_token` and gets handed over the same way.
- **Realtime** already publishes `loyalty_cards`
  (`20261225090000_a_card_stamps_itself.sql`), if pushing from a worker on the
  change feed suits better than pushing from the request.

## Left to build

### The registrations table

Apple's web service protocol needs a row per device per pass: device library
identifier, push token, pass type identifier, serial number, and the
authentication token the pass was signed with. Google's is lighter but wants
the object id. Written only by the route handlers that Apple calls, with the
service role, and read by nothing else: no customer-facing policy, the way
`notifications` has no insert policy.

The two queries it exists for are "which devices hold this pass" and "which
serials changed since this tag" — the latter is a join to
`loyalty_cards.updated_at`, which is indexed.

### A pass that has to disappear

`claim_guest_loyalty_cards()` is the one place a card row goes away: when
somebody signs up with the email they used as a guest and already holds a card
on that programme, the guest row is merged into it and deleted. The surviving
card's `updated_at` moves on its own, so its pass catches up — but the deleted
one's pass is orphaned in a phone, and by the time anything notices, the serial
is gone.

So capture it before the delete: a `before delete` trigger on `loyalty_cards`
writing the serial to a small removals table the push worker drains, or the
same thing in the claim function itself. Worth building with the registrations
table rather than after it.

### Multi-stamp

When `add_loyalty_stamp()` takes a quantity (a round of three coffees, three
stamps), a closed card must **clamp at `stamps_required`** — add
`least(quantity, stamps_required - stamps)` — rather than raise `P0008`. The
refusal is only right for a card that is already full; refusing a scan that
would merely overshoot would leave somebody a stamp short of the reward they
have earned. The handover then fires exactly as it does now, on the stamp that
fills it.
