# Promotello Product Roadmap

Gates: Phase 0 → 1 = first paying business; Phase 1 → 2 = 25 paying in Bristol; Phase 2 → 3 = 100 paying, churn under 5%.

Oct 23, 2026, updated Oct 29, 2026 · @Harry

## Summary

Promotello will launch in Bristol as a retention toolkit for independent businesses, with the local directory growing on top of it. A business should get value in week one from its own customers: loyalty cards, QR posters, a follower list and automated offers. It should not depend on Promotello already having consumer traffic.

**Positioning shift:** from "get discovered" to **"Turn first-time visitors into regulars."** Discovery through the directory becomes the bonus that grows as more Bristol businesses join.

**What we are not:** a digital loyalty card app. That category is a dozen vendors deep — LoyBee, TapStamp, Loyaltify, LoyalStamps, Passcard, UpCard, Inkmark, Lovely Loyalty, Oappso — several of them under £15 a month and some free. A feature-for-feature fight there is unwinnable, and winning it would only earn the right to sell a £24 product into a £10 market. Loyalty is the second half of Promotello, never the headline. See [Positioning](#positioning-what-a-loyalty-app-cant-copy).

**The plan in one line:** billing, loyalty, QR and followers are live. Now take the friction out of the card (Wallet passes, joining without an account), sign 50 paying businesses on two or three Bristol high streets, and build the cross-business layer that only that density makes possible.

## Where we are today

Updated 29 October 2026. Phase 0 is done and most of Phase 1 and 2 is built: about 215 commits, Stripe billing live, and loyalty, QR, followers, automations and reports working. The product is ahead of the sales. The next job is getting the first paying businesses on Gloucester Road, and closing the loyalty-card gaps the competitor analysis found (Wallet passes and joining without an account).

| Area              | Built                                                                                                           | Gap                                                                              |
| ----------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Business accounts | Registration, onboarding checklist and emails, business switcher, locations, opening hours, sign-up reminders  | Photo gallery, social links, image cropping                                      |
| Teams             | Invitations, roles (owner, admin, member), team management                                                      | None for launch                                                                  |
| Offers            | Create and edit, offer types (the headline is built from one), when it can be used and who it is for (the availability line is built from those), images, terms, claim limits, expiry, quiet hours enforced at the till, approval (every offer, whatever the plan), reviewing an edit without taking the offer down | An "open now" filter on the listings                                             |
| Redemptions       | Unique codes, voucher QR that staff scan with the phone camera, staff lookup, redemption list                   | None for launch                                                                  |
| Loyalty           | One stamp card per business, staff-scanned card codes, rewards, Google review prompt                           | Wallet passes, joining without an account, card design, multi-stamp, import      |
| Marketing tools   | QR posters with scan tracking, followers and new-offer emails, welcome, birthday and win-back automations, events, Instagram story images | Wallet push, SMS, referrals, scratch-to-win                    |
| Analytics         | Views, claims, redemptions, shares, followers, monthly value report email                                       | Customer list, segments, CSV export                                              |
| Consumer side     | Explore by city, area and category, offers, events, follow, voucher list, loyalty cards, in-app notifications, account pages | Apple and Google Wallet                                                          |
| Admin             | Business and offer approval, audit logs, billing overview, platform metrics, cities and areas, sales previews  | None for launch                                                                  |
| Billing           | Stripe Checkout and Portal, free tier, Pro £24, Growth £39, yearly plans, £19 founding price, 30-day trial      | None for launch                                                                  |
| Marketing site    | Business and consumer pages, pricing, demo, help centre, legal, blog, sitemap and page metadata                 | More blog posts, mobile login and sign-up layout                                 |

The remaining README to-dos are mostly launch admin (accounts, YouTube, analytics, social posts) plus a few UI fixes. They sit under Phase 0 below.

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

## Roadmap

Four phases over about 11 months. Phase 1 is where Promotello becomes worth £19+ a month. The dates assume you are building solo with Claude Code. Each gate is a business result, not a date: don't start the next phase until the gate is met. **Parked** means deliberately not building it — see [Positioning](#positioning-what-a-loyalty-app-cant-copy) for why, and build it only when a paying business asks twice.

&#91;embedded content: roadmap · 4 phases, 3 gates\]

| Phase | Status      | Feature                                    | Why it sells                                                     | Build notes                                                                                                           |
| ----- | ----------- | ------------------------------------------ | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 0     | Built       | Stripe billing, 30-day free trial          | Nothing is validated until someone pays                          | Stripe Checkout and Customer Portal; a webhook writes to a new `subscriptions` table; gate dashboard features on plan |
| 0     | Built       | Free tier (profile and 1 live offer)       | Fills the directory and gives a no-risk first step               | Plan limits checked in Postgres functions, not just the UI                                                            |
| 0     | Built       | SEO for business and offer pages           | Bristol customers find listings on Google                        | `generateMetadata`, sitemap, LocalBusiness structured data                                                            |
| 0     | In progress | README todos                               | Polish before businesses see it                                  | Styled emails, logged-in redirects, Zod forms, sheet mobile menus                                                     |
| 1     | Built       | QR posters with scan tracking              | A tangible thing in the shop window on day one                   | `qr_codes` and `qr_scans` tables; one code per placement; printable A4 and A5 PDF                                     |
| 1     | Built       | Loyalty stamp cards                        | The clearest monthly-value tool for cafés, barbers and takeaways | `loyalty_programs`, `loyalty_cards`, `loyalty_stamps`; staff scan the customer's card QR to stop self-stamping        |
| 1     | Built       | Staff camera scanner                       | Redeeming must take seconds at a busy till                       | Mobile-first page in the dashboard; camera scanning replaces typing codes into the lookup                             |
| 1     | Built       | Follow a business and offer emails         | Gives the business a customer list it owns                       | `business_followers`; new-offer email to followers via a Supabase edge function                                       |
| 1     | Built       | In-app notifications                       | Somebody who turned an email off still hears, and nobody has to check an inbox | `notifications` table, one list per user account; written beside each email. Follow-ups: a Realtime subscription instead of recounting on navigation, and per-type in-app preferences |
| 1     | Built       | Google review prompt                       | Owners care a lot about reviews                                  | Store the Google Place ID; prompt after a redemption or stamp                                                         |
| 1     | To do       | Apple and Google Wallet passes (moved up from Phase 2) | Loopy and Square both put the card in the phone's wallet; ours lives in a web account | Apple Developer account plus Google Wallet issuer account; `.pkpass` signed in an edge function; pass updates on every stamp via APNs |
| 1     | To do       | Join a card without an account             | Square joins in 10 seconds with a phone number; we make customers sign up first | Name plus email (or phone) creates a guest card straight into Wallet; claim it into a full account later |
| 1     | To do       | Card design and multi-stamp                | Owners want the card to look like their shop; a round of 3 coffees should earn 3 stamps | Colours, logo and stamp icon on `loyalty_programs`; quantity on `add_loyalty_stamp` with a per-scan cap |
| 1     | To do       | Switching kit: import members and paper stamps | Removes the cost of leaving Stamp Me, Loopy or paper cards | CSV import of name, email and stamp balance; staff can set a starting balance from a paper card once |
| 2     | Built       | Welcome, birthday and win-back automations | Marketing that runs without the owner                            | Scheduled job (Supabase cron) checks rules daily                                                                      |
| 2     | Built       | Quiet-hours recurring offers               | "Fill your dead hours" is a concrete pitch                       | Offer schedules by weekday and time window                                                                            |
| 2     | To do       | Wallet push messages and location alerts   | Free lock-screen messages, instead of Stamp Me's SMS            | Send messages through the pass update; up to 10 shop locations on the pass for nearby alerts                          |
| 2     | Parked      | Multiple cards and reward ladders          | Stamp Me includes multiple cards on every plan; Loopy offers up to 10 designs | Drop the one-active-programme index; rewards at several stamp counts (5 = pastry, 10 = coffee)        |
| 2     | Parked      | Double-stamp days and bonus promotions     | Square sells bonus-point promotions; pairs with quiet hours     | Stamp multiplier on a weekday and time schedule, reusing offer schedules                                              |
| 2     | Parked      | Surprise rewards and scratch-to-win        | Stamp Me's Scratch & Win gives customers a reason to open the card | Random reward on join or the Nth stamp, chance set by the owner; reuses `reward_vouchers`                    |
| 2     | To do       | Attributed repeat-visit report             | The one number no loyalty app can print: first visits we sent, and who came back | First visit vs returning per business, attributed to a QR scan, offer claim or directory view; monthly email and a dashboard panel |
| 2     | To do       | Loyalty in discovery                       | Makes the card an acquisition asset: joined before the first visit, not after    | Card on the offers and businesses listings and a "has a loyalty card" filter; reuses `loyalty-callout.tsx` and the public join flow |
| 2     | To do       | One wallet for the street                  | Every business signed makes the consumer side better — the loop rivals can't build | One place holding every nearby independent's card and vouchers; group by area, not by business |
| 2     | To do       | Bristol passport trail                     | Gets customers visiting several members                          | Collect stamps across participating businesses for a prize                                                            |
| 2     | To do       | Customer list, segments and CSV export     | Loopy and Square sell a customer view; owners want to own their list | One customer page joining followers, cards, redemptions and vouchers; filters such as lapsed and VIP; export with consent flags |
| 2     | To do       | Customer refer-a-friend                    | None of the three rewards referrals well, so this is a selling point | Personal referral link on the card; both people get a stamp after the friend's first stamp                  |
| 2     | Built       | Value report and analytics funnel          | Proves ROI and stops cancellations                               | Track offer views; monthly email: visits, repeat customers, estimated value                                           |
| 2     | Built       | Events and social share images             | Extra reasons to post and come back                              | Events table; generated Instagram story image per offer                                                               |
| 3     | To do       | Group accounts for BIDs and associations   | Larger contracts, many businesses per sale                       | Group dashboard across member businesses                                                                              |
| 3     | To do       | Referrals and multi-location plan          | Growth from existing customers                                   | Referral credits; per-location stats                                                                                  |
| 3     | To do       | Till integrations (Square, SumUp, Shopify POS) | Square stamps automatically at checkout; we should too, on any till | Auto-stamp on payment webhooks matched to a customer; start with the till most Bristol members use |
| 3     | Parked      | Zapier, Make and a public API              | Stamp Me and Loopy both connect to Zapier                       | Webhooks for join, stamp and reward; API keys per business                                                            |
| 3     | Parked      | Spend-based points and VIP tiers           | Square earns on spend, items and categories with VIP levels     | Only if larger customers ask; stamps stay the default                                                                 |
| 3     | Parked      | SMS credits and NFC stamp tags             | Stamp Me sells SMS and tap-to-stamp hardware                    | Paid add-ons; an NFC tag opens a signed one-time stamp link, rate-limited per card                                    |
| 3     | To do       | Second city                                | Repeat the Bristol playbook                                      | Choose from what Phase 1 and 2 data shows                                                                             |

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

**What to build, in order** (re-cut 9 November 2026 against [Positioning](#positioning-what-a-loyalty-app-cant-copy)):

1. **Wallet passes, now (Phase 1, moved up from Phase 2).** It is the main thing Loopy sells, and Square has it too. A card in Apple or Google Wallet also opens up free lock-screen messages later.
2. **Join without signing up (Phase 1).** Requiring an account is the biggest piece of friction at a busy till. Square joins a customer in about 10 seconds with a phone number.
3. **Card design, multi-stamp and a switching kit (Phase 1).** These are cheap to build and help close deals. Importing members and paper-card balances removes the cost of leaving a competitor.
4. **The attributed repeat-visit report (Phase 2).** First visits Promotello sent, how many came back, how many became regulars. The one number no loyalty app can print, and the reason a business renews.
5. **Loyalty in discovery (Phase 2).** Cards on the listing pages and a filter for them, so a card is seen by people who have never been in. Turns the card from a retention tool into an acquisition one.
6. **One wallet for the street, then the passport trail (Phase 2).** Every nearby independent in one place, then stamps collected across members. Each business signed makes the consumer side better — the loop no single-tenant tool has.
7. **Customer list and export (Phase 2).** Owners want to own their customer data, and an export also answers the "what if I leave?" objection.
8. **Till integrations (Phase 3), if asked for.** Stamping automatically from the till takes away Square's one real advantage, but only matters to shops already on Square.

**What not to copy, and what to park.** Not Stamp Me's native app (Wallet passes cover it), not Square's per-location pricing based on visits (owners dislike unpredictable bills), and no paid hardware before there's demand. **Parked outright**, as feature depth that only invites a spec-sheet comparison we lose: scratch-to-win, SMS credits, NFC tags, spend-based points, VIP tiers, reward ladders, multiple cards and Zapier. Build any of them when a paying business asks twice, not to fill a column in the table above.

## Pricing and packaging

Move from one £19 plan to a free tier plus two paid tiers, with a founding price for the first 50 Bristol businesses. For comparison, Stamp Me now charges £39/month for Lite and £49/month for Pro, and Square Loyalty £25 to £65 per location ([Stamp Me pricing](https://stampme.com/punch-card-app/pricing-plans/), [Square Loyalty UK](https://squareup.com/gb/en/software/loyalty)). Promotello bundles loyalty with offers, QR and a directory, so £24 undercuts both while offering more.

| Tier   | Price (ex. VAT)             | What's included                                                                                                                       | Available from             |
| ------ | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Free   | £0                          | Directory profile, 1 live offer, redemption codes                                                                                     | Phase 0                    |
| Pro    | £24/month, or £240/year     | Unlimited offers, loyalty card, QR posters with scan stats, followers and offer emails, review prompts, staff scanner, unlimited team, Apple and Google Wallet card, card design, member import | Phase 0 (grows in Phase 1) |
| Growth | £39/month                   | Everything in Pro plus automations, quiet-hours offers, the attributed repeat-visit report, customer list and export, loyalty in discovery, events                                 | Phase 2                    |
| Groups | Custom, per member business | Group dashboard, Bristol passport trail, shared campaigns for BIDs and associations                                                   | Phase 2 (trail), Phase 3 (group dashboard) |

**Founding member offer:** the first 50 Bristol businesses get Pro at £19/month, locked for life. This keeps your current price point, rewards early risk and creates a deadline ("only 12 founding spots left").

Every paid tier starts with a 30-day free trial, card required at sign-up.

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

Weekly active businesses is the number that matters most. A business that stamps or redeems every week rarely cancels. Build these into the admin dashboard in Phase 1.

| Metric                    | Definition                                                    | Target by end of Phase 2 |
| ------------------------- | ------------------------------------------------------------- | ------------------------ |
| Paying businesses         | Active paid subscriptions                                     | 100                      |
| Monthly recurring revenue | Sum of monthly subscription value                             | about £2,200             |
| Weekly active businesses  | Paid businesses with at least 1 stamp or redemption that week | 70%                      |
| Monthly churn             | Paid businesses cancelling per month                          | under 5%                 |
| Trial to paid             | Trials that convert after 30 days                             | 40%                      |
| Customers per business    | Followers plus loyalty card holders                           | 150                      |
| Repeat visit rate         | Customers with 2+ visits in 30 days                           | 35%                      |
| Cross-visits              | Customers active at 2+ Promotello businesses                  | 15%                      |

The targets are starting assumptions. Reset them after the first 25 businesses have been live for two months.

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
