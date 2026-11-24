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

**Do:** ~~approve a claimed preview on claim~~ — wrong, and worth saying
why: the claim button promises "Free, and nothing goes public until you
say so", and that promise is the reason it is safe to press. So take the
wait rather than the choice. **Sending** a page we built is the moment it
goes live, provided the profile is the five things the send button is
locked behind. A cold sign-up has never been read by anyone and still
queues. It takes a dead day out of the most fragile part of the funnel
without taking the decision off the business.

**Done, and then taken further — November 2026.** The above shipped and
kept the button, which was still a step a business had to take and the
one step on the list it could do nothing about. The button is gone now
(`20270123090000_the_queue_fills_itself.sql`): a page joins the queue
by itself once it has the three things that make a listing — a
description, an address and hours. The claim is the acceptance for a
page we built (`20270124090000`), so the promise above was changed
rather than quietly broken: the claim button now says the page goes
live as soon as they claim it, because we wrote it and checked it
before we sent it.

The claim path asks for two of those three, not all of them
(`20270128090000`). It wanted hours as well, and `/admin/previews/new`
has never collected any — so for every preview built the normal way the
claim quietly took the "incomplete, stay a draft" branch, and the page
the business had just been promised was live sat pending and unqueued.
Hours decide whether a listing is thorough, not whether a page we wrote
is fit to be seen, and the owner adds them in setup a minute later. The
cold sign-up path still wants all three, because there the rule is
deciding when a draft is worth a reviewer's time.

Approval decides one thing now, and only that: whether it is public.
Everything else is open while we check — offers, the loyalty card, QR
posters (`20270125090000`) and the trial. A scan of a poster put up
early says the business is on its way, by name. The guarantee that
makes it safe is in the database rather than in a page, and
`tests/e2e/approval-only-gates-the-public.spec.ts` holds it there.

## Cheaper, still worth it

- ~~**No social proof, honestly handled.**~~ Done, except the part we
  cannot do yet: `/business/testimonials` still redirects, because there
  is nothing real to show and inventing it is out. The substitute is in
  the outreach email — `ownNumbers()` in `preview-shared.ts`, which
  points at the one number they can check themselves rather than at a
  promise they would have to trust. Deliberately not a refund: a refund
  has to be adjudicated, and "nobody came in through it" is a judgement
  two people read differently, while "Promotello sent you 41 first-time
  customers" is a number on their own screen. It is only true because
  item 4 put that number on every plan. The first names on the wall go
  up when they exist.
- ~~**No concierge offer anywhere.**~~ Done: on the preview page under
  the plans, and in the welcome email. "Send us a photo of your shop and
  your hours and we'll finish it for you." At fifty businesses it costs
  an afternoon a week and converts better than any feature.
- **Free is the weak half of the pitch**: a listing in a directory that
  is currently empty. Fixing 1 mostly solves this. If it doesn't, cap a
  free card at about twenty holders rather than blocking it.
- ~~**Founding scarcity is never on the preview page.**~~ Done: the live
  count sits next to Claim, from `lib/founding-places.ts`, and appears
  only once some have gone — "50 of 50 left" tells them nobody has
  taken it.

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

## Pages first

Added 24 November 2026, and it changes the first step rather than the
funnel's shape.

Everything above starts with an email about a page nobody else can see.
A preview is private by design: the business stays `pending`, so RLS
hides it from every listing, and the only way in is the token we post
them. That works, and it leaves the directory empty until businesses
start saying yes — which is backwards, because the directory is the
thing that makes saying yes worth it.

So a lead's page goes up **before** we contact them, and the sale becomes
"claim your free page". A street can be live in a day.

`listed_at` on `businesses` is the whole mechanism
(`20270307090000_a_page_before_they_claim_it.sql`), and it does not touch
approval. A listed business is still `pending`, which matters more than
it looks: `offers_public_select_approved` and
`loyalty_programs_public_select` both require an approved business, and
neither was changed. **An unclaimed page cannot serve an offer or a
loyalty card to a visitor even if a page asked it to.** That is a
property of the database, not a rule somebody has to remember in a
component.

What a visitor gets is what we knew before we ever spoke to them: the
name, the category, where it is, and a map. No follow button, no offers
section, no card.

| | Who sees it | What is on it |
| --- | --- | --- |
| Not listed | Its own team, admins | The preview, as before |
| Listed, unclaimed | Everybody | Name, category, address, map, and the claim panel |
| Claimed and approved | Everybody | The page, offers and card included |

