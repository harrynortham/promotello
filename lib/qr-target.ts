// What a QR code opens, and whether that thing is still there.
//
// A code is printed once and then lives in a window for months, so the
// dashboard has to be able to say "this poster is advertising an offer that
// ended on the 3rd, and it has been scanned 14 times since". The scan itself
// never fails — record_qr_scan falls back to the business page — but the
// business is the one who can fix it, and only if they're told.

export type QrTargetKind = "offer" | "card" | "business" | "retired";

export type QrTarget = {
    kind: QrTargetKind;
    // Whether a scan opens what the poster promises.
    live: boolean;
    // The offer title or card name, when there is one.
    name: string | null;
    // Why it isn't live, written for the business.
    problem: string | null;
};

export type QrOffer = {
    title: string;
    approval_status: string;
    expires_at: string;
    plan_paused_at: string | null;
} | null;

export type QrLoyaltyProgram = {
    name: string;
    is_active: boolean;
    closed_at: string | null;
} | null;

export type QrCodeRow = {
    archived_at?: string | null;
    former_target?: string | null;
    offers?: QrOffer;
    loyalty_programs?: QrLoyaltyProgram;
};

// `today` is the date in the UK, passed in so this stays a pure function:
// an offer expiring today is still live, and "today" is not the server's.
export function qrTarget(code: QrCodeRow, today: string): QrTarget {
    if (code.archived_at) {
        return {
            kind: "retired",
            live: false,
            name: code.former_target ?? null,
            problem: "You retired this code. Anyone scanning the poster still lands on your page.",
        };
    }

    const offer = code.offers ?? null;

    if (offer) {
        if (offer.plan_paused_at) {
            return { kind: "offer", live: false, name: offer.title, problem: "Paused with your plan." };
        }

        if (offer.approval_status !== "approved") {
            return { kind: "offer", live: false, name: offer.title, problem: "Waiting to be reviewed." };
        }

        if (offer.expires_at < today) {
            return { kind: "offer", live: false, name: offer.title, problem: "This offer has ended." };
        }

        return { kind: "offer", live: true, name: offer.title, problem: null };
    }

    const program = code.loyalty_programs ?? null;

    if (program) {
        if (program.closed_at) {
            return {
                kind: "card",
                live: false,
                name: program.name,
                problem: "This card is closed, so nobody new can join it.",
            };
        }

        if (!program.is_active) {
            return { kind: "card", live: false, name: program.name, problem: "This card is turned off." };
        }

        return { kind: "card", live: true, name: program.name, problem: null };
    }

    // An offer that was deleted takes its id off the code with it, so a
    // code made for one is indistinguishable from a code made for the
    // business page — except for the title kept when it was deleted.
    if (code.former_target) {
        return {
            kind: "offer",
            live: false,
            name: code.former_target,
            problem: "You deleted this offer, so the poster opens your page instead.",
        };
    }

    return { kind: "business", live: true, name: null, problem: null };
}

// Codes worth telling the business about: the poster is out there, it is
// being scanned, and it isn't opening what it says it does.
export function needsAttention(target: QrTarget, scans: number) {
    return !target.live && scans > 0;
}

export function todayInUk(now = new Date()) {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(now);
}
