import assert from "node:assert/strict";
import { test } from "node:test";

import { hoursFromHtml } from "@/lib/lead-enrichment";

// Hours are read from the business's own website rather than from
// Google, whose policies permit storing nothing but the place_id
// (lib/google-places.ts). Only structured hours are taken: a block a
// business publishes for machines to read is the one place on a page
// where "Mon 9-5" is not a guess.

const page = (jsonLd: unknown) =>
    `<html><head><script type="application/ld+json">${JSON.stringify(jsonLd)}</script></head><body>Hello</body></html>`;

const weekdays = {
    "@context": "https://schema.org",
    "@type": "Bakery",
    name: "Joe's Bakery",
    openingHoursSpecification: [
        {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: [
                "https://schema.org/Monday",
                "https://schema.org/Tuesday",
                "https://schema.org/Wednesday",
                "https://schema.org/Thursday",
                "https://schema.org/Friday",
            ],
            opens: "07:00",
            closes: "16:00",
        },
    ],
};

test("it reads a weekday block and closes the days nobody mentioned", () => {
    const hours = hoursFromHtml(page(weekdays));

    assert.ok(hours);
    assert.equal(hours.length, 7, "every day of the week has a row");

    const monday = hours.find((day) => day.day_of_week === 1)!;
    assert.deepEqual(
        { opens: monday.opens_at, closes: monday.closes_at, shut: monday.is_closed },
        { opens: "07:00", closes: "16:00", shut: false },
    );

    // A site listing Monday to Friday is saying it is shut at the weekend.
    assert.equal(hours.find((day) => day.day_of_week === 0)!.is_closed, true);
    assert.equal(hours.find((day) => day.day_of_week === 6)!.is_closed, true);
});

test("a single day, written as a bare word rather than a URL", () => {
    const hours = hoursFromHtml(
        page({ "@type": "Restaurant", openingHoursSpecification: { dayOfWeek: "Saturday", opens: "9:30 am", closes: "11:00 pm" } }),
    );

    const saturday = hours!.find((day) => day.day_of_week === 6)!;

    assert.equal(saturday.opens_at, "09:30");
    assert.equal(saturday.closes_at, "23:00");
});

test("it finds the block however deeply the page buried it", () => {
    const hours = hoursFromHtml(
        page({ "@graph": [{ "@type": "WebSite" }, { ...weekdays, "@type": "CafeOrCoffeeShop" }] }),
    );

    assert.ok(hours);
    assert.equal(hours.find((day) => day.day_of_week === 2)!.opens_at, "07:00");
});

test("a page with no structured hours gives nothing, rather than a guess", () => {
    assert.equal(hoursFromHtml("<html><body><p>Open late on Fridays</p></body></html>"), null);
    assert.equal(hoursFromHtml(page({ "@type": "Bakery", name: "Joe's" })), null);
});

test("a block that will not parse is skipped, not repaired", () => {
    assert.equal(
        hoursFromHtml(`<script type="application/ld+json">{ not json </script>`),
        null,
    );
});

test("every day shut is a page we misread, not a business that never opens", () => {
    const hours = hoursFromHtml(
        page({
            "@type": "Bakery",
            openingHoursSpecification: [{ dayOfWeek: ["Monday", "Tuesday"], opens: "", closes: "" }],
        }),
    );

    assert.equal(hours, null);
});

test("nonsense times are refused rather than stored", () => {
    const hours = hoursFromHtml(
        page({
            "@type": "Bakery",
            openingHoursSpecification: [
                { dayOfWeek: "Monday", opens: "99:00", closes: "17:00" },
                { dayOfWeek: "Tuesday", opens: "09:00", closes: "17:00" },
            ],
        }),
    );

    // Monday had no usable pair, so it is shut; Tuesday stands.
    assert.equal(hours!.find((day) => day.day_of_week === 1)!.is_closed, true);
    assert.equal(hours!.find((day) => day.day_of_week === 2)!.opens_at, "09:00");
});
