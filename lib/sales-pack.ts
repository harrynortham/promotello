// Every word of the sales pack, in one place.
//
// The pack is six sheets printed from app/sales-pack/[businessId], and
// the one thing it must never be is out of date. So the features and
// the prices are read from where the product already keeps them
// (lib/plan-features.ts, lib/billing.ts), and everything that is
// writing rather than data is here — one named block per sheet, so a
// sentence can be changed without going near the page that draws it.
//
// Who it is for: somebody who runs one shop, reading it standing up,
// having met us thirty seconds ago. Every sheet leads with the problem
// they already have, not with what we built. Staff scan on a phone;
// there is no hardware and nothing to install.

// The order is the one in the README's "What to show, in this
// order": the page they already have, then something physical in the
// window, then a customer claiming, then a customer joining the card,
// then the price, then the numbers that turn a trial into a renewal.
// Offers come before the card on purpose — an offer is what puts
// somebody through the door the first time; the card is what brings
// them back.
//
// Short labels: they are the eyebrow over each sheet, so they say
// which sheet it is rather than repeating its heading.
export const SHEETS = [
    "What this does",
    "The directory",
    "The poster",
    "The offers",
    "The card",
    "What you get",
    "The numbers",
] as const;

export const cover = {
    eyebrow: "Promotello",
    promise: "A page that brings people in, a card that brings them back, and the numbers that say which of the two did it.",
    points: [
        {
            heading: "People are already looking",
            body: "They search for somewhere nearby before they walk out of the house. Your page is where they land: your offers, your hours, your photos, in a directory of independents rather than a list of chains.",
        },
        {
            heading: "Coming back is the whole business",
            body: "A first visit costs money to win. A digital stamp card on their phone is what makes the second and the fifth one happen, and it cannot be lost, forged or left in a coat pocket.",
        },
        {
            heading: "And you get told whether it worked",
            body: "Not views and clicks. First-time customers we sent you, how many came back, and how many turned into regulars — counted from people who actually walked in.",
        },
    ],
    footer: "Nothing to install. No hardware. Your staff use the phone already in their pocket.",
};

export const cardSheet = {
    heading: "The card they keep on their phone",
    problem:
        "Paper cards go through the wash, get photocopied, and need reprinting every few months. Worse, you never find out who is collecting on one.",
    steps: [
        "They scan the code on your counter once. The card is in their phone — no app to download, no account needed.",
        "Every visit, they hold out the phone and a member of staff scans it on the shop's phone. One tap, one stamp.",
        "When the card is full it says so, in their hand and on your screen, and staff mark the reward as given.",
        "It starts again on its own. Nothing to reprint, nothing to reissue.",
    ],
    // What the panel beside the QR says on a printed sheet, where the
    // card is a picture of one rather than somebody's own.
    scanTitle: "This is what your customer holds",
    scanHint: "Your staff scan it on the shop's phone to add a stamp.",
    asides: [
        {
            heading: "It can't be gamed",
            body: "Only your staff can add a stamp, and only from an account you gave them. A customer cannot stamp their own card.",
        },
        {
            heading: "You choose the deal",
            body: "How many stamps, what the reward is, what it is called, and the colours it is in. Change your mind whenever you like.",
        },
        {
            heading: "And you can stop",
            body: "Close a card and the people holding one finish it and claim what you promised — then it quietly ends. Nobody is left mid-card.",
        },
    ],
};

export const offerSheet = {
    heading: "An offer that puts somebody through the door this week",
    problem:
        "A discount in the window is seen by people already walking past. The ones who have never been are the ones worth reaching.",
    steps: [
        "You write the offer: what it is, when it can be used, and how many you will give away.",
        "It goes live on your page and across the directory once we have read it over — usually the same day.",
        "A customer claims it on their phone and brings a code in with them.",
        "Staff scan or type the code and mark it used. It can only be used once, and the screen says so if somebody tries twice.",
    ],
    asides: [
        {
            heading: "You stay in control",
            body: "Cap the number, set the days and hours it runs, or end it early. An expired code tells staff exactly that.",
        },
        {
            heading: "Quiet hours, enforced",
            body: "On Growth, an offer set for weekday afternoons will not mark as used on a Saturday lunchtime. Your staff don't have to be the ones saying no.",
        },
    ],
};

