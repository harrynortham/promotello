// Google as an index of who exists, not as a source of what we keep.
//
// The Places policies permit storing place_id indefinitely, permit
// coordinates for thirty days, and name "copy and save business names,
// addresses" as a prohibited use. Their own advice is to "store exempt
// identifiers such as the place ID to fetch fresh details when a user
// interacts with a place", which is what the importer does: Google says
// who is on the street, the business's own website says the rest
// (lib/lead-enrichment.ts).
//
// So the field mask here is deliberately short. Asking for less is
// cheaper, and every field asked for is one somebody might be tempted to
// store.

const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";

// id is the place_id. websiteUri is theirs, published by them, and what
// the crawler is pointed at. The name and address are read by a human
// before importing and deleted after thirty days.
const FIELDS = [
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.websiteUri",
    "nextPageToken",
].join(",");

// Text Search returns at most 60 results across all pages, 20 to a page.
// That is a hard ceiling, not a paging convenience: a street with more
// businesses than that on it cannot be had in one query, which is why
// the sweep asks once per trade rather than once per street.
export const PAGE_SIZE = 20;
export const MAX_RESULTS = 60;

export type PlaceResult = {
    placeId: string;
    name: string;
    address: string | null;
    website: string | null;
};

// "Cafés & coffee" on "Gloucester Road" becomes the sentence somebody
// would type into Maps. The ampersand and the accents are left in:
// Google reads them, and stripping them changed what came back.
export function placesQuery(category: string, area: string, city: string) {
    return `${category} on ${area}, ${city}`;
}

type SearchPage = {
    places?: {
        id?: string;
        displayName?: { text?: string };
        formattedAddress?: string;
        websiteUri?: string;
    }[];
    nextPageToken?: string;
};

// A box on the map. Used to ask the same question of half a street at
// a time, and never stored: coordinates may only be kept thirty days
// and there is no reason to keep these at all.
export type Rectangle = {
    low: { latitude: number; longitude: number };
    high: { latitude: number; longitude: number };
};

async function onePage(
    key: string,
    textQuery: string,
    pageToken?: string,
    within?: Rectangle,
): Promise<SearchPage> {
    const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": key,
            "X-Goog-FieldMask": FIELDS,
        },
        // Every parameter but the token has to match the first call, or
        // the API refuses the page with INVALID_ARGUMENT.
        body: JSON.stringify({
            textQuery,
            pageSize: PAGE_SIZE,
            ...(within ? { locationRestriction: { rectangle: within } } : {}),
            ...(pageToken ? { pageToken } : {}),
        }),
    });

    if (!response.ok) {
        const body = (await response.text()).slice(0, 300);

        throw new Error(`Places returned ${response.status}: ${body}`);
    }

    return (await response.json()) as SearchPage;
}

// Everything one query can give, which is never more than sixty.
//
// Stops on a missing token as well as on the ceiling: a street with
// eleven bakeries returns one page and no token, and a loop that only
// watched the count would ask forever.
export async function searchPlaces(
    textQuery: string,
    {
        key = process.env.GOOGLE_PLACES_API_KEY,
        onRequest,
        within,
    }: { key?: string; onRequest?: () => void; within?: Rectangle } = {},
) {
    if (!key) throw new Error("GOOGLE_PLACES_API_KEY is not set.");

    const found: PlaceResult[] = [];
    let token: string | undefined;

    do {
        // Counted, because every one is billed and a sweep makes
        // hundreds. A number nobody can see is a number nobody can
        // budget for.
        onRequest?.();

        const page: SearchPage = await onePage(key, textQuery, token, within);

        for (const place of page.places ?? []) {
            if (!place.id || !place.displayName?.text) continue;

            found.push({
                placeId: place.id,
                name: place.displayName.text,
                address: place.formattedAddress ?? null,
                website: place.websiteUri ?? null,
            });
        }

        token = page.nextPageToken;
    } while (token && found.length < MAX_RESULTS);

    return found.slice(0, MAX_RESULTS);
}

