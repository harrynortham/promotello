// What a page has to carry before we ask Google to rank it.
//
// Pages first publishes a business's page before anybody claims it, and
// an unclaimed page is a name, a category, a sentence and a map. One of
// those is a useful thing for somebody searching the business by name.
// Ten of them are ten pages with the same shape and a few words between
// them, which is thin content — and thin content at scale is assessed
// site-wide, not page by page. Ten pages is too few to matter; the same
// mechanism at five hundred is a problem that takes months to undo.
//
// So the honest fix, which is also the only one Google would call fair:
// make the page not thin, or do not submit it. This decides the second
// half. A page that does not clear the bar is still completely public —
// in the directory, on its area page, reachable, claimable, linked —
// it just carries a noindex and stays out of the sitemap until it is
// worth somebody's click.
//
// Note what is *not* here: writing a description for a business that
// has not asked us to. Generating words to clear a length check is what
// Google's own spam policy calls scaled content abuse, and it would put
// invented sentences on a page with a real business's name at the top.
// The page gets thicker from things they published themselves — the
// hours on their website, their Instagram — or it waits.

// Roughly two full sentences. Below this, the description is a label
// rather than a reason to visit: "A corner pub on Gloucester Road" tells
// somebody nothing the heading above it did not.
export const ENOUGH_DESCRIPTION = 120;

export type PageSubstance = {
    // A page we published that nobody has claimed. A claimed business is
    // a listing its owner chose to have, and that is not our call to
    // second-guess, however short they kept it.
    unclaimed: boolean;
    description: string | null | undefined;
    // Where it is. A local listing without one is a card, and the map is
    // most of what somebody came to the page for.
    hasAddress: boolean;
};

// This asked for opening hours too, until the first ten pages went
// looking for some.
//
// Not one of the eight businesses with a website published structured
// hours -- four had no JSON-LD at all, and the four that did used it for
// something else. That is what a street of independents on Wix and
// Squarespace looks like, and it made this function an off switch
// rather than a gate: a requirement nothing could ever meet, quietly
// keeping every unclaimed page out of Google for good and throwing away
// the reason for publishing them early.
//
// So hours are a bonus the crawl picks up where it can, and the bar is
// what every one of these pages can actually clear: words somebody
// wrote about this business, and somewhere to go. Eight of the ten pass
// it. The two that do not have 30 and 95 characters on them, which is
// exactly the discrimination worth making.
export function worthIndexing({ unclaimed, description, hasAddress }: PageSubstance) {
    if (!unclaimed) return true;

    return (description ?? "").trim().length >= ENOUGH_DESCRIPTION && hasAddress;
}

// Why it is being held back, for the admin page. Never shown to a
// visitor: the page says nothing about its own indexing, because that
// is a conversation between us and a crawler.
export function whyNotIndexed({ unclaimed, description, hasAddress }: PageSubstance) {
    if (!unclaimed) return null;

    const missing: string[] = [];

    if ((description ?? "").trim().length < ENOUGH_DESCRIPTION) missing.push("a longer description");
    if (!hasAddress) missing.push("an address");

    return missing.length > 0 ? missing.join(" and ") : null;
}
