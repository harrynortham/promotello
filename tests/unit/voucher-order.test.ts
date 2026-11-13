import assert from "node:assert/strict";
import { test } from "node:test";

import { sortVouchers } from "@/app/dashboard/redemptions/voucher-status";

type Row = Parameters<typeof sortVouchers>[0][number];

const voucher = (
    id: string,
    status: Row["status"],
    dates: { claimedAt?: string; usedAt?: string; expiresAt?: string },
) =>
    ({
        status,
        voucher: {
            id,
            code: id,
            claimedAt: dates.claimedAt ?? null,
            usedAt: dates.usedAt ?? null,
            offer: dates.expiresAt ? { expiresAt: dates.expiresAt } : null,
            business: null,
        },
    }) as unknown as Row;

// One list, read from the top: the one they just claimed, then what is
// running out, then what they can no longer use.
test("the voucher they just claimed is first, whatever its dates say", () => {
    const order = sortVouchers([
        voucher("ends-tomorrow", "ready", { claimedAt: "2026-01-01T00:00:00Z", expiresAt: "2026-06-02" }),
        voucher("just-claimed", "ready", { claimedAt: "2026-06-01T12:00:00Z", expiresAt: "2026-12-31" }),
        voucher("ends-next-week", "ready", { claimedAt: "2026-02-01T00:00:00Z", expiresAt: "2026-06-08" }),
    ]).map((item) => item.voucher.id);

    assert.deepEqual(order, ["just-claimed", "ends-tomorrow", "ends-next-week"]);
});

test("after it, the ones running out come before the ones that are not", () => {
    const order = sortVouchers([
        voucher("newest", "ready", { claimedAt: "2026-06-01T00:00:00Z" }),
        voucher("no-end-date", "ready", { claimedAt: "2026-05-01T00:00:00Z" }),
        voucher("ends-soon", "ready", { claimedAt: "2026-01-01T00:00:00Z", expiresAt: "2026-06-10" }),
    ]).map((item) => item.voucher.id);

    assert.deepEqual(order, ["newest", "ends-soon", "no-end-date"]);
});

test("two without an end date fall back to when they were claimed", () => {
    const order = sortVouchers([
        voucher("newest", "ready", { claimedAt: "2026-06-01T00:00:00Z" }),
        voucher("oldest", "ready", { claimedAt: "2026-01-01T00:00:00Z" }),
        voucher("middle", "ready", { claimedAt: "2026-03-01T00:00:00Z" }),
    ]).map((item) => item.voucher.id);

    assert.deepEqual(order, ["newest", "middle", "oldest"]);
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

test("a wallet with one voucher in it is that voucher", () => {
    const one = voucher("only", "ready", { claimedAt: "2026-06-01T00:00:00Z" });

    assert.deepEqual(sortVouchers([one]).map((item) => item.voucher.id), ["only"]);
    assert.deepEqual(sortVouchers([]), []);
});

test("a used voucher is placed by when it was used, not when it was claimed", () => {
    const order = sortVouchers([
        voucher("used-first", "used", { claimedAt: "2026-06-01T00:00:00Z", usedAt: "2026-06-02T00:00:00Z" }),
        voucher("used-later", "used", { claimedAt: "2026-01-01T00:00:00Z", usedAt: "2026-07-01T00:00:00Z" }),
    ]).map((item) => item.voucher.id);

    assert.deepEqual(order, ["used-later", "used-first"]);
});