// The same search, saying whether Google ran out of room.
//
// Sixty is a ceiling, and a query that comes back full has almost
// certainly been cut off — there is no way to ask for the sixty-first.
// A sweep that quietly stops at sixty "restaurants" on a busy street
// has missed businesses and said nothing, which is the one thing worth
// knowing when the whole point is to have found everybody.
//
// The answer is to ask a narrower question: "pizza restaurant" and
// "curry house" rather than "restaurant".
export async function searchPlacesReportingLimit(
    textQuery: string,
    options: { key?: string; onRequest?: () => void; within?: Rectangle } = {},
) {
    const places = await searchPlaces(textQuery, options);

    return { places, hitTheLimit: places.length >= MAX_RESULTS };
}

// Whether a result is actually in the area that was asked for.
//
// Google reads "cafes on Gloucester Road, Bristol" as a hint, not a
// boundary: a sweep of Gloucester Road came back 747 businesses, of
// which 313 were on it and the rest were anywhere in Bristol. Importing
// all of them would bury the street in its own city.
//
// Matched on the address text rather than on coordinates, because the
// address is what Google returns in the same call and coordinates may
// only be kept thirty days. "Gloucester Road" has to match "Gloucester
// Rd", and a neighbourhood like Bishopston appears in the address line
// as itself.
const SHORTENED: Record<string, string> = {
    road: "rd",
    street: "st",
    avenue: "ave",
    lane: "ln",
    place: "pl",
    square: "sq",
    hill: "hl",
    park: "pk",
};

function forComparing(value: string) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => SHORTENED[word] ?? word)
        .join(" ");
}

// Matched a whole part at a time, not as a substring. "115 Gloucester
// Road North, Filton" contains "gloucester rd" and is a different
// street in a different suburb; it came through the first version of
// this and became a lead.
//
// So: split on the commas, drop the house number off the front of each
// part, and ask whether any part is the area exactly.
// "79 81 gloucester rd" and "13a gloucester rd" are both on Gloucester
// Road. Only the leading number words go: "gloucester rd north" keeps
// its north, which is the whole point.
function withoutHouseNumber(part: string) {
    const words = part.split(" ");

    while (words.length > 1 && /^[0-9]+[a-z]?$/.test(words[0])) {
        words.shift();
    }

    return words.join(" ");
}

export function inTheArea(address: string | null, area: string, city?: string) {
    if (!address) return false;

    // The city, where we know it. London has a Gloucester Road too, and
    // a sweep of ours picked up a jeweller on it in South Kensington —
    // right street, wrong country end.
    if (city && !forComparing(address).includes(forComparing(city))) return false;

    const wanted = forComparing(area);

    return address
        .split(",")
        .map((part) => forComparing(part))
        // The house number comes off the front, however it is written:
        // "79-81" flattens to two words and "13A" is not plain digits.
        // What is left is the street, and "gloucester rd north" is not
        // "gloucester rd".
        .map(withoutHouseNumber)
        .some((part) => part === wanted);
}

