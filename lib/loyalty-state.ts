// What a stamp card is, in one word.
//
// The rules themselves live in the database — add_loyalty_stamp() and
// redeem_loyalty_reward() are the only things that can refuse a stamp or
// finish a card (20261226090000_a_closed_card_gets_one_last_lap.sql).
// This is the reading of a card that every screen shows, written down
// once so the staff page, the customer's list and a card on its own
// never disagree about what somebody is holding.
//
// Imports nothing, so it unit tests on its own
// (tests/unit/loyalty-state.test.ts).

export type LoyaltyCardState =
    // Filling, and the business is still handing this card out.
    | "collecting"
    // Filling, but closed: the last one they will get of these.
    | "last-lap"
    // Full. On a closed card this is as far as it goes.
    | "reward-ready"
    // Claimed and closed: finished for good, kept as history.
    | "finished";

export function cardState({
    stamps,
    stampsRequired,
    closed = false,
    finished = false,
}: {
    stamps: number;
    stampsRequired: number;
    // The programme has stopped taking new joiners.
    closed?: boolean;
    finished?: boolean;
}): LoyaltyCardState {
    if (finished) return "finished";
    if (stamps >= stampsRequired) return "reward-ready";

    return closed ? "last-lap" : "collecting";
}

// A finished card stays in the customer's list, under the cards they are
// still collecting on. Everything else keeps the order it arrived in.
export function liveCardsFirst(
    a: { finished?: boolean },
    b: { finished?: boolean },
) {
    return Number(a.finished ?? false) - Number(b.finished ?? false);
}

// ---------------------------------------------------------------------------
// A wallet with more than a couple of cards in it
// ---------------------------------------------------------------------------
//
// Three groups, the way the vouchers wallet next door has three: what
// can be claimed now, what is being collected, and what is done. The
// order inside each is the question somebody opening their phone at a
// counter is asking — which can I use, and which am I closest to — so
// no screen has to decide it for itself.

export type LoyaltyGroup = "ready" | "collecting" | "finished";

export const LOYALTY_GROUPS: LoyaltyGroup[] = ["ready", "collecting", "finished"];

type Groupable = {
    stamps: number;
    stampsRequired: number;
    closed?: boolean;
    finished?: boolean;
    // When it was last stamped, and when it was finished, as ISO
    // strings. Both are only ever compared with each other.
    lastStampedAt?: string | null;
    finishedAt?: string | null;
};

export function groupOf(card: Groupable): LoyaltyGroup {
    const state = cardState(card);

    if (state === "finished") return "finished";
    if (state === "reward-ready") return "ready";

    return "collecting";
}

// How far round the card they are, as a fraction. A card past full is
// still one card's worth: what matters is that it is ready.
function progress(card: Groupable) {
    return card.stampsRequired > 0 ? Math.min(card.stamps / card.stampsRequired, 1) : 0;
}

// Most recently touched first, and a card nobody has stamped yet last.
function byLatest(a: string | null | undefined, b: string | null | undefined) {
    return (b ?? "").localeCompare(a ?? "");
}

export function groupCards<T extends Groupable>(cards: T[]): Record<LoyaltyGroup, T[]> {
    const of = (group: LoyaltyGroup) => cards.filter((card) => groupOf(card) === group);

    return {
        // The one they were last stamped on is the shop they were in
        // last, which is the reward they are most likely there to claim.
        ready: of("ready").sort((a, b) => byLatest(a.lastStampedAt, b.lastStampedAt)),
        // Closest to a reward first: the card worth getting out.
        collecting: of("collecting").sort(
            (a, b) => progress(b) - progress(a) || byLatest(a.lastStampedAt, b.lastStampedAt),
        ),
        // History, newest first.
        finished: of("finished").sort((a, b) => byLatest(a.finishedAt, b.finishedAt)),
    };
}

// The wallet as one list: what can be claimed, then what is closest to
// being claimed, then what is done with. A full card has the most
// stamps on it, so this is simply the order somebody would put them in
// themselves, with the cards they can no longer collect on at the end.
export function sortCards<T extends Groupable>(cards: T[]): T[] {
    const groups = groupCards(cards);

    return [...groups.ready, ...groups.collecting, ...groups.finished];
}
