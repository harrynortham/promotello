# Promotello Product Roadmap

Gates are results, not dates: track B before the trail, 10 live businesses on one
street before a second one. Oct 23, 2026, re-cut 16 Nov 2026 · @Harry

## Summary

Promotello sells a local business one thing: **customers it can see us send, and
proof of how many came back.** A directory people browse, offers they claim on
their phone, posters in the window, and a stamp card that brings them back —
with attribution running through all four.

**The shift, 16 November 2026.** The plan below used to be a loyalty-card build
plan with a directory attached. Four of the five "build next" items were card
features, and the order they were in came from a comparison with Stamp Me that
the Positioning section already says we should refuse. That has been re-cut. The
card is one of several things that bring a customer back. It is not the product,
and it is no longer the spine of the roadmap.

**What is:** can we prove we sent them, is there anyone to send, and do they come
back. See [The four tracks](#the-four-tracks).

**What we are not:** a digital loyalty card app. That category is a dozen vendors
deep, several under £15 a month and some free. A feature-for-feature fight there
is unwinnable, and winning it would only earn the right to sell a £24 product
into a £10 market.

## Where we are today

Updated 16 November 2026. The business side is close to finished. The consumer
side barely exists, and nothing has been sold.

| | Count |
| --- | --- |
| Outreach emails sent | **0** |
| Paying businesses | 0 |
| Customer accounts | 8 |
| Offers claimed, ever | 5 |
| Claims that became a visit | 2 |
| People following a business | 1 |

Those are the only numbers that matter and they are all about zero. Roughly 500
commits have gone in since October. **The product is not what is behind.**

Two things follow, and they are the organising facts of everything below.

**First: the funnel has never carried a real business.** Five findings from
reading it end to end were fixed in November — see
[docs/LAUNCH-FUNNEL.md](LAUNCH-FUNNEL.md) — but fixed against a funnel nobody has
walked. Until previews go out, every further change to it is a guess.

**Second: there is no demand side.** One follower and five claims is not a cold
start, it is an empty room. The pitch, the pricing, the guarantee and three of
the roadmap's own claims all assume customers browsing a directory. Nothing in
the old plan built a reason for a single customer to come back to Promotello a
second time. That is the largest hole in the product, and it was not on the list.

## What the model actually is

Worth stating plainly, because the build plan now follows from it rather than
from a competitor table.

A business pays us because **we can show it customers it would not otherwise
have had.** Everything else is in service of that:

- the **directory, SEO pages and posters** are how a stranger finds them;
- the **offer** is why the stranger walks in;
- the **card, followers and automations** are why they come back;
- the **attribution report** is the receipt, and it is what gets renewed.

The sales promise now says so out loud: *"your dashboard shows how many customers
Promotello actually sent you, and if that's zero after a month, tell me and we'll
sort it out"* (`ownNumbers()` in `app/admin/previews/preview-shared.ts`). We have
staked the pitch on attribution. The roadmap should be staked on it too.

**The test for any feature below:** does it increase the number of customers we
can prove we sent, make that number more trustworthy, or make the business see
it? If not, it is a nice-to-have, whatever the competitor table says.

## Strategy: solving the cold start

We win by making Promotello useful to one business on its own, then letting the directory grow out of the customers they bring. A new marketplace has no consumers, so "get discovered" can't be promised on day one. "Keep your customers coming back" can.

&#91;embedded content: growth loop · 4 steps\]

The loop starts at step 1, the step a business pays for. Steps 2 to 4 cost us nothing once the tools are in shops.

Three rules follow from this:

1. **Standalone value first.** Every Phase 1 feature has to work for a business even if no other business in Bristol uses Promotello.
2. **Density over reach.** 50 businesses on Gloucester Road beat 500 scattered across the UK. A customer who joins at one café needs to see ten more nearby.
3. **Sell to groups as well as shops.** Business Improvement Districts and traders' associations can bring dozens of members in one deal.

## Positioning: what a loyalty app can't copy

Added 9 November 2026, after searching "digital loyalty card" and finding
Promotello behind a dozen cheaper tools on features. That comparison is the
wrong one, and this section says why and what follows from it.

### The asymmetry

Every one of those tools sells software to **one shop**. The card only ever
reaches people who already walked in; the shop brings its own customers and the
software counts them. None of them has a demand side, and none of them can
easily get one, because a demand side is local density — slow, unglamorous, and
not something a competitor ships in a quarter.

Promotello already has one: the directory, areas and categories, followers,
new-offer emails, SEO pages and a customer wallet. **That is the moat.** Wallet
passes are not a moat; they are table stakes.

### Keep two, park the rest

The October competitor analysis below is accurate, but acting on all of it would
turn the build plan into parity with Stamp Me and Loopy — a plan to lose slowly
to cheaper specialists. Split that list in two:

- **Friction, not features — build these.** Wallet passes and joining without an
  account. Neither is a spec-sheet item: they decide whether the card is used at
  all, because a signup form at a busy till kills the product. Card design,
  multi-stamp and the switching kit come with them: cheap, and they close deals.
- **Feature depth — park it.** Scratch-to-win, SMS credits, NFC hardware,
  spend-based points, VIP tiers, reward ladders, multiple cards, Zapier. Every
  one of these invites a buyer to compare Promotello with a loyalty specialist
  on a spec sheet, which is the comparison we lose. Build them only if a paying
  business asks twice.

### The three claims only Promotello can make

1. **The card is an acquisition asset, not just a retention one.** Every
   competitor's card is invisible to anyone who isn't already a customer. Ours
   is on a public business page, in area and category pages, on a poster in the
   window — so someone deciding whether to try a café can see "5 stamps = a free
   coffee" and join **before** their first visit. Half built already
   (`loyalty-callout.tsx`, `loyalty-join.tsx`, the loyalty poster). What's
   missing is loyalty in the listings and filters: *shops near you with a card
   worth joining*.
2. **One wallet for the street.** The customer pain in digital loyalty is
   fragmentation — a pass per shop, an app per chain. One place holding every
   independent nearby means each business signed makes the consumer product
   better for every other business. Nothing single-tenant has this loop.
3. **Attributed repeat visits — the number nobody else can print.** *"Promotello
   sent you 41 first-time customers this quarter. 12 came back. 5 are now
   regulars."* No loyalty app can produce the first number, because it never had
   the first visit. Repeat visit rate and cross-visits are already tracked in
   admin; turned into a monthly report with a first-visit split, this is both the
   sales asset and the churn defence — worth more than every parked feature
   above put together.

### Known precedent, and what it means for the BID pitch

City-wide loyalty is proven at the *place* level. [Mi Rewards](https://mi-cnx.com/news/13-benefits-of-mi-rewards-the-smart-solution-to-town-and-city-loyalty)
has run it since 2018 in [around ten UK towns](https://thewisemarketer.com/retail/town-and-city-loyalty-programme-mi-rewards-expands-across-the-uk/)
— Perth, Gloucester, Stoke, Kirkcaldy — [free to the businesses](https://www.gloucesterbid.uk/news/mi-rewards-gloucester-earn-points-and-get-rewarded-for-shopping-local/)
and funded by the BID, using [card-linked](https://fidelapi.com/stories/miconex)
points that go into prize draws.

That validates the appetite and warns against walking into Bristol BID pitching
the same thing. Theirs is card-linked prize draws sold to councils; ours is
stamps, offers and a directory sold to shops, with the BID as a route to many
shops at once. Different buyer, different mechanic — say so explicitly in that
meeting.

### The honest caveat

All three claims above depend on density we don't have yet. The cross-business
layer is a *consequence* of the Gloucester Road grind, not a shortcut past it,
so rule 1 above ("standalone value first") still holds: until a street has ten
live businesses, the single-shop card has to be excellent on its own.

Which is why **"a card is a promise"** stays. In a market of configurators where
the deal can be edited under the customer, a card that cannot be changed once
someone holds it is a trust position, not a missing feature. Don't let the parity
list talk you out of it.

## The four tracks

Replaces the old phase table. Four questions, in dependency order: **B** feeds
**A**, **A** is what we sell, **C** is why they renew, **D** is how any of it
reaches a business. Each track has a gate — a result, not a date.

### A · Can we prove we sent them?

This is the product's centre now and it is thinner than the pitch implies.

| | What | Why it matters | Notes |
| --- | --- | --- | --- |
| A1 | **Harden what counts as "sent by Promotello"** | It is the number we guarantee on, and today it under-reports the flow our own posters create | `sentByPromotello` only counts a claim or join **an hour before** the first visit. A stranger who scans a window poster and walks straight in is the poster working, and is counted as nothing. Needs a scan-then-visit window and a written definition the business can read |
| A2 | **A first visit without a claim** | Most people who find a business through us never claim anything — they just turn up | Today an attributed visit requires a voucher or a stamp. A directory view or a poster scan followed by a card join is evidence too. Decide what we will and will not claim, and say it on the analytics page |
| A3 | **The business sees the number without being emailed** | A monthly email is a reminder; the dashboard is where they go when they wonder | Done for the monthly report (now on every plan). The dashboard panel exists; it needs the same prominence as the counts above it |
| A4 | **Attribution for walk-ins staff can record** | Barbers and salons book by phone; nothing we track sees that visit | A one-tap "came from Promotello" on the staff screen. Low effort, and it is the only way some trades ever show a number |

**Gate:** a business can open its dashboard and read a number it believes, and we
would be comfortable showing that same number to the business next door.

### B · Is there anyone to send?

The hole. Nothing here existed on the old plan, and it is the half the pitch
assumes.

| | What | Why it matters | Notes |
| --- | --- | --- | --- |
| B1 | **A reason to come back to Promotello** | Nothing brings a customer back today. One follower, five claims | A weekly "new near you" email, by area, from offers that went live that week. The follower email exists per-business; this is the same machinery across a street |
| B2 | **Open now, and near me** | The single most useful thing a directory does, and the one listings gap the old roadmap already admitted | Opening hours are stored. An "open now" filter and distance sort turns a list into something worth opening at 6pm |
| B3 | **The claim that never became a visit** | Three in five claims here have never been used. That is the cheapest attributed visit available | A reminder before expiry exists; what is missing is the nudge two days after a claim, and a reason to go this week |
| B4 | **One wallet for the street** | Claim 2 of three in the README, still unbuilt. Every business signed makes the customer side better | Group the customer's vouchers and cards by area rather than by business. Cheap, and it is the loop no single-tenant rival can copy |
| B5 | **A consumer acquisition plan at all** | We have SEO pages and no traffic, and no written plan to get any | Not a build: decide whether it is local Instagram, press, the businesses' own channels, or paid. Then build to it. This is a decision owed before B1 is worth sending |

**Gate:** a customer who found one business through Promotello comes back and
finds a second. Cross-visits above zero is the whole of this gate.

### C · Do they come back?

Retention for the business's customer. This is where loyalty lives now — one
mechanism among several, sized accordingly.

| | What | Why it matters | Notes |
| --- | --- | --- | --- |
| C1 | **Loyalty in discovery** | Makes the card an acquisition asset rather than a retention one: joined before the first visit | Cards on the listings and a filter. Was Phase 2, still right, and it belongs to track A as much as C — a join before a first visit is an attributed arrival |
| C2 | **Wallet passes (Apple and Google)** | Table stakes against rivals, and a free lock-screen channel afterwards | **Demoted from first to here.** It is weeks of work — developer accounts, signing, APNs — for parity on a comparison we refuse, and it moves no number in track A. Build it when a paying business asks twice, or when the push channel is the point. [docs/WALLET-PASSES.md](WALLET-PASSES.md) |
| C3 | **Card design and multi-stamp** | Cheap, closes deals, owners ask for it | Unchanged, and still worth doing before C2 |
| C4 | **Switching kit: import members and paper balances** | Removes the cost of leaving a competitor or a paper card | Unchanged. Matters only once we are talking to businesses that already have one |
| C5 | **Customer list, segments and export** | Owners want to own their list, and it answers "what if I leave?" | Unchanged |
| C6 | **The wheel** | The one parked idea with a poster behind it, which is why it unparks first | A spin at the counter, one per device per day, prizes and quantities set by the business. Needs a view on whether a prize draw is a lottery under the Gambling Act before any of it is built |

**Gate:** repeat-visit rate above 30% at businesses that have been live a month.

### D · Can we sell it at all?

Mostly done in November, and listed so it is not re-opened.

Built: the card-less trial, the preview's offer and card following the business
in, the first-customer email, proof on every plan, a page we built going live
when its owner sends it, and the decline reasons.
See [docs/LAUNCH-FUNNEL.md](LAUNCH-FUNNEL.md).

| | What | Why it matters | Notes |
| --- | --- | --- | --- |
| D1 | **Send the previews** | Nothing above is worth another commit until this happens | Not a build. [docs/OUTREACH.md](OUTREACH.md) is written and the tooling is finished |
| D2 | **Record why they said no** | The only way the pitch improves. Today a "no thanks" leaves a status and nothing else | A reason on `business_previews` beside the status, the way a decline now carries one |
| D3 | **Names on the wall** | `/business/testimonials` redirects because there is nothing real. The guarantee stands in for it meanwhile | Three live businesses, with permission, is enough to stop it redirecting |

**Gate:** 10 live businesses on one street, and one of them paying.

## What this de-prioritises, and why

Said plainly so it is a decision rather than a drift:

- **Wallet passes**, from first to C2. A card in a wallet does not move the number
  we sell on. The custom-wallet idea in the README ("our own push and scanning")
  is a bigger version of the same trade and should wait for the same evidence.
- **The whole loyalty parity list** — multiple cards, reward ladders,
  double-stamp days, spend-based points, VIP tiers, SMS, NFC, Zapier — stays
  parked, as before.
- **Till integrations** stay in the far column. They matter to shops already on
  Square, and we have no shops at all.
- **The passport trail and group/BID accounts** move behind track B's gate. A
  trail across businesses nobody visits is a feature with no users; it becomes
  obvious the moment cross-visits are non-zero.

## Competitor analysis (October 2026)

Stamp Me, Square Loyalty and Loopy Loyalty are the loyalty tools a Bristol café is most likely to have heard of. All three sell loyalty only. None of them has a directory, public offers, events, QR posters or review prompts, and none has a free plan. That bundle is Promotello's edge. The gaps are all in the loyalty card itself: where the card lives, how fast a customer can join, and how flexible the card is.

| | Stamp Me | Square Loyalty | Loopy Loyalty | Promotello today |
| --- | --- | --- | --- | --- |
| UK price per month | £39 Lite, £49 Pro, £129 Elite | £25 to £65 per location, by loyalty visits, plus Square POS | US$25, $69 or $95 | Free, £24 Pro, £39 Growth |
| Free plan | No, 30-day trial | No, 30-day trial | No, 15-day trial | Yes |
| Where the card lives | Stamp Me app | Phone number at the till; Apple Wallet pass | Apple and Google Wallet | Promotello web account |
| Join without an app or account | No | Yes | Yes | No |
| How customers earn | Stamps | Points by visit, spend, item or category | Stamps | Stamps |
| Cards per business | Multiple | One programme, several reward levels | 1, 3 or 10 designs by plan | One |
| How staff stamp | Portal, stamp codes, NFC StampPod and StampTag | Automatic at Square checkout | Stamper app or a shared tablet | Scan or type the customer's card code |
| Messaging | Push notifications and SMS | Texts when points are earned; email via Square Marketing | Wallet push messages | Email |
| Automations | Birthday club, lapsed customers | Bonus-point promotions | Smart messaging | Welcome, birthday, win-back, quiet hours |
| Games | Scratch & Win | None | None | None |
| Integrations | Zapier | Square App Marketplace | Zapier, Make, API | None |
| Directory, offers, events, QR posters, review prompts | None | None | None | Yes |

**How to read this table.** As reference for what a business might have heard
of, and nothing more. The ordered build list that used to sit here was derived
from it — four of its five items were card features — which is exactly the
spec-sheet comparison the Positioning section above says to refuse. The build
plan is now [The four tracks](#the-four-tracks), and it is derived from what we
sell instead.

The one thing worth taking from the table: **none of the three has a directory,
public offers, events, QR posters or review prompts, and none has a free plan.**
That bundle is the edge. Every gap it shows is inside the loyalty card, which is
the part we have decided not to compete on.

**What not to copy, and what to park.** Not Stamp Me's native app (Wallet passes cover it), not Square's per-location pricing based on visits (owners dislike unpredictable bills), and no paid hardware before there's demand. **Parked outright**, as feature depth that only invites a spec-sheet comparison we lose: scratch-to-win, SMS credits, NFC tags, spend-based points, VIP tiers, reward ladders, multiple cards and Zapier. Build any of them when a paying business asks twice, not to fill a column in the table above.

## Pricing and packaging

Move from one £19 plan to a free tier plus two paid tiers, with a founding price for the first 50 Bristol businesses. For comparison, Stamp Me now charges £39/month for Lite and £49/month for Pro, and Square Loyalty £25 to £65 per location ([Stamp Me pricing](https://stampme.com/punch-card-app/pricing-plans/), [Square Loyalty UK](https://squareup.com/gb/en/software/loyalty)). Promotello bundles loyalty with offers, QR and a directory, so £24 undercuts both while offering more.

| Tier   | Price (ex. VAT)             | What's included                                                                                                                       | Available from             |
| ------ | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Free   | £0                          | Directory profile, 1 live offer, redemption codes, **the short monthly report and who came back**                                      | Now                        |
| Pro    | £24/month, or £240/year     | Unlimited offers, loyalty card, QR posters with scan stats, followers and offer emails, review prompts, staff scanner, unlimited team, the short monthly report | Now (card design and import in track C) |
| Growth | £39/month                   | Everything in Pro plus automations, quiet-hours offers, the **full** monthly report with every number against last month, first-timers month by month, customer list and export, events | Now (grows with track C) |
| Groups | Custom, per member business | Group dashboard, passport trail, shared campaigns for BIDs and associations                                                           | Behind track B's gate      |

**Founding member offer:** the first 50 Bristol businesses get Pro at £19/month, locked for life. This keeps your current price point, rewards early risk and creates a deadline ("only 12 founding spots left").

Every paid tier starts with a 30-day free trial, and **starting one takes no
card** — it stops by itself unless they add one before the end
(docs/LAUNCH-FUNNEL.md). Card-up-front converts better per trial started and
worse per business emailed, and on one road with fifty shops the second number
is the one we have.

## Bristol go-to-market

Start on Gloucester Road and win it street by street before moving across the city. Gloucester Road is known for its independent shops, and American Express ranked it third in the UK for independent shopping in 2024 ([source](https://en.wikipedia.org/wiki/Gloucester_Road,_Bristol)). That is exactly the customer Promotello is built for, packed into one stretch.

**Who to sell to first:** cafés and coffee shops, then barbers and salons, bakeries, takeaways and independent retail. Cafés already know paper stamp cards, so a digital card is an easy sell.

**How to sell it: remote and preview-first.** Every sale happens in writing. There are no shop visits and no phone calls.

1. **Build the preview before making contact.** Use the admin preview tool to create the business's profile, a sample loyalty card and a first offer from public information.
2. **Send it in writing.** Email or Instagram DM with the preview link: "Here's your loyalty card, ready to go. Want to try it free?"
3. **Post the poster.** Businesses that reply get a printed QR poster with their name on it, posted to the shop.
4. **Let the product onboard them.** Setup reminders, conversion emails and the trial-ending email move free businesses to a trial and then to paid. Offer a short screen-share only if the owner asks for one.
5. **Use the founding-member deadline.** £19/month for life, for the first 50 businesses only, with a live count of places left.
6. **Launch the street together, online.** Once 10 Gloucester Road businesses are live, run a "Gloucester Road loyalty week" on Instagram and pitch it by email to local press such as Bristol24/7.
7. **Add the next area.** Pick a second high street (for example North Street in Bedminster or Clifton Village) once Gloucester Road has 25 live businesses.
8. **Open talks with Bristol BID early, by email and video call.** It formed in November 2025 from the Broadmead, Redcliffe & Temple and City Centre BIDs. It represents over 1,000 businesses from Cabot Circus to Temple Meads, with a term running to October 2030 ([source](https://www.visitwest.co.uk/news/read/2025/10/bristols-unified-business-improvement-district-officially-launches-this-week-b6364)). Bring your Phase 1 numbers and pitch a city-centre passport trail pilot for Phase 3.
9. **Let search do some selling.** Auto-generate pages like "coffee offers in Bristol" and "Gloucester Road loyalty cards" from live offers, and put a "Claim this business" link on every pre-built profile.

**Market size (official figures).** ONS UK Business Counts 2026 list 18,295 enterprises in Bristol, 86.8% of them micro (0 to 9 staff) ([Nomis](https://www.nomisweb.co.uk/reports/lmp/lad/1778384919/report.aspx)). About 3,585 local units fit Promotello: 1,090 cafés, restaurants and takeaways, 395 hair, beauty and well-being, 1,680 in-store retail, 355 pubs and bars, and 65 gyms. 2,610 of those are micro, the closest official proxy for independents ([Nomis, local units by industry](https://www.nomisweb.co.uk/datasets/idbrlu)). 100 paying businesses is under 3% of the segment.

**Targets:** 10 live businesses on Gloucester Road by the end of December 2026, and 25 paying businesses in Bristol by the end of February 2027 (the Phase 1 gate).

## Metrics to track

Two of these are the business. The rest are diagnosis.

**The number that decides everything: customers we can prove we sent, per
business, per month.** It is what the pitch promises, what the guarantee is
written against, and what a renewal is bought with. If it is zero we have a
product problem; if it is good and they still cancel we have a reporting problem.

**The number that says the network is real: cross-visits.** A customer active at
two Promotello businesses is the only evidence that any of this is more than
fifty separate shops with the same software. It is zero today.

| Metric | Definition | Target |
| --- | --- | --- |
| Attributed customers per business | First-time customers we can show we sent, per month | 10 by month two of a business being live |
| Cross-visits | Customers active at 2+ Promotello businesses | Above zero, then 15% |
| Paying businesses | Active paid subscriptions | 10 on one street, then 25 in Bristol |
| Weekly active businesses | Paid businesses with a stamp, claim or redemption that week | 70% |
| Monthly churn | Paid businesses cancelling per month | under 5% |
| Trial to paid | Trials that convert after 30 days | 40% — expect it to fall now the trial takes no card, and the number of trials started to rise by more |
| Claim-to-visit rate | Claimed vouchers that get used | 60%. It is 40% today on tiny numbers, and every unused claim is an attributed visit we nearly had |
| Repeat visit rate | Customers with 2+ visits in 30 days | 35% |
| Customers per business | Followers plus loyalty card holders | 150 |

The targets are starting assumptions. Reset them after the first 25 businesses
have been live for two months — and treat the first two rows as the only ones
worth reporting to yourself weekly.

## Building it with Claude Code

Claude Code works best with three things: a short CLAUDE.md, a written spec per feature, and checks it can run itself. Set these up once, then repeat the same loop for every row in the roadmap table.

### One-time setup

1. **Install** (needs a Claude Pro, Max, Team or Enterprise plan, not the free plan): run `curl -fsSL https://claude.ai/install.sh | bash` in Terminal, or `brew install --cask claude-code`. Check it worked with `claude --version` ([setup docs](https://code.claude.com/docs/en/setup)).
2. **Start in the project:** `cd ~/Developer/promotello` then `claude`. Log in through the browser prompt.
3. **Run `/init`** to generate a CLAUDE.md, then trim it to the rules below. Keep it short: every line should prevent a real mistake.
4. **Reuse your Supabase skills.** Copy the folders in `.agents/skills/` into `.claude/skills/` so Claude Code loads them when it touches the database.
5. **Give it checks.** `npm run lint` and `npm run build` exist today. Ask Claude Code to add Playwright end-to-end tests for the main flows (sign up, create offer, claim, redeem) so it can prove a feature works.
6. **Optional:** connect the Supabase MCP server and install the Stripe CLI so Claude Code can inspect your schema and test webhooks locally.

A starting CLAUDE.md for Promotello:

```markdown
# Promotello

@AGENTS.md

Next.js 16 App Router + Supabase + shadcn/ui + Tailwind 4. UK market, GBP, en-GB copy.

## Commands

- npm run dev / npm run lint / npm run build
- npx playwright test (end-to-end)

## Rules

- Every schema change is a new file in supabase/migrations/. Never edit an old migration.
- Every new table has RLS enabled with policies, following existing migrations.
- Business-side writes go through Postgres functions that check business_members role.
- Forms use react-hook-form + Zod.
- Run lint and build before saying a task is done.
- IMPORTANT: never run migrations or scripts against the production Supabase project.
```

### The loop for each feature

1. **New branch:** `git checkout -b feature/loyalty-cards`.
2. **Get interviewed, write a spec.** Prompt: _"I want to build loyalty stamp cards (see the roadmap). Interview me in detail using the AskUserQuestion tool about data model, staff and customer UX, fraud and edge cases. Then write the spec to docs/specs/loyalty.md."_
3. **Fresh session, plan mode.** Run `/clear`, press `Shift+Tab` until plan mode is on, and ask: _"Read @docs/specs/loyalty.md and the existing offers and redemptions code. Make an implementation plan."_ Edit the plan before approving it.
4. **Implement with checks.** _"Implement the plan. Add Playwright tests for issuing and redeeming a stamp. Run lint, build and tests and fix failures. Show me the output."_
5. **Independent review.** Run `/code-review`, or ask: _"Use a subagent to review this diff against the spec, especially RLS policies and permission checks."_
6. **Try it yourself** in `npm run dev` on your phone, then ask Claude Code to commit and open a PR. Run `/clear` before the next feature.

### Habits that save time

- Press `Esc` to stop Claude mid-step, and `Esc` twice (or `/rewind`) to roll back to a checkpoint.
- If you've corrected the same thing twice, `/clear` and restart with a better prompt.
- One feature per session. Name sessions with `/rename` and pick them up with `claude --resume`.
- Reference files with `@path` and paste screenshots of designs you like.
- Read every migration before it runs, because Supabase RLS mistakes leak data between businesses.

For more, see Anthropic's [Claude Code best practices](https://code.claude.com/docs/en/best-practices).

## Risks and open questions

The biggest risk is building too long before selling. Start sending Gloucester Road previews during Phase 0, not after Phase 1.

| Risk                                                            | Mitigation                                                                                               |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Remote previews convert too slowly                              | Test new preview messages and subject lines; Meta ads to self-serve previews; partner newsletters; referral credit |
| Businesses sign up but staff never use it at the till           | Pre-built previews and guided onboarding emails; the staff scanner must work in under 5 seconds; weekly-active alerts in admin           |
| Loyalty stamp fraud (customers stamping themselves)             | Staff scan the customer's card, never the other way round; rate-limit stamps per card per day            |
| Customer data and UK GDPR                                       | Explicit opt-in for marketing emails, an unsubscribe on every email, a privacy policy covering followers |
| Solo founder bandwidth                                          | Strict phase gates; one feature per week; Claude Code for build, your time for sales                     |
| Square, Shopify POS or other till systems already offer loyalty | Position on local network and offers, not loyalty alone; Square till integration in Phase 3 so Square shops can use both            |

**Open questions**

- [ ] Do you want a consumer mobile app eventually, or stay web plus Wallet passes?
- [ ] Will you approve every business and offer manually at launch, or auto-approve paid businesses?
- [ ] Which email provider for marketing sends to followers (Supabase edge function + Resend, or similar)?
- [ ] Is a VAT registration needed at launch, and will prices be shown ex. or inc. VAT?

## Sources

- [Bristol labour market profile (UK Business Counts 2026), Nomis](https://www.nomisweb.co.uk/reports/lmp/lad/1778384919/report.aspx)
- [UK Business Counts: local units by industry, Nomis](https://www.nomisweb.co.uk/datasets/idbrlu)
- [Bristol BID launch, Visit West](https://www.visitwest.co.uk/news/read/2025/10/bristols-unified-business-improvement-district-officially-launches-this-week-b6364)
- [Gloucester Road, Bristol, Wikipedia](https://en.wikipedia.org/wiki/Gloucester_Road,_Bristol)
- [Loyalty app costs UK, Stamp Me](https://www.stampme.com/blog/loyalty-app-cost-uk)
- [Stamp Me UK](https://www.stampme.com/uk) and [Stamp Me pricing](https://stampme.com/punch-card-app/pricing-plans/)
- [Square Loyalty UK](https://squareup.com/gb/en/software/loyalty)
- [Loopy Loyalty pricing, Capterra](https://www.capterra.com/p/160859/Loopy-Loyalty/pricing/) and [features, GetApp](https://www.getapp.co.uk/software/109289/loopy-loyalty)
- [Loopy Loyalty vs Loop.fans](https://loop.fans/blog/loopy-loyalty-vs-loopfans) and [Square Loyalty review](https://loop.fans/blog/square-loyalty-program-review) (written by a competitor)
- [Claude Code setup](https://code.claude.com/docs/en/setup)
- [Claude Code best practices](https://code.claude.com/docs/en/best-practices)
