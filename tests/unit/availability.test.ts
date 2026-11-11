import assert from "node:assert/strict";
import { test } from "node:test";

import {
    availabilityLine,
    enforcedSchedule,
    formatSchedule,
    isAudience,
    isLegacyAvailability,
} from "@/lib/schedule";

// Monday to Friday, and the weekend.
const weekdays = [1, 2, 3, 4, 5];
const weekend = [6, 0];
const everyDay = [0, 1, 2, 3, 4, 5, 6];

test("the line says when, in the order the spec sets out", () => {
    assert.equal(availabilityLine({}), "Any time");
    assert.equal(availabilityLine({ days: weekdays }), "Weekdays");
    assert.equal(availabilityLine({ from: "14:00", until: "16:00" }), "Every day, 2pm–4pm");
    assert.equal(availabilityLine({ days: weekdays, until: "10:00" }), "Weekdays, until 10am");
    assert.equal(availabilityLine({ days: weekend, from: "17:00" }), "Weekends, from 5pm");
    assert.equal(availabilityLine({ days: [1, 2, 3, 4], from: "14:00", until: "16:00" }), "Mon–Thu, 2pm–4pm");
});

// Businesses write these two themselves — four live offers say
// "Weekdays" — so the picker gives back the words they would have typed.
test("the two sets of days that have a name are called by it", () => {
    assert.equal(availabilityLine({ days: weekdays }), "Weekdays");
    assert.equal(availabilityLine({ days: weekend }), "Weekends");

    // One day either side of them is a list again.
    assert.equal(availabilityLine({ days: [1, 2, 3, 4] }), "Mon–Thu");
    assert.equal(availabilityLine({ days: [1, 2, 3, 4, 5, 6] }), "Mon–Sat");
    assert.equal(availabilityLine({ days: [6] }), "Sat");
    assert.equal(availabilityLine({ days: [5, 6] }), "Fri, Sat");
    assert.equal(availabilityLine({ days: [0] }), "Sun");

    // The till's window is a list of days staff are held to, not a
    // phrase on a card, so it still spells them out.
    assert.equal(
        formatSchedule({ days: weekdays, start: "09:00", end: "17:00" }),
        "Mon–Fri, 9am–5pm",
    );
});

test("every day is the same as no day at all", () => {
    assert.equal(availabilityLine({ days: everyDay }), "Any time");
    assert.equal(availabilityLine({ days: [] }), "Any time");
    assert.equal(availabilityLine({ days: null }), "Any time");

    // With a time, the days are still said: "2pm–4pm" alone reads like
    // today only.
    assert.equal(availabilityLine({ days: everyDay, from: "14:00", until: "16:00" }), "Every day, 2pm–4pm");
});

test("who it is for is added to whatever it says", () => {
    assert.equal(availabilityLine({ audience: "new_customers" }), "Any time · New customers only");
    assert.equal(
        availabilityLine({ days: weekdays, until: "10:00", audience: "new_customers" }),
        "Weekdays, until 10am · New customers only",
    );
    assert.equal(availabilityLine({ days: weekdays, audience: "everyone" }), "Weekdays");

    assert.equal(isAudience("new_customers"), true);
    assert.equal(isAudience("everyone"), true);
    assert.equal(isAudience("members"), false);
    assert.equal(isAudience(null), false);
});

test("the times read as a person would say them, however they are stored", () => {
    // The database hands back "10:00:00"; the form sends "10:00".
    assert.equal(availabilityLine({ until: "10:00:00" }), "Every day, until 10am");
    assert.equal(availabilityLine({ from: "17:30" }), "Every day, from 5:30pm");
    assert.equal(availabilityLine({ from: "00:00", until: "12:00" }), "Every day, 12am–12pm");
});

test("the till's window is filled in where the picker left a gap", () => {
    // The schedule check wants days and both ends; the picker doesn't.
    assert.deepEqual(enforcedSchedule({ days: weekdays, from: "14:00", until: "16:00" }, true), {
        schedule_days: weekdays,
        schedule_start: "14:00",
        schedule_end: "16:00",
    });

    assert.deepEqual(enforcedSchedule({ days: weekdays, until: "10:00" }, true), {
        schedule_days: weekdays,
        schedule_start: "00:00",
        schedule_end: "10:00",
    });

    assert.deepEqual(enforcedSchedule({ days: weekdays, from: "17:00" }, true), {
        schedule_days: weekdays,
        schedule_start: "17:00",
        schedule_end: "23:59:59",
    });

    assert.deepEqual(enforcedSchedule({ from: "14:00", until: "16:00" }, true), {
        schedule_days: [0, 1, 2, 3, 4, 5, 6],
        schedule_start: "14:00",
        schedule_end: "16:00",
    });
});

test("nothing is enforced unless it was asked for", () => {
    const none = { schedule_days: null, schedule_start: null, schedule_end: null };

    assert.deepEqual(enforcedSchedule({ days: weekdays, from: "14:00", until: "16:00" }, false), none);
    // "Any time" has no window to enforce, whatever the box says.
    assert.deepEqual(enforcedSchedule({}, true), none);
    assert.deepEqual(enforcedSchedule({ days: [] }, true), none);
});

test("a line that isn't the one the columns would write is legacy", () => {
    assert.equal(isLegacyAvailability("Weekdays before 10am", {}), true);
    assert.equal(isLegacyAvailability("First visit only", { audience: "new_customers" }), true);

    assert.equal(isLegacyAvailability("Any time", {}), false);
    assert.equal(isLegacyAvailability("Weekdays, until 10am", { days: weekdays, until: "10:00" }), false);
    // Four live offers say exactly this, and now the picker writes it.
    assert.equal(isLegacyAvailability("Weekdays", { days: weekdays }), false);
    // Whitespace is not a difference worth asking a business about.
    assert.equal(isLegacyAvailability("  Any time  ", {}), false);
});
