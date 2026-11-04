# Promotello in more than one place

Promotello launches in Bristol, but nothing in the product is Bristol-only.
This is how a second city works, what the rules are, and how to check them
before switching one on.

Read this before changing anything that groups, counts or links by area, or
any copy that names a place.

## The model

Three tables carry location, in `supabase/migrations/20261027090000_cities_and_areas.sql`:

| Table                | What it holds                                                              |
| -------------------- | -------------------------------------------------------------------------- |
| `cities`             | Name, slug, postcode districts, centre and radius, photos, `is_live`        |
| `areas`              | The neighbourhoods and towns of one city, each with its own slug           |
| `business_locations` | A business's address, resolved to a `city_id` and an `area_id`             |

`validate_business_location()` fills in `city_id` and `area_id` from the names
a form sends, and refuses a location whose postcode district isn't one of the
city's. That is the gate: a business can only join a city Promotello is live
in, at an address that is really in it.

**A city is invisible until `is_live` is true.** Add it, add its areas, then
switch it on when there is something to see.

## The one rule that matters

**Area names are only unique inside a city.** Bristol has a City Centre and so
does Bath. Almost every city does.

So anything that groups, counts, filters or links by area uses the **area's
id**, never its name:

- `areasFrom()` groups by `areaId`, so the two City Centres stay two areas.
- `isInArea()` matches on `areaId`, so a Bath business never counts towards a
  Bristol area.
- An area card or chip links using **its own** `cityId`, not the first
  business that happens to share the name.

The name is for showing people, and when more than one city is on screen it is
always shown **with its city** — a chip reads "City Centre · Bath", a card
reads "Bath · 1 business · 2 offers".

The exception is the address bar. `?area=Clifton` carries a name, because a
readable URL is worth more than a uuid. That only works inside one city, so:

- The **Area** filter is offered only once a city is chosen. Looking at every
  city, the filter offers **cities** instead — which is the choice to make
  first anyway.
- A link that names an area without naming the city it belongs to, or that
  names an area of a different city from the one the visitor has remembered,
  **redirects to the city that has it**: `/offers?area=Keynsham` →
  `/offers/bath?area=Keynsham`. Someone following a shared link gets the
  offers, not an empty list.

## Which city a visitor sees

`getVisitorContext()` in `lib/visitor.ts`, in order:

1. **What they chose.** The `promotello_city` cookie, set by the location
   search, or `all` for every location.
2. **The city whose page they are on.** `/offers/bath` and the other city
   routes render `<RememberCity>`, which writes the cookie. Without it,
   arriving from a search result and tapping "Businesses" in the header — the
   same link on every page — would drop them back to every location.
3. **The town their IP is in**, when exactly one live city has an area of that
   name. Vercel's `x-vercel-ip-city` gives the town, and the town is a better
   answer than distance: Keynsham is nearer Bristol's centre than Bath's, but
   it is one of Bath's areas and its businesses are filed under Bath.
4. **The nearest city centre** within that city's radius (`lib/geo.ts`).
5. **Every location**, with a "Promotello isn't in <town> yet" note if we know
   their town and it is in the UK.

A **detected** city is never written to the cookie. Only a choice, or a city
URL, is remembered — so someone who travels isn't stuck with the city they
were in last week.

### When we don't know

Steps 4 and 5 leave a visitor with no city, and that is the state to get
right: someone in London who arrives behind a VPN is no better served by a
page of Bristol cafés than by nothing.

With **one** live city there is nothing to choose between, so the only thing
worth saying is that we aren't where they are. With **several**, `CityNotice`
asks before anything else:

> **Where are you?** Promotello is in Bristol, Bath and London. Pick one to
> see what's near you.

and, for someone we can place but can't serve:

> **Promotello isn't in Manchester yet.** We're in Bristol, Bath and London —
> pick one to look around.  *(plus the "tell me when" form)*

