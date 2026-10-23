# Promotello Product Roadmap

Gates: Phase 0 → 1 = first paying business; Phase 1 → 2 = 25 paying in Bristol; Phase 2 → 3 = 100 paying, churn under 5%.

Oct 23, 2026 · @Harry

## Summary

Promotello will launch in Bristol as a retention toolkit for independent businesses, with the local directory growing on top of it. A business should get value in week one from its own customers: loyalty cards, QR posters, a follower list and automated offers. It should not depend on Promotello already having consumer traffic.

**Positioning shift:** from "get discovered" to **"Turn first-time visitors into regulars."** Discovery through the directory becomes the bonus that grows as more Bristol businesses join.

**The plan in one line:** take paid billing live, ship loyalty, QR and followers, then sign 50 paying businesses on two or three Bristol high streets before expanding.

## Where we are today

The foundations are solid: about 50 commits on Next.js 16 and Supabase, with auth, multi-business teams and admin approval already working. What's missing is billing, plus a reason for a business to pay beyond posting offers.

| Area              | Built                                                            | Gap                                                                   |
| ----------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------- |
| Business accounts | Registration, onboarding checklist, business switcher, locations | Opening hours, photos, social links                                   |
| Teams             | Invitations, roles (owner, admin, member), team management       | None for launch                                                       |
| Offers            | Create and edit, images, terms, claim limits, expiry, approval   | Recurring schedules (e.g. quiet hours), offer types beyond a discount |
| Redemptions       | Unique codes, customer claim, staff lookup, redemption list      | Camera scanning, redemption emails need styling                       |
| Analytics         | Redemption count per offer                                       | Views, claims, repeat customers, value generated                      |
| Consumer side     | Explore, offers, business profiles, categories, account pages    | Follow a business, wallet, loyalty                                    |
| Admin             | Business and offer approval, audit logs                          | Subscription overview                                                 |
| Billing           | Pricing page (£19/month, marked as "proposed")                   | No payments at all                                                    |
| Marketing site    | Business and consumer pages, help centre, legal                  | SEO, blog                                                             |

The existing README todo list (SEO, email styling, form validation with Zod, mobile menus) still applies. It sits under Phase 0 below.

## Strategy: solving the cold start

We win by making Promotello useful to one business on its own, then letting the directory grow out of the customers they bring. A new marketplace has no consumers, so "get discovered" can't be promised on day one. "Keep your customers coming back" can.

&#91;embedded content: growth loop · 4 steps\]

The loop starts at step 1, the step a business pays for. Steps 2 to 4 cost us nothing once the tools are in shops.

Three rules follow from this:

1. **Standalone value first.** Every Phase 1 feature has to work for a business even if no other business in Bristol uses Promotello.
2. **Density over reach.** 50 businesses on Gloucester Road beat 500 scattered across the UK. A customer who joins at one café needs to see ten more nearby.
3. **Sell to groups as well as shops.** Business Improvement Districts and traders' associations can bring dozens of members in one deal.

## Roadmap

Four phases over about 11 months. Phase 1 is where Promotello becomes worth £19+ a month. The dates assume you are building solo with Claude Code. Each gate is a business result, not a date: don't start the next phase until the gate is met.

&#91;embedded content: roadmap · 4 phases, 3 gates\]

| Phase | Feature                                    | Why it sells                                                     | Build notes                                                                                                           |
| ----- | ------------------------------------------ | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 0     | Stripe billing, 30-day free trial          | Nothing is validated until someone pays                          | Stripe Checkout and Customer Portal; a webhook writes to a new `subscriptions` table; gate dashboard features on plan |
| 0     | Free tier (profile and 1 live offer)       | Fills the directory and gives a no-risk first step               | Plan limits checked in Postgres functions, not just the UI                                                            |
| 0     | SEO for business and offer pages           | Bristol customers find listings on Google                        | `generateMetadata`, sitemap, LocalBusiness structured data                                                            |
| 0     | README todos                               | Polish before businesses see it                                  | Styled emails, logged-in redirects, Zod forms, sheet mobile menus                                                     |
| 1     | QR posters with scan tracking              | A tangible thing in the shop window on day one                   | `qr_codes` and `qr_scans` tables; one code per placement; printable A4 and A5 PDF                                     |
| 1     | Loyalty stamp cards                        | The clearest monthly-value tool for cafés, barbers and takeaways | `loyalty_programs`, `loyalty_cards`, `loyalty_stamps`; staff scan the customer's card QR to stop self-stamping        |
| 1     | Staff camera scanner                       | Redeeming must take seconds at a busy till                       | Mobile-first page in the dashboard; camera scanning replaces typing codes into the lookup                             |
| 1     | Follow a business and offer emails         | Gives the business a customer list it owns                       | `business_followers`; new-offer email to followers via a Supabase edge function                                       |
| 1     | Google review prompt                       | Owners care a lot about reviews                                  | Store the Google Place ID; prompt after a redemption or stamp                                                         |
| 2     | Welcome, birthday and win-back automations | Marketing that runs without the owner                            | Scheduled job (Supabase cron) checks rules daily                                                                      |
| 2     | Quiet-hours recurring offers               | "Fill your dead hours" is a concrete pitch                       | Offer schedules by weekday and time window                                                                            |
| 2     | Apple and Google Wallet passes             | Lock-screen reminders without a native app                       | Needs an Apple Developer account and a Google Wallet issuer account                                                   |
| 2     | Value report and analytics funnel          | Proves ROI and stops cancellations                               | Track offer views; monthly email: visits, repeat customers, estimated value                                           |
| 2     | Events and social share images             | Extra reasons to post and come back                              | Events table; generated Instagram story image per offer                                                               |
| 3     | Bristol passport trail                     | Gets customers visiting several members                          | Collect stamps across participating businesses for a prize                                                            |
| 3     | Group accounts for BIDs and associations   | Larger contracts, many businesses per sale                       | Group dashboard across member businesses                                                                              |
| 3     | Referrals and multi-location plan          | Growth from existing customers                                   | Referral credits; per-location stats                                                                                  |
| 3     | Second city                                | Repeat the Bristol playbook                                      | Choose from what Phase 1 and 2 data shows                                                                             |

