# How Promotello writes

Not a style guide invented from scratch. This is the voice already in the
product, written down after reading about 25,000 words of it in November
2026 — every marketing page, every email, the dashboards, the help centres
and the sales pack. Where the site disagreed with itself, the rule here is
whichever side was already winning.

The point of writing it down is that the drift found in that review was
never anyone deciding differently. It was the same thing said twice, months
apart, with nothing in between to check it against.

## The voice

**Lead with the problem, not the mechanism.** "A stamp card that never gets
lost in a coat pocket", not "digital loyalty card functionality". The reader
is a café owner between customers, not a buyer of software.

**Say why.** Every instruction earns its place by naming what it gets you:
"Put it in your window, so passers-by find your offers." A step with no
reason attached is a step people skip.

**Specifics, not adjectives.** "A code lasts an hour and works once" beats
"codes are secure and time-limited". Numbers, names and dates; never
"seamless", "powerful" or "simply".

**Short sentences.** Under 25 words. Paragraphs of three sentences at most.

**Admit the limits.** "It works from day one with your own customers, and
gets better as your street joins" is worth more than a claim a sceptical
owner can disprove in one click. The product is early; saying so is a
reason to trust the rest.

## The rules

| Rule | Example |
| --- | --- |
| British English | organise, colour, licence (noun) |
| Contract, everywhere | "it's", "you'll", "isn't" — not "it is not" |
| No exclamation marks | "Happy birthday, Mike" — the reward carries the warmth |
| No comma before the final *and* / *or* | "offers, posters and loyalty cards" |
| Straight apostrophes | `'` not `’` |
| Spaced em dashes | "security — all in one place" |
| Sentence case for headings | "What you get, and what it costs" |
| No place names in shared copy | see [MULTI-CITY.md](MULTI-CITY.md) |

**The comma rule is about lists, not clauses.** "Hand over the reward, mark
it redeemed, and the card starts again" keeps its comma: the last part is a
clause with its own subject, and taking it out makes a run-on. The rule bans
"stock, staffing, and capacity", not every comma that happens to sit before
an *and*.

## Say the same thing the same way

One name per thing. The review found each of these said two ways:

| Say | Not |
| --- | --- |
| your page (the public one) | your profile |
| staff guide | till guide |
| when they pay / at the counter | at the till |
| Add a stamp | Add stamp |
| staff scan it on their phone | scan it at the till |
| review prompts | review requests |

**A till is a place, not our mechanism.** A poster can go by the till. A
voucher is never redeemed "at the till" — staff scan a QR code on their own
phone, and `llms.txt` says in as many words that there is no till
integration.

**Name a button exactly as it reads.** Someone following an instruction is
looking at the screen while they read it. "Add another business" only
appears once you have one.

**Social icons go in one order, everywhere:** Instagram, Facebook, X,
YouTube, LinkedIn, TikTok. The site footer, the email footer, Harry's
signature, a business's own page and the form that asks for them all use
it. Instagram and Facebook lead because that is where these businesses
already are; TikTok sits last. A list that has only some of them keeps
the same relative order rather than inventing its own — the signature has
no LinkedIn, and is still in order.

`SOCIAL_ORDER` in `lib/social-links.ts` is the order, and
`tests/unit/social-links.test.ts` and `tests/unit/email-signature.test.ts`
fail if one of the lists is reordered on its own.

## Numbers come from code, never from the keyboard

Prices, trial lengths, plan limits and the number of founding places are all
in `lib/billing.ts`. Write `freeFor(TRIAL_DAYS)`, never "30 days".

This is the rule that was broken most. Nine places told a business its trial
was 30 days while it was being offered 90, including a help panel sitting on
the billing page whose own heading said three months.
`tests/unit/trial-length-is-not-typed-out.test.ts` now fails if a trial
length is typed out, and it found the ninth itself.

## One place decides each sentence

Copy that appears twice is copy that will disagree. These are already the
single source for what they say, and new copy joins them rather than
repeating them:

| What | Where |
| --- | --- |
| An offer's headline | `lib/offer-kinds.ts` |
| When an offer can be used | `availabilityLine()` in `lib/schedule.ts` |
| Prices, plans, trials, founding places | `lib/billing.ts` |
| What a notification says | `lib/notifications.ts` |
| Why something was declined or suspended | `lib/review-reasons.ts` |
| What is left to set up | `lib/setup-steps.ts` |

`lib/review-reasons.ts` shows the shape to copy: the code is stored on the
row and the sentence is rebuilt on every read, so the email, the
notification, the dashboard and the help article cannot drift — and
`fixOnAPage()` adjusts one sentence for a page without touching the email's
own wording.

## Before it ships

**Does the product do this?** The review found four sentences that were
simply untrue: "Card required" where Checkout takes no card, "You're also
listed in the Bristol directory" to a business that was not, "VAT included"
when we are not VAT registered, and "Only you can add stamps" when any team
member can. Each had been read many times.

**Read it where it will be read.** A page in the browser, an email rendered
through its builder, a printed sheet on paper. "Free late checkout: Free
late checkout" is invisible in source and obvious in an inbox.

**Who is reading, and how committed are they?** A business owner has signed
up and will persevere. A customer is deciding in ten seconds. The customer
copy used to be the more formal of the two.
