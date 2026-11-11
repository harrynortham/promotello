import assert from "node:assert/strict";
import { test } from "node:test";

import { timeAgo } from "@/lib/uk-time";

// A Tuesday afternoon in winter, so UK time is GMT.
const now = new Date("2026-01-20T14:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

const minute = 60_000;
const hour = 60 * minute;
const day = 24 * hour;

test("the newest ones are counted in minutes, then hours", () => {
    assert.equal(timeAgo(ago(5_000), now), "Just now");
    assert.equal(timeAgo(ago(minute), now), "1 minute ago");
    assert.equal(timeAgo(ago(5 * minute), now), "5 minutes ago");
    assert.equal(timeAgo(ago(59 * minute), now), "59 minutes ago");
    assert.equal(timeAgo(ago(hour), now), "1 hour ago");
    assert.equal(timeAgo(ago(5 * hour), now), "5 hours ago");
});

test("a clock that is ahead of ours doesn't read as the future", () => {
    assert.equal(timeAgo(new Date(now.getTime() + 3_000).toISOString(), now), "Just now");
});

test("the first day is hours, and after that it is days", () => {
    // 11pm last night read at 1am is two hours old, and reads better as
    // that than as "Yesterday" — hours win until there are 24 of them.
    const lateLastNight = new Date("2026-01-19T23:00:00Z").toISOString();
    assert.equal(timeAgo(lateLastNight, new Date("2026-01-20T01:00:00Z")), "2 hours ago");

    // Past that, it is the day it happened on in UK time, not a count
    // of 24-hour blocks.
    assert.equal(timeAgo(ago(day), now), "Yesterday");
    assert.equal(timeAgo(ago(25 * hour), now), "Yesterday");
    assert.equal(timeAgo(ago(2 * day), now), "2 days ago");
    assert.equal(timeAgo(ago(6 * day), now), "6 days ago");
});

test("after a week it is a date, with the year only when it isn't this one", () => {
    assert.equal(timeAgo(ago(8 * day), now), "12 Jan");
    assert.equal(timeAgo("2025-11-11T09:00:00Z", now), "11 Nov 2025");
});

test("a date nobody can read is no date at all", () => {
    assert.equal(timeAgo("not a date", now), "");
});