Three things are worth knowing:

- **Where it appears.** In the directory, the area and category pages and
  the search, badged "Not claimed yet", and in the sitemap, because an
  owner searching their own business name and finding the page we built
  is the whole point. `byDirectoryOrder()` keeps it below every claimed
  business: publishing forty pages in an afternoon makes forty rows
  newer than everything else on the site, and newest-first alone would
  hand them the entire first screen.
- **How somebody claims one.** The button does not claim anything. It
  files a `page_claim_requests` row through a definer function — anon can
  ask, and cannot read back a thing — and an admin releases the page from
  the lead, which mints a fresh token and emails the claim link to the
  address on the request. The secret token is still the only thing that
  hands a page over, so a page cannot be taken by someone who can type
  its name. Three open requests per page, one per email address.
- **How one comes down.** `unlist_lead_page()`, from the lead. For a
  business that asks and for a page we got wrong. Once a page is claimed
  and approved, taking it down is a suspension instead, so its owner is
  told why.

Publishing refuses a page with no description or no address — the same
bar `claim_business_preview()` uses — because fifty names on empty
screens is how a new site teaches Google to ignore it.

**A street at a time.** One page per press turned out to be ten clicks
on the first street, so `/admin/sales` publishes the lot
(`20270309090000_a_whole_street_in_one_press.sql`). Two functions, and
only one of them decides anything: `lead_pages_to_publish()` is
read-only and feeds the confirmation, and `list_lead_pages()` does it by
calling `list_lead_page()` per business — still the only thing that sets
`listed_at`, and still the thing that refuses a page with nothing on it.

Each business is its own block, so one that is refused comes back as a
reason beside its name and the other nine still go live. The
confirmation names every page before it goes up, and the banner
afterwards names what was skipped.

## Built, but unlisted until claimed

A page goes up before we contact them, and it is **not** published.

It exists at the address it will keep for good, it loads for anyone with
the link, and it is in no listing, no search on this site and no index
until its business claims it. One rule, three surfaces:

| | |
| --- | --- |
| The directory, areas, categories, search | `getPublicBusinesses()` drops anything not approved |
| The sitemap | `worthIndexing()` in `app/sitemap.ts` |
| The page's own `robots` | `worthIndexing()` on the business page |

That is the whole of `lib/indexing.ts`, which exists to say it in one
place rather than to decide anything clever.

**Why not published.** The first ten went up listed and indexable, and
two things followed within the afternoon. Ten pages carrying a name, a
category, one sentence and a map are thin, and thin is judged site-wide
rather than page by page — the same mechanism at five hundred pages is
a problem that takes months to undo. And publishing a page about a real
business that has not been asked is a thing to be sure about, not a
thing to discover you are doing.

Unlisted answers both outright. There is nothing for Google to judge,
and nothing in front of anybody who was not sent it.

**What it gives up:** the directory no longer fills before businesses
join, and nobody finds their own page by searching for themselves. That
was the argument for publishing, and it is a real loss.

**What it keeps:** the page is real, at its permanent URL, with their
name, category, address and map on it. "I could build you one" and
"here it is, it's yours, nobody can see it but you" are not the same
conversation. The second is what the email and the doorstep now say.

**What the outreach says.** Never that the page is live, because it is
not. `isBuilt()` branches every piece — a lead whose page has not been
built is still a preview — and the built version leads with the fact and
then the offer:

> I've built Little Loaf a page on Promotello. Here it is: …
>
> Nobody else can find it yet. It's not in the directory or on Google
> until you claim it.
>
> Claim it and you're on the Gloucester Road page of the Bristol
> directory, where local people can find you…

A test holds it to that, including that it never says "already live".

**Hours and Instagram** are still worth having on the page — it is the
thing a business is being shown — and **Fill it in from their site**
reads their own website for published hours and copies the handle
across. Hours come from their site rather than Google, whose policies
permit storing nothing but the `place_id` (`lib/google-places.ts`), and
only from structured JSON-LD. Of the first ten, not one of the eight
with a website published any, which is worth knowing before relying on
it.

## Progress

- [x] 1 · Card-less trial
- [x] 2 · The sample offer and card follow them in
- [x] 3 · The first customer is told to the business
- [x] 4 · Proof on Free and Pro
- [x] 5 · A claimed preview goes live when they claim it, and nothing is
  sent by hand at all
