import assert from "node:assert/strict";
import { test } from "node:test";

import { neverArrived, savingProblem, tryToSave } from "@/lib/saving";

const dropped = { error: { message: "TypeError: Failed to fetch", code: "" }, status: 0 };
const saved = { error: null, status: 204 };

test("a request that never arrived is the one worth repeating", () => {
    assert.equal(neverArrived(dropped), true);
    assert.equal(neverArrived({ error: { message: "FetchError: network error" } }), true);
    assert.equal(neverArrived(saved), false);
    // Postgres answered. It will answer the same way again.
    assert.equal(
        neverArrived({ error: { message: "new row violates check constraint", code: "23514" }, status: 400 }),
        false,
    );
});

test("a dropped save is sent again, and gives up in the end", async () => {
    let attempts = 0;

    const landed = await tryToSave(async () => {
        attempts += 1;
        return attempts < 3 ? dropped : saved;
    }, [0, 0]);

    assert.equal(attempts, 3);
    assert.equal(landed.error, null);

    attempts = 0;
    const failed = await tryToSave(async () => {
        attempts += 1;
        return dropped;
    }, [0, 0]);

    assert.equal(attempts, 3, "the first go and two more");
    assert.equal(failed.error?.message, "TypeError: Failed to fetch");
});

test("a save that worked is only sent once", async () => {
    let attempts = 0;

    await tryToSave(async () => {
        attempts += 1;
        return saved;
    }, [0, 0]);

    assert.equal(attempts, 1);
});

test("what's left is said in words a shop owner can act on", () => {
    assert.match(savingProblem(dropped), /check your connection/);
    assert.match(savingProblem({ error: { message: "JWT expired", code: "PGRST301" }, status: 401 }), /signed out/);
    assert.match(
        savingProblem({ error: { message: 'new row violates row-level security policy for table "business_hours"', code: "42501" }, status: 403 }),
        /can't change that/,
    );
    assert.equal(savingProblem(saved), "");
    // Anything unrecognised still says what Supabase said, rather than
    // hiding a real bug behind a kind sentence.
    assert.equal(
        savingProblem({ error: { message: "duplicate key value violates unique constraint", code: "23505" }, status: 409 }),
        "duplicate key value violates unique constraint",
    );
});