export const directorySheet = {
    heading: "Where people find you",
    problem:
        "Being findable is not one page. It is being in the right list at the moment somebody is deciding where to go.",
    places: [
        {
            heading: "Your own page",
            body: "Your photos, your description, your hours, your offers and your card — on a web address you can print on anything.",
        },
        {
            heading: "Your city and your area",
            body: "The city listing, and the part of town you are actually in, so somebody looking locally finds you first.",
        },
        {
            heading: "Your category",
            body: "The people who want exactly what you do, browsing the kind of business you are.",
        },
        {
            heading: "Search, and the rest of the web",
            body: "Your page and every offer get their own search-engine listing, written properly, with your name on it.",
        },
    ],
    // The poster had a line here until it earned a sheet of its own,
    // which is the very next one.
    extras: [
        "Share links and ready-made images for Instagram, so putting an offer out takes a minute.",
        "An email to everybody following you, every time you publish something new.",
    ],
};

export const posterSheet = {
    heading: "A poster in your window, and who scanned it",
    problem:
        "The people already walking past your door are the cheapest customers you will ever get, and nothing in your window tells them there is an offer inside.",
    steps: [
        "We make the poster: your name, your logo, your colours, and a code that belongs to you.",
        "Print it on your own printer — A4 for the window, A5 for the counter, or two to a sheet for tables.",
        "Somebody points their phone camera at it and lands on your page, your offer or your card. Nothing to download.",
        "Every scan is counted, poster by poster, so you can see which spot is pulling and which one is wallpaper.",
    ],
    asides: [
        {
            heading: "One for every spot",
            body: "The window, the counter, the tables, the back of the receipt. Each one is counted separately, so you find out where people actually look.",
        },
        {
            heading: "A scan never dead-ends",
            body: "If the offer a poster points at has finished, the code opens your page instead. The sheet on the wall keeps working.",
        },
        {
            heading: "Nothing to buy",
            body: "Your own printer and a bit of tape. No stickers to order, no stands, no hardware with a monthly fee attached.",
        },
    ],
    // The poster on the sheet is drawn from their own name and colours,
    // but it opens their page rather than carrying a live code: a scan
    // off a sales sheet would land in their poster's own count.
    caption: "Made from your name, your logo and your colours. Yours prints with its own code on it, and there are six arrangements to choose from.",
};

export const priceSheet = {
    heading: "What you get, and what it costs",
    blurb:
        "One price, every month, no commission on anything you sell. Cancel whenever you like and the page stays up.",
    note: "Prices per shop, per month, VAT included. Yearly is two months free.",
};

export const reportSheet = {
    heading: "The number nobody else can print",
    blurb:
        "A loyalty app can tell you how many stamps it gave out. It cannot tell you where the customer came from, because it was not there for the first visit. We were.",
    how: [
        "Somebody claims an offer or joins your card — that is us putting you in front of them.",
        "They come in. A voucher marked used or a stamp added is a visit, because somebody was standing in your shop.",
        "If the first happened at least an hour before the second, we count them as one we sent you. Not a minute before — joining the card at your counter is already being in the shop.",
    ],
    caution:
        "It is deliberately the cautious count. Page views and scans are anonymous by design, so neither is counted towards it. The real number is higher than this one; it is never lower.",
};

// The example used where a business has nothing of its own yet — a new
// page with no card, no live offer or no visits. It is plainly labelled
// as an example on the sheet, and it is written here rather than read
// from the demo business, which is hidden by RLS from everybody but an
// admin (20270102090000_a_business_only_we_can_see.sql).
export const EXAMPLE = {
    label: "An example, until yours has one",
    card: {
        businessName: "Quayside Coffee",
        name: "Coffee card",
        stampsRequired: 6,
        reward: "A free coffee of your choice",
        stamps: 4,
        terms: "One stamp per visit.",
    },
    offer: {
        discount: "Free pastry",
        title: "Free pastry with any hot drink before 10am",
        description:
            "Start the day properly: order any coffee or tea before ten and take a pastry from the counter on us.",
        availability: "Weekdays until 10:00",
        terms: "One per customer per visit.",
    },
    report: "Promotello sent you 41 first-time customers in the last 3 months. 12 came back. 5 are now regulars.",
};

// A file name somebody can find again, and that no operating system
// objects to. The same shape as the staff guide's.
export function printableName(businessName: string | null | undefined) {
    const name = (businessName ?? "")
        .replace(/[\\/:*?"<>|]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    return name ? `${name} - Promotello` : "Promotello";
}

// Which sheets carry an example instead of the business's own thing.
// Pure, so the page can't disagree with itself about what it is showing
// (tests/unit/sales-pack.test.ts).
export function examplesNeeded(what: {
    hasCard: boolean;
    hasOffer: boolean;
    hasReport: boolean;
}) {
    return {
        card: !what.hasCard,
        offer: !what.hasOffer,
        report: !what.hasReport,
    };
}
