import assert from "node:assert/strict";
import { test } from "node:test";

import { sortVouchers } from "@/app/dashboard/redemptions/voucher-status";

type Row = Parameters<typeof sortVouchers>[0][number];

const voucher = (id: string, status: Row["status"], dates: { claimedAt?: string; usedAt?: string }) =>
    ({
        status,
        voucher: {
            id,
            code: id,
            claimedAt: dates.claimedAt ?? null,
            usedAt: dates.usedAt ?? null,
            offer: null,
            business: null,
        },
    }) as Row;

// One list, read from the top: what they can use now, newest first,
// then the ones they can't.
test("vouchers they can use come first, newest first", () => {
    const order = sortVouchers([
        voucher("older", "ready", { claimedAt: "2026-01-01T00:00:00Z" }),
        voucher("newest", "ready", { claimedAt: "2026-06-01T00:00:00Z" }),
    ]).map((item) => item.voucher.id);

    assert.deepEqual(order, ["newest", "older"]);
});

test("used, expired and paused vouchers go to the end", () => {
    const order = sortVouchers([
        voucher("used", "used", { usedAt: "2026-06-02T00:00:00Z" }),
        voucher("expired", "expired", { claimedAt: "2026-06-03T00:00:00Z" }),
        voucher("ready", "ready", { claimedAt: "2026-01-01T00:00:00Z" }),
        voucher("paused", "unavailable", { claimedAt: "2026-06-04T00:00:00Z" }),
    ]).map((item) => item.voucher.id);

    assert.deepEqual(order, ["ready", "paused", "used", "expired"]);
});

test("a used voucher is placed by when it was used, not when it was claimed", () => {
    const order = sortVouchers([
        voucher("used-first", "used", { claimedAt: "2026-06-01T00:00:00Z", usedAt: "2026-06-02T00:00:00Z" }),
        voucher("used-later", "used", { claimedAt: "2026-01-01T00:00:00Z", usedAt: "2026-07-01T00:00:00Z" }),
    ]).map((item) => item.voucher.id);

    assert.deepEqual(order, ["used-later", "used-first"]);
});