Picking one goes to that city's page, which remembers it. Someone who
*deliberately* chose "Everywhere" is never asked — they said what they wanted.
And the notice has a close button: shut once, it stays shut.

**The town is a guess, and is shown as one.** It comes from
`x-vercel-ip-city`, which is a lookup on the address the request arrived on.
On a mobile network that address belongs to the carrier's gateway, not the
handset, so it can be the other end of the country — a visitor in Gibraltar
routed through a UK carrier was reported as being in Kingston upon Hull.
There is no server-side fix for that: the coordinates come from the same
lookup, so they agree with the wrong answer.

Two things make it survivable. The town in the waitlist form is an **editable
field**, prefilled with the guess, so the visitor corrects it and
`city_interest` records where they actually are rather than where their
carrier is — that table decides where Promotello launches next, so it has to
be right. And the town is only named when `x-vercel-ip-country` is `GB`; no
country at all means the lookup had nothing to go on, so nothing is claimed.

Someone who wants to be placed exactly can use **"Use my location"** in the
location search, which asks the browser and is accurate to the street.

### The merged list

"Everywhere" still works, and it has to, because it's what crawlers and
first-time visitors see. Two things keep it honest:

- **Every card names its city**, so nothing is ambiguous.
- **`interleaveByCity()` takes one listing from each city in turn.**
  Everything is newest-first, so without it the city that joined most recently
  fills the entire first screen — with Bath seeded last, a visitor's first ten
  cards were ten Bath businesses. An explicit sort the visitor asked for
  ("Ending soon", "Most popular") is left alone, because that order is the
  answer to their question.

## Naming the place in copy

`placeName(city)` in `lib/cities.ts` gives the name to use:

- a city is showing → that city, "Bath"
- no city, one live → that city, "Bristol"
- no city, several → `listPlaces()`: "Bristol and Bath", and once there are
  more than three, "Bristol, Bath and 4 more places"

It always reads correctly after a preposition — "offers in X", "across X" —
and is **never** used possessively, because a list can't take an apostrophe.
Copy that wants "Bristol's independents" asks `placeIsOneCity()` first and
uses "Independent businesses in Bristol and Bath" otherwise.

Never write "your area". It tells a visitor nothing, and it is what every one
of these sentences said before a second city existed.

**And never treat a list of cities as somewhere a visitor is.** "Offers across
Bristol, Bath and London" is true of the page and false of the reader. The
headings on the merged pages drop the place entirely — "Offers from
independent businesses", "Independent businesses" — and the notice above them
asks which city they want. `placeName()` is still right for anything that
describes the *page*, which is why the titles keep it.

### Titles and descriptions

`generateMetadata` can't see the cookie, so the pages that work a city out
from the visitor — `/offers`, `/businesses`, `/explore`, `/categories/<cat>` —
describe their **canonical** self, which is every location: "Offers in Bristol
and Bath". The heading below then names the city the visitor is actually
seeing. That is deliberate: the canonical URL covers every city, so its title
should too.

The city's own pages — `/offers/bath`, `/categories/food-drink/bath` — take
the city from the URL and say so in the title.

## Photos

Three cases, in `cityPhotos()`:

- the city has its own photos → use them
- the city has none → a neutral stock photo, never another city's landmark
- no city (every location) → Promotello's own photos

**Give each city its own hero and feature photo** in `/admin/cities` when you
switch it on. Everything works without them; it just looks generic.

## What a city costs in search

`cityPaths()` in `app/sitemap.ts` lists a city's `/offers`, `/businesses`,
`/explore` and six category pages — nine URLs — **only once the city has at
least one business**. A city switched on before its first business would
otherwise put nine empty pages in front of Google on day one.

Area and subcategory pages are listed only where there is something on them,
and empty ones are `noindex`. `llms.txt` names the live cities and links each
one's pages.

## Adding a city

1. `/admin/cities` → add the city with its postcode districts. It starts not
   live.
