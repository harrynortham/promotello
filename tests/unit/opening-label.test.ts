import test from "node:test";
import assert from "node:assert/strict";

import { openingLabel, type HoursRow } from "@/lib/business-hours";

const open = (day: number, opens: string, closes: string): HoursRow => ({
    day_of_week: day,
    is_closed: false,
    opens_at: opens,
    closes_at: closes,
});

const shut = (day: number): HoursRow => ({
    day_of_week: day,
    is_closed: true,
    opens_at: null,
    closes_at: null,
});

// 2026-11-25 is a Wednesday. Times are given in UTC, and in November
// London is on UTC, so these read as the clock on the wall.
const wednesday = (time: string) => new Date(`2026-11-25T${time}:00Z`);

const week = [open(3, "09:00", "17:00"), shut(4), open(2, "09:00", "17:00")];

test("before opening it says when", () => {
    assert.equal(openingLabel(week, wednesday("07:30")), "Opens at 9:00am");
});

test("during the day it says until when", () => {
    assert.equal(openingLabel(week, wednesday("11:00")), "Open until 5:00pm");
});

test("after closing it says so", () => {
    assert.equal(openingLabel(week, wednesday("19:00")), "Closed now");
});

test("a day with nothing set reads as closed today", () => {
    assert.equal(openingLabel([shut(3)], wednesday("11:00")), "Closed today");
    assert.equal(openingLabel([], wednesday("11:00")), "Closed today");
});

// A bar open until 1am is open at half past midnight, not shut all day.
test("a late closing carries into the next morning", () => {
    const bar = [open(2, "17:00", "01:00"), shut(3)];

    assert.equal(openingLabel(bar, wednesday("00:30")), "Open until 1:00am");
    assert.equal(openingLabel(bar, wednesday("02:00")), "Closed today");
});

// British Summer Time: 17:00 London is 16:00 UTC in July.
test("summer time is read as the clock on the wall", () => {
    const july = new Date("2026-07-15T15:30:00Z");

    assert.equal(openingLabel([open(3, "09:00", "17:00")], july), "Open until 5:00pm");
});
