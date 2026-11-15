# The launch funnel: preview email to paying business

Written 15 November 2026, from reading the whole path through the code
rather than from the plan. The roadmap says what we are building and
`docs/OUTREACH.md` says how a street becomes a list. This is the bit in
between: what happens to one business from the email landing to the card
being charged, where it leaks, and what to do about it.

## Where we actually are

`business_previews`: five built, **zero marked contacted**. Not one
outreach email has gone out, so this funnel has never carried a real
business.

That decides what kind of work is worth doing. With fifty businesses on
one road there will never be enough volume to A/B anything — a 10%
difference in a conversion step is five businesses, which is noise. The
only winning move is to take friction out before it costs anything,
because a shop that bounces off the first email is not coming back for
the second version of it.

## The shape of the problem

The positioning is right and the copy agrees with itself: the marketing
site, the outreach email and the preview page all say *turn first-time
visitors into regulars*, with the directory as the thing a loyalty app
can't copy. That is rarer than it sounds and none of what follows
touches it.

The leak is in the middle:

> **Everything that proves the pitch is on the far side of a card form,
> and the pitch itself evaporates the moment they claim.**

## The five, in order

### 1. The trial asks for a card before they have seen it work

`billing/actions.ts` creates Checkout with `trial_period_days` and no
`payment_method_collection`, so Stripe defaults to `always`. The loyalty
card — the half of the pitch that does the selling — is Pro only
(`lib/plan-features.ts`, the locked builder on the loyalty page,
`enforce_loyalty_plan`). So the path reads:

cold email → claim → set up seven things → wait for approval → **enter
card details** → finally see the stamp card you were sold.

`lib/business-lifecycle.ts` already spends four separate sentences
defending this ("We ask for a card when you start, but don't charge
it…"). Copy defending a mechanism is the mechanism telling you it is
wrong.

**Do:** `payment_method_collection: "if_required"` with
`trial_settings.end_behavior.missing_payment_method: "cancel"`. The
trial-ending email becomes a better email: *add a card to keep your card
running*. Card-up-front converts better per trial **started** — and that
is the wrong trade with no brand, no reviews and fifty shots. Get them
inside, then earn the card with their own numbers.

### 2. The offer we sold them does not exist when they arrive

`sample_offer`, `sample_reward` and `sample_stamps` appear in the admin
form, on the preview page, and in the migrations. **Nowhere else.** They
are never turned into anything.

So a business reads "2 for 1 on coffee, 9 stamps for a free flat white",
thinks *yes, that's us*, presses Claim — and lands on an empty dashboard
with a seven-step checklist asking it to invent an offer. The persuasion
and the product are disconnected at the moment of highest intent. The
outreach email promises "about two minutes to make it yours"; the
checklist is seven steps and a wait.

**Do:** carry the sample through to the dashboard and into the two
builders, so the first screen says *this is the offer from your email*
and the form opens with it already in. Not a row inserted behind their
back: an offer needs a description, terms and an end date, and inventing
those puts words in their mouth on a public page. Prefilled and one
press from live is the honest version of one click.

### 3. Nothing tells a business its first customer arrived

`FUNNEL_STEPS` records `first_qr_scan` and `first_customer_action` — for
the admin funnel page only. Every caller of `notifyBusinessManagers` is
an approval, an expiry, a stock alert or a billing problem. **Not one is
good news about a customer.**

A business on Free finds out it is working by going to look. The most
persuasive message we will ever send is *someone just scanned your
poster and claimed your offer*: free, true, and it arrives while they
are still deciding whether any of this is real. It is also the only
honest place for the Pro pitch — *that's one; a stamp card is how they
come back.*

**Do:** one notification and one email, once, on the first customer
action.

### 4. The proof that converts is behind the highest paywall

The monthly report and the first-visit/repeat split are Growth only. The
roadmap calls that split "the number nobody else can print… worth more
than every parked feature put together", and the business that needs it
most is the Free one deciding whether to pay.

**Do:** give Free and Pro a short monthly "here's what happened, and how
many came back". Keep segments, exports, automations and quiet hours on
Growth. **Charge for the actions, never for the proof.**

### 5. Approval sits exactly where enthusiasm peaks

`businesses.approval_status` defaults to `pending` and
`claim_business_preview` does not touch it. A business whose page **we
built and vetted ourselves** still has to finish a checklist, press
"Send your page for review", and wait for us.

**Do:** approve a claimed preview on claim. Keep review for cold
self-signups. It takes a dead day out of the most fragile part of the
funnel, and it removes the one checklist step the business cannot do
anything about.

## Cheaper, still worth it

- **No social proof, honestly handled.** `/business/testimonials`
  redirects because there is nothing real to show, which is the right
  call. The honest substitutes are a founder guarantee in the outreach
  email and the first three names on the wall as soon as they exist.
- **No concierge offer anywhere.** There is no "send me your logo and
  I'll build it". At fifty businesses that is the highest-converting
  asset there is, and it costs an afternoon a week.
- **Free is the weak half of the pitch**: a listing in a directory that
  is currently empty. Fixing 1 mostly solves this. If it doesn't, cap a
  free card at about twenty holders rather than blocking it.
- **Founding scarcity is on the pricing page and in the emails, never on
  the preview page they actually land on.** The live count belongs next
  to Claim.

## What not to touch

The positioning, the outreach copy, the PECR discipline in
`docs/OUTREACH.md`, the refusal to invent testimonials, and the decision
to park scratch-to-win, SMS and NFC. The temptation before a launch is
to re-open settled questions instead of doing the five above.

## The number to watch

**Claim → first customer action**, not claim → paid. Everything here
bets that a business's own customers do the selling. If that median is
days, the pricing will take care of itself. If it is weeks, we have a
poster-in-the-window problem rather than a pricing problem, and the
answer is 2 and 3 rather than the price.

## Progress

- [x] 1 · Card-less trial
- [ ] 2 · The sample offer and card follow them in
- [ ] 3 · The first customer is told to the business
- [ ] 4 · Proof on Free and Pro
- [ ] 5 · A claimed preview is already approved