## Pricing and packaging

Move from one £19 plan to a free tier plus two paid tiers, with a founding price for the first 50 Bristol businesses. For comparison, Stamp Me, a UK loyalty-only app, charges £25/month for its Lite plan and £42/month for Medium ([source](https://www.stampme.com/blog/loyalty-app-cost-uk)). Promotello bundles loyalty with offers, QR and a directory, so £24 is competitive.

| Tier   | Price (ex. VAT)             | What's included                                                                                                                       | Available from             |
| ------ | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Free   | £0                          | Directory profile, 1 live offer, redemption codes                                                                                     | Phase 0                    |
| Pro    | £24/month, or £240/year     | Unlimited offers, loyalty card, QR posters with scan stats, followers and offer emails, review prompts, staff scanner, unlimited team | Phase 0 (grows in Phase 1) |
| Growth | £39/month                   | Everything in Pro plus automations, quiet-hours offers, Wallet passes, monthly value report, events                                   | Phase 2                    |
| Groups | Custom, per member business | Group dashboard, Bristol passport trail, shared campaigns for BIDs and associations                                                   | Phase 3                    |

**Founding member offer:** the first 50 Bristol businesses get Pro at £19/month, locked for life. This keeps your current price point, rewards early risk and creates a deadline ("only 12 founding spots left").

Every paid tier starts with a 30-day free trial, card required at sign-up.

## Bristol go-to-market

Start on Gloucester Road and win it street by street before moving across the city. Gloucester Road is known for its independent shops, and American Express ranked it third in the UK for independent shopping in 2024 ([source](https://en.wikipedia.org/wiki/Gloucester_Road,_Bristol)). That is exactly the customer Promotello is built for, packed into one walkable stretch.

**Who to sell to first:** cafés and coffee shops, then barbers and salons, bakeries, takeaways and independent retail. Cafés already know paper stamp cards, so a digital card is an easy sell.

**How to sell it:**

1. **Walk in with their poster already printed.** A QR poster with their name on it turns a cold pitch into "want to try this in your window?"
2. **Set them up yourself in 15 minutes.** Create the profile, loyalty card and first offer while you're in the shop. Do this for at least the first 25 businesses.
3. **Use the founding-member deadline.** £19/month for life, for the first 50 businesses only.
4. **Launch the street together.** Once 10 Gloucester Road businesses are live, run a "Gloucester Road loyalty week" through Instagram, flyers and local press such as Bristol24/7.
5. **Add the next area.** Pick a second high street (for example North Street in Bedminster or Clifton Village) once Gloucester Road has 25 live businesses.
6. **Open talks with Bristol BID early.** It formed in November 2025 from the Broadmead, Redcliffe & Temple and City Centre BIDs. It represents over 1,000 businesses from Cabot Circus to Temple Meads, with a term running to October 2030 ([source](https://www.visitwest.co.uk/news/read/2025/10/bristols-unified-business-improvement-district-officially-launches-this-week-b6364)). Bring your Phase 1 numbers and pitch a city-centre passport trail pilot for Phase 3.
7. **Let search do some selling.** Auto-generate pages like "coffee offers in Bristol" and "Gloucester Road loyalty cards" from live offers.

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

The biggest risk is building too long before selling. Start walking Gloucester Road during Phase 0, not after Phase 1.

| Risk                                                            | Mitigation                                                                                               |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Businesses sign up but staff never use it at the till           | Concierge setup; the staff scanner must work in under 5 seconds; weekly-active alerts in admin           |
| Loyalty stamp fraud (customers stamping themselves)             | Staff scan the customer's card, never the other way round; rate-limit stamps per card per day            |
| Customer data and UK GDPR                                       | Explicit opt-in for marketing emails, an unsubscribe on every email, a privacy policy covering followers |
| Solo founder bandwidth                                          | Strict phase gates; one feature per week; Claude Code for build, your time for sales                     |
| Square, Shopify POS or other till systems already offer loyalty | Position on local network and offers, not loyalty alone; consider POS integration in Phase 3             |

**Open questions**

- [ ] Do you want a consumer mobile app eventually, or stay web plus Wallet passes?
- [ ] Will you approve every business and offer manually at launch, or auto-approve paid businesses?
- [ ] Which email provider for marketing sends to followers (Supabase edge function + Resend, or similar)?
- [ ] Is a VAT registration needed at launch, and will prices be shown ex. or inc. VAT?

## Sources

- [Bristol BID launch, Visit West](https://www.visitwest.co.uk/news/read/2025/10/bristols-unified-business-improvement-district-officially-launches-this-week-b6364)
- [Gloucester Road, Bristol, Wikipedia](https://en.wikipedia.org/wiki/Gloucester_Road,_Bristol)
- [Loyalty app costs UK, Stamp Me](https://www.stampme.com/blog/loyalty-app-cost-uk)
- [Claude Code setup](https://code.claude.com/docs/en/setup)
- [Claude Code best practices](https://code.claude.com/docs/en/best-practices)