2. Add its areas. Include outlying towns people would name — Keynsham,
   Saltford — not only inner neighbourhoods, because the town name is how a
   visitor's location gets matched.
3. Set the centre, radius and both photos.
4. Build the businesses — outreach, previews, sign-ups — while it is still not
   live. `validate_business_location()` lets a platform admin create a
   location in a city that isn't live yet.
5. Switch `is_live` on. That's the moment it appears in the location search,
   the sitemap and `llms.txt`.

Check the radius against the cities already live. They are allowed to overlap
— `nearestCity()` takes the closest — but a radius much larger than the city
will pull in visitors who should be seeing somewhere else.

## Testing it

Most of the rules are pure functions, and they are unit tested with no
database and no browser:

```bash
npm run test:unit        # tests/unit/*.test.ts, via node --test
```

`tests/unit/listing-filters.test.ts` covers the area-id rules — two cities
sharing an area name, legacy locations with no area id, searching by city.
`tests/unit/places.test.ts` covers naming places and matching a town.

The end-to-end rules need a second city. `tests/e2e/multi-city.spec.ts` skips
itself when fewer than two cities are live, so it is quiet on a Bristol-only
database and has something to say the moment a second one is added:

```bash
node --env-file=.env.local scripts/sample-data.mjs seed-city bath
npx playwright test tests/e2e/multi-city.spec.ts
node --env-file=.env.local scripts/sample-data.mjs remove-city bath
```

`scripts/sample-data/bath.mjs` is the fixture: eight businesses, eleven
offers, and eleven areas chosen to be awkward on purpose — a "City Centre"
that Bristol also has, two outlying towns on a different postcode prefix, and
three areas with no businesses at all.

`remove-city` refuses to run if a business that isn't sample data has joined
that city, so it can never delete real work.

**The e2e tests seed the live Supabase project.** There is no separate test
database yet, so run them deliberately rather than in a loop, and check
`cities`, `areas` and `businesses` are back to their old counts afterwards.

### What to look at by hand

With two cities seeded, at 375px as well as on a desktop:

| Page          | Should be true                                                                  |
| ------------- | ------------------------------------------------------------------------------- |
| `/`           | Hero names the city or none; the explore block lists **cities**, not mixed areas |
| `/offers`     | Filter offers **Location**; cards name their city; no "your area" anywhere       |
| `/offers/bath`| Filter offers **Area**, Bath's only; heading and title both say Bath             |
| `/explore`    | Each chip and card names its city; two City Centres, not one                     |
| `/categories` | Counts change when the city changes, and match the category page you land on     |
| `/businesses` | Same as `/offers`                                                                |

And the two journeys that are easy to get wrong:

- Open `/offers/bath` in a fresh browser, then use the **header** links. The
  city should follow you.
- Follow `/offers?area=<an area of the other city>`. It should land you in that
  city with the filter applied, not on an empty list.
- Open `/offers` in a fresh browser with no location headers. You should be
  **asked which city**, the heading should name none, and the first few cards
  should not all be from the same one.
- Choose "Everywhere" deliberately. You should not then be asked to pick.

## Decisions worth knowing

- **An unknown city or area answers 200, not 404.** The city is looked up
  inside the streaming boundary. Resolving it earlier would put the answer in
  the prerendered shell, and a city added later would keep answering "not
  found" until that shell was rebuilt — which is much worse. The not-found
  page renders correctly and is `noindex`, so nothing indexes it. (Tried and
  reverted: moving the lookup above the boundary made `/explore/bath` 404 for
  minutes after Bath went live.)
- **A business shows one city**, its first location's. A chain with branches
  in two cities appears in both cities' listings, but its card shows the first
  branch's area. Worth revisiting when a real chain joins.
- **`?area=` across two cities that both have that name** can't be resolved,
  so the listing stays as it is and each card names its city. The UI never
  generates such a link.
