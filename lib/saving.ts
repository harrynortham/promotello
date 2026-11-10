// Saving from the browser, when the browser is on a train.
//
// supabase-js retries a GET three times when the request never reaches
// Supabase — a dropped connection, a sleeping phone, a blocked request —
// but never a write, because it can't know a write is safe to repeat.
// Ours are: every one sets columns to the values in front of somebody, or
// upserts on a key, so sending it twice lands the same row. That makes a
// read on these pages three dropped packets from failing and a save one,
// which is backwards: the read can be had again by reloading, and the save
// is the only thing in the session they'd have to type out again.
//
// So writes are retried here, and what's left is said in words.

export type SaveResult = {
    error: { message: string; code?: string | null } | null;
    status?: number;
};

const RETRY_DELAYS_MS = [400, 1600];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Whether the request never arrived. postgrest reports those as status 0
// with the fetch's own error for a message ("TypeError: Failed to fetch"),
// which is the one thing worth trying again by itself: anything Postgres
// answered, however unhappily, will answer the same way twice.
export function neverArrived(result: SaveResult) {
    if (!result.error) {
        return false;
    }

    return result.status === 0 || /^(TypeError|FetchError|AbortError|Error):/.test(result.error.message);
}

// Run a write, and run it again if it never left the building.
export async function tryToSave<T extends SaveResult>(
    write: () => PromiseLike<T>,
    delays: number[] = RETRY_DELAYS_MS,
): Promise<T> {
    let result = await write();

    for (const delay of delays) {
        if (!neverArrived(result)) {
            break;
        }

        await sleep(delay);
        result = await write();
    }

    return result;
}

// What to tell somebody whose save didn't land. The raw message is the last
// resort rather than the first: a shop owner reading "new row violates
// row-level security policy" learns nothing they can act on.
export function savingProblem(result: SaveResult) {
    if (!result.error) {
        return "";
    }

    if (neverArrived(result)) {
        return "We couldn't reach Promotello. Nothing you've typed has been lost — check your connection and try again.";
    }

    const code = result.error.code ?? "";
    const text = result.error.message.toLowerCase();

    // The session went stale while the page was open.
    if (result.status === 401 || code === "PGRST301" || /jwt|token is expired/.test(text)) {
        return "You've been signed out. Sign in again and we'll bring you back here.";
    }

    // Row-level security said no: they're signed in as somebody who doesn't
    // run this business.
    if (code === "42501" || /row-level security/.test(text)) {
        return "This account can't change that. Ask whoever owns the business to make you an owner or an admin.";
    }

    if (result.status === 429 || /rate limit|too many requests/.test(text)) {
        return "That was a lot of saves at once. Wait a moment and try again.";
    }

    return result.error.message || "We couldn't save that. Please try again.";
}
