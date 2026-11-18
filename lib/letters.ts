import { leadAddress } from "@/lib/sales-pipeline";

// Posting a letter through Stannp.
//
// The last step of the pipeline, and the only one that reaches somebody
// who may not be emailed: a letter needs no consent, which is why a sole
// trader is reachable this way and only this way.
//
// It is also the only step that costs money and cannot be taken back —
// £0.88 and a thing through a letterbox — so everything here is built to
// make the test the easy path and the real one deliberate.

const ENDPOINT = "https://api-eu1.stannp.com/v1/letters/create";

export const STANNP_KEY = "STANNP_API_KEY";

// A template designed in the Stannp dashboard, which is where the
// letter's look belongs: it can be changed without a deploy, and their
// editor can place things our composed background cannot.
//
// Unset, the letter falls back to words plus the generated background,
// so nothing breaks while a template is being drawn.
export const STANNP_TEMPLATE = "STANNP_TEMPLATE_ID";

export function letterTemplate() {
    const id = process.env[STANNP_TEMPLATE]?.trim();

    return id && /^\d+$/.test(id) ? id : null;
}

// What Stannp actually charges for one A4 letter, read off a test
// response rather than their pricing page, which says £0.82.
export const LETTER_COST = "0.88";

export function lettersConfigured() {
    return Boolean(process.env[STANNP_KEY]?.trim());
}

// Addressed to the business, not to a person.
//
// The envelope used to carry whoever we had written down as the contact,
// and most of the time that is a first name off a contact page — "Sam"
// above "Little Loaf" reads like a letter to somebody's house rather
// than to a shop, and gets opened by whoever it is not meant for just
// as easily.
//
// The greeting inside still uses their name. "Dear Sam" in the letter
// is warm; "Sam" on the envelope is odd.
export type LetterTo = {
    company: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    postcode: string;
};

export type LetterResult =
    | { ok: true; test: boolean; pdf: string; cost: string; id: number }
    | { ok: false; reason: string };

// Everything the API is told, in one place, so the two facts that are
// not obvious from the documentation are not re-learned later:
//
//   recipient[city]  — the documentation contradicts itself: the
//                      reference lists "city", both its own example and
//                      the guide use "town". Either works on its own.
//                      Sent together they do not merge — "city" wins
//                      and "town" is dropped, proved by sending two
//                      different values and reading the sample PDF.
//                      So only one is sent, and it is the one the
//                      reference documents.
//
//   post_unverified  — defaults to TRUE at Stannp, meaning an address
//                      they could not verify is posted anyway. We send
//                      false: a letter to an address we got wrong is
//                      money spent on nothing, and we would never know.
function body(to: LetterTo, pages: string, test: boolean, background?: string, merge?: Record<string, string>) {
    const template = letterTemplate();

    return new URLSearchParams({
        test: test ? "true" : "false",
        // A template draws the page; words and a background are what a
        // letter is made of without one. Sending both would be asking
        // for two designs at once.
        ...(template ? { template } : { pages, ...(background ? { background } : {}) }),
        // Merge data rides on the recipient, which is how Stannp passes
        // anything custom — proved by sending recipient[previewurl] and
        // reading {previewurl} back off the sample PDF.
        ...Object.fromEntries(
            Object.entries(merge ?? {}).map(([field, value]) => [`recipient[${field}]`, value]),
        ),
        size: "A4",
        duplex: "false",
        post_unverified: "false",
        "recipient[company]": to.company,
        "recipient[address1]": to.addressLine1,
        "recipient[address2]": to.addressLine2 ?? "",
        "recipient[city]": to.city,
        "recipient[postcode]": to.postcode,
        "recipient[country]": "GB",
    });
}

// `live` has to be said out loud. A default of "test" that somebody
// forgets to change costs nothing; a default of "live" that somebody
// forgets to change posts to a real business.
export async function sendLetter({
    to,
    pages,
    background,
    merge,
    live = false,
    idempotencyKey,
}: {
    to: LetterTo;
    pages: string;
    // Anything the template puts on the page: the preview link, the
    // personal line, whatever it is drawn to expect.
    merge?: Record<string, string>;
    // The printed page: our letterhead and this business's QR code. A
    // URL Stannp fetches when the letter is made, because an <img> in
    // `pages` destroys the body.
    background?: string;
    live?: boolean;
    idempotencyKey?: string;
}): Promise<LetterResult> {
    const key = process.env[STANNP_KEY]?.trim();

    if (!key) return { ok: false, reason: "No Stannp API key configured." };

    // An address missing any of these is not postable, and Stannp will
    // take the money either way.
    const missing = [
        !to.addressLine1?.trim() && "a street address",
        !to.city?.trim() && "a town",
        !to.postcode?.trim() && "a postcode",
    ].filter(Boolean);

    if (missing.length > 0) {
        return { ok: false, reason: `Not posted: the lead still needs ${missing.join(", ")}.` };
    }

    let response: Response;

    try {
        response = await fetch(ENDPOINT, {
            method: "POST",
            headers: {
                Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
                "Content-Type": "application/x-www-form-urlencoded",
                // So a double press, or a retry after a timeout we never
                // saw the answer to, cannot post twice.
                ...(idempotencyKey ? { "X-Idempotency-Key": idempotencyKey } : {}),
            },
            body: body(to, pages, !live, background, merge),
            signal: AbortSignal.timeout(20_000),
        });
    } catch (error) {
        return { ok: false, reason: error instanceof Error ? error.message : "Stannp did not answer." };
    }

    const payload = (await response.json().catch(() => null)) as
        | { success?: boolean; error?: string; data?: { pdf?: string; cost?: string; id?: number; status?: string } }
        | null;

    if (!response.ok || !payload?.success || !payload.data) {
        return { ok: false, reason: payload?.error ?? `Stannp said ${response.status}.` };
    }

    // The one check worth more than all the rest: Stannp reports what it
    // actually did. If a test came back as anything but "test", the
    // letter is real, and saying so is the difference between a bug and
    // a business receiving post we did not mean to send.
    const wasTest = payload.data.status === "test";

    if (!live && !wasTest) {
        return {
            ok: false,
            reason: `Asked for a test and Stannp reported "${payload.data.status}". Treating this as real — check the Stannp dashboard.`,
        };
    }

    return {
        ok: true,
        test: wasTest,
        pdf: payload.data.pdf ?? "",
        cost: payload.data.cost ?? "",
        id: payload.data.id ?? 0,
    };
}

// Where a letter goes, from the lead. The same parts the pipeline shows
// and the same the preview is built from, so a letter cannot be
// addressed differently from the page it is about.
export function letterAddress(lead: {
    name: string;
    contact_name: string | null;
    address_line_1: string | null;
    address_line_2: string | null;
    postcode: string | null;
    cities?: { name: string } | { name: string }[] | null;
}): LetterTo | null {
    const cities = lead.cities;
    const city = (Array.isArray(cities) ? cities[0]?.name : cities?.name) ?? "";

    if (!lead.address_line_1 || !city || !lead.postcode) return null;

    return {
        company: lead.name,
        addressLine1: lead.address_line_1,
        addressLine2: lead.address_line_2,
        city,
        postcode: lead.postcode,
    };
}

// Shown before anything is sent, so the thing confirmed is the thing
// posted.
export function letterDestination(to: LetterTo) {
    return [
        to.company,
        to.addressLine1,
        to.addressLine2,
        to.city,
        to.postcode,
    ]
        .filter(Boolean)
        .join(", ");
}

export { leadAddress };
