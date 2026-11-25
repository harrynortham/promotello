// What a bio page is made of, and the order it comes in.
//
// One list, used by three things: the page that renders it, the screen
// that arranges it, and the tests. A business with no bio_sections rows
// gets DEFAULT_ORDER, so a page nobody has touched looks exactly as it
// did before any of this existed.
//
// Adding a kind here is not enough on its own -- the check constraint
// on bio_sections.kind has to learn it too, or the row cannot be saved.

export const BIO_KINDS = [
    "notice",
    "offers",
    "loyalty",
    "links",
    "booking",
    "menu",
    "hours",
    "find_us",
    "call",
    "whatsapp",
    "website",
    "review",
    "photos",
    "socials",
] as const;

export type BioKind = (typeof BIO_KINDS)[number];

// The order a page takes when nobody has arranged it. Offers first
// because it is the only thing somebody can take away today, the card
// under it, and the ways to reach them below both.
export const DEFAULT_ORDER: readonly BioKind[] = BIO_KINDS;

export type BioSection = { kind: BioKind; position: number; enabled: boolean };

export type BioSectionRow = { kind: string; position: number | null; enabled: boolean | null };

function isKind(value: string): value is BioKind {
    return (BIO_KINDS as readonly string[]).includes(value);
}

// The saved arrangement, with anything missing filled in from the
// default. A kind added to the product after a business last saved
// must still appear for them, at the bottom and switched on, or it
// would be invisible to everybody who arranged their page before it
// existed.
export function arrangement(rows: BioSectionRow[] | null | undefined): BioSection[] {
    const saved = new Map<BioKind, BioSection>();

    for (const row of rows ?? []) {
        if (!isKind(row.kind)) continue;

        saved.set(row.kind, {
            kind: row.kind,
            position: row.position ?? 0,
            enabled: row.enabled ?? true,
        });
    }

    if (saved.size === 0) {
        return DEFAULT_ORDER.map((kind, index) => ({ kind, position: index, enabled: true }));
    }

    const highest = Math.max(...[...saved.values()].map((section) => section.position), -1);
    let next = highest + 1;

    const all = DEFAULT_ORDER.map(
        (kind) => saved.get(kind) ?? { kind, position: next++, enabled: true },
    );

    return all.sort((a, b) => a.position - b.position || DEFAULT_ORDER.indexOf(a.kind) - DEFAULT_ORDER.indexOf(b.kind));
}

// Moving one row. Returns the whole list renumbered from zero, because
// a saved position with gaps in it is a position that drifts.
export function moved(sections: BioSection[], kind: BioKind, direction: -1 | 1): BioSection[] {
    const order = [...sections];
    const from = order.findIndex((section) => section.kind === kind);
    const to = from + direction;

    if (from === -1 || to < 0 || to >= order.length) return renumbered(order);

    [order[from], order[to]] = [order[to], order[from]];

    return renumbered(order);
}

export function renumbered(sections: BioSection[]): BioSection[] {
    return sections.map((section, index) => ({ ...section, position: index }));
}

// A url somebody typed. http(s) only: a bio page that can carry a
// javascript: or data: url is a bio page that can carry anything.
export function tidyUrl(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

    try {
        const url = new URL(withScheme);
        if (url.protocol !== "http:" && url.protocol !== "https:") return null;
        if (!url.hostname.includes(".")) return null;

        return url.toString();
    } catch {
        return null;
    }
}

// A notice stops being true on its date rather than being deleted: the
// business writes "Closed Sunday 24th" once and does not have to
// remember to take it down.
export function noticeShowing(
    notice: string | null | undefined,
    until: string | null | undefined,
    today = new Date(),
): string | null {
    const words = notice?.trim();
    if (!words) return null;

    if (until) {
        // Compared as dates, not instants: a notice for the 24th is up
        // all through the 24th wherever the reader is.
        const ends = new Date(`${until}T23:59:59Z`);
        if (Number.isNaN(ends.getTime()) || ends.getTime() < today.getTime()) return null;
    }

    return words;
}

export function waUrl(number: string): string | null {
    const digits = number.replace(/[^0-9]/g, "");
    if (digits.length < 8) return null;

    // 07… is how a UK number is written and not how it is dialled from
    // abroad, which is what a wa.me link is.
    const international = digits.startsWith("0") ? `44${digits.slice(1)}` : digits;

    return `https://wa.me/${international}`;
}

// Their colour on their page.
//
// The same six the loyalty card offers, so a business that has chosen
// a colour once is not asked to choose a different one for the page it
// sits on. Promotello coral is the default and the seventh option
// rather than an absence -- a business that picks it has decided, and
// one that never opens this gets it anyway.
//
// Stored as a hex on businesses.bio_accent, null meaning coral, so
// nothing has to be migrated when the palette changes.
export const BIO_CORAL = "#FF593F";

export function bioAccent(value: string | null | undefined): string {
    const hex = value?.trim();
    return hex && /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : BIO_CORAL;
}

// Readable text on top of it. The palette runs from a near-black navy
// to a mid coral, and white holds on all of them, but a business can
// be given a free hand later and this is where that would be decided.
export function inkOn(hex: string): string {
    const value = hex.replace("#", "");
    const [r, g, b] = [0, 2, 4].map((at) => parseInt(value.slice(at, at + 2), 16) / 255);
    // Rec. 709, which is close enough for a choice between two inks.
    const light = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    return light > 0.6 ? "#17233B" : "#FFFFFF";
}

// The six on offer, plus coral. Taken from the loyalty card's palette
// rather than a second list, so a business that chose a colour once is
// not asked to choose a different one for the page it sits on.
export const BIO_ACCENTS: { label: string; hex: string }[] = [
    { label: "Coral", hex: BIO_CORAL },
    { label: "Navy", hex: "#17233B" },
    { label: "Forest", hex: "#1F4034" },
    { label: "Plum", hex: "#3C2342" },
    { label: "Ocean", hex: "#13404F" },
    { label: "Charcoal", hex: "#2B2B2B" },
];