// Trades beyond Promotello's own categories.
//
// The categories exist to sort a directory of consumer offers; they are
// not a census of a high street. Sweeping Gloucester Road with the
// forty-four of them found 312 businesses, and eighteen trades they do
// not cover added fifty-four more — estate agents, solicitors, charity
// shops, locksmiths, nurseries.
//
// Google documents around 478 place types, but they are not the right
// vocabulary either: they are American ("thrift_store", "drugstore"),
// most of them are irrelevant to a street (national_park, airstrip,
// administrative_area_level_1), and Text Search reads words rather than
// type strings. "charity shop" found eleven; "thrift store" would have
// found a handful.
//
// So this is Table A's useful half, said the way a British person would
// say it. A trade here has no Promotello category, and the candidate is
// stored without one — whoever decides the lead is worth writing to
// picks it then.
export const EXTRA_TRADES = [
    // Professional and property
    "estate agent", "letting agent", "solicitor", "accountant", "insurance broker",
    "mortgage adviser", "financial adviser", "recruitment agency", "architect",
    "surveyor", "print shop", "sign maker", "photographer", "graphic designer",
    "marketing agency", "web designer", "coworking space", "office space",

    // Trades and repair
    "locksmith", "plumber", "electrician", "builder", "roofer", "painter and decorator",
    "carpenter", "glazier", "boiler service", "appliance repair", "shoe repair",
    "key cutting", "upholsterer", "picture framing", "watch repair",

    // Shops a high street has
    "charity shop", "hardware store", "diy shop", "furniture shop", "homeware shop",
    "gift shop", "card shop", "toy shop", "stationery shop", "art supplies",
    "craft shop", "fabric shop", "haberdashery", "garden centre", "florist",
    "greengrocer", "off licence", "wine shop", "health food shop", "zero waste shop",
    "asian supermarket", "polish shop", "halal butcher", "fishmonger", "farm shop",
    "sweet shop", "vape shop", "tobacconist", "pawnbroker", "antiques shop",
    "furniture restorer", "electrical shop", "computer shop", "games shop",
    "model shop", "pet shop", "aquarium shop", "cycle shop", "outdoor shop",
    "golf shop", "music shop", "instrument shop", "record shop", "camera shop",
    // The plain words for the three categories added in
    // 20270224090000. A category's name sorts the directory; it is a
    // poor thing to ask Google — "Off-licence & wine" found two on
    // Gloucester Road where "off licence" and "wine shop" found ten
    // between them.
    "sports shop", "running shop", "game shop", "baby shop", "kids clothes",

    // Food and drink the categories miss
    "sandwich shop", "deli", "juice bar", "bubble tea", "street food",
    "fish and chip shop", "kebab shop", "pizza takeaway", "curry house",
    "chinese takeaway", "thai restaurant", "turkish restaurant", "vegan restaurant",
    "brunch spot", "wine bar", "cocktail bar", "micropub", "brewery", "bottle shop",

    // Health, care and learning
    "nursery", "preschool", "after school club", "tutor", "music teacher",
    "driving instructor", "language school", "dance school", "martial arts",
    "pilates studio", "climbing wall", "swimming pool", "osteopath", "chiropractor",
    "acupuncture", "counsellor", "podiatrist", "audiologist", "veterinary surgery",
    "dog groomer", "dog walker", "care agency",

    // The rest of a street
    "post office", "bank", "building society", "funeral director", "travel agent",
    "launderette", "dry cleaner", "tailor", "barbers", "nail bar", "tanning salon",
    "tattoo studio", "piercing studio", "art gallery", "community centre",
    "church", "village hall", "storage", "car hire", "taxi firm", "mot centre",
];

// Where an area is, so the same question can be asked of part of it.
//
// Sixty is Google's ceiling for a query and there is no way to ask for
// the sixty-first — but there is a way to ask a smaller question.
// "restaurants on Gloucester Road" returns sixty; the same search over
// the north half and the south half returns ninety-eight between them.
export async function areaViewport(
    textQuery: string,
    { key = process.env.GOOGLE_PLACES_API_KEY } = {},
): Promise<Rectangle | null> {
    if (!key) throw new Error("GOOGLE_PLACES_API_KEY is not set.");

    const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": key,
            "X-Goog-FieldMask": "places.viewport",
        },
        body: JSON.stringify({ textQuery, pageSize: 1 }),
    });

    if (!response.ok) return null;

    const body = (await response.json()) as { places?: { viewport?: Rectangle }[] };
    const viewport = body.places?.[0]?.viewport;

    return viewport?.low && viewport?.high ? viewport : null;
}

// An area cut into bands, north to south.
//
// A street is longer than it is wide, so the cut runs across it: two
// bands of Gloucester Road are its north half and its south half,
// which is how a shopper would describe it too.
export function splitViewport(viewport: Rectangle, bands: number): Rectangle[] {
    const south = viewport.low.latitude;
    const north = viewport.high.latitude;
    const step = (north - south) / bands;

    return Array.from({ length: bands }, (_, at) => ({
        low: { latitude: south + step * at, longitude: viewport.low.longitude },
        high: { latitude: south + step * (at + 1), longitude: viewport.high.longitude },
    }));
}
