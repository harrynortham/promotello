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
    // Opening hours are the thing that makes a local listing a listing
    // rather than a card: different on every page, factual, and what
    // somebody searching at six in the evening is actually after.
    hasHours: boolean;
};

export function worthIndexing({ unclaimed, description, hasHours }: PageSubstance) {
    if (!unclaimed) return true;

    return (description ?? "").trim().length >= ENOUGH_DESCRIPTION && hasHours;
}

// Why it is being held back, for the admin page. Never shown to a
// visitor: the page says nothing about its own indexing, because that
// is a conversation between us and a crawler.
export function whyNotIndexed({ unclaimed, description, hasHours }: PageSubstance) {
    if (!unclaimed) return null;

    const missing: string[] = [];

    if ((description ?? "").trim().length < ENOUGH_DESCRIPTION) missing.push("a longer description");
    if (!hasHours) missing.push("opening hours");

    return missing.length > 0 ? missing.join(" and ") : null;
}
