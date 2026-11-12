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
