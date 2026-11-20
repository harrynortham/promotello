import assert from "node:assert/strict";
import { test } from "node:test";

import {
    EXTRA_TRADES,
    MAX_RESULTS,
    PAGE_SIZE,
    inTheArea,
    placesQuery,
    searchPlaces,
    splitViewport,
} from "@/lib/google-places";

test("the query reads like something somebody would type into Maps", () => {
    assert.equal(
        placesQuery("Cafés & coffee", "Gloucester Road", "Bristol"),
        "Cafés & coffee on Gloucester Road, Bristol",
    );
});

// A fake Google. Returns pages of placeholder businesses and records
// what it was asked, so the paging rules can be checked without
// spending anything.
function fakeGoogle({ pages }: { pages: number }) {
    const calls: { token?: string; pageSize: number }[] = [];
    let served = 0;

    const original = globalThis.fetch;

    globalThis.fetch = (async (_url: string, init: { body: string }) => {
        const body = JSON.parse(init.body) as { pageToken?: string; pageSize: number };

        calls.push({ token: body.pageToken, pageSize: body.pageSize });
        served += 1;

        return {
            ok: true,
            json: async () => ({
                places: Array.from({ length: PAGE_SIZE }, (_, at) => ({
                    id: `place-${served}-${at}`,
                    displayName: { text: `Business ${served}-${at}` },
                    formattedAddress: "1 Gloucester Rd, Bristol",
                    websiteUri: at % 2 === 0 ? "https://example.com" : undefined,
                })),
                ...(served < pages ? { nextPageToken: `token-${served}` } : {}),
            }),
        };
    }) as unknown as typeof fetch;

    return { calls, restore: () => { globalThis.fetch = original; } };
}

test("it follows the token through the pages", async () => {
    const google = fakeGoogle({ pages: 3 });

    try {
        const found = await searchPlaces("cafes on Gloucester Road, Bristol", { key: "test" });

        assert.equal(found.length, 60);
        assert.equal(google.calls.length, 3);
        // The first call carries no token; the rest carry the one before.
        assert.equal(google.calls[0].token, undefined);
        assert.equal(google.calls[1].token, "token-1");
    } finally {
        google.restore();
    }
});

// Sixty is Google's ceiling, not ours. A loop that trusted the token
// alone would keep asking and keep being charged.
test("it stops at sixty even if Google keeps offering pages", async () => {
    const google = fakeGoogle({ pages: 99 });

    try {
        const found = await searchPlaces("takeaways on Gloucester Road, Bristol", { key: "test" });

        assert.equal(found.length, MAX_RESULTS);
        assert.equal(google.calls.length, 3);
    } finally {
        google.restore();
    }
});

// A street with eleven bakeries returns one page and no token. A loop
// watching only the count would ask forever.
test("it stops when there is no next page", async () => {
    const google = fakeGoogle({ pages: 1 });

    try {
        const found = await searchPlaces("bakeries on Gloucester Road, Bristol", { key: "test" });

        assert.equal(found.length, PAGE_SIZE);
        assert.equal(google.calls.length, 1);
    } finally {
        google.restore();
    }
});

test("a place with no id or no name is not a candidate", async () => {
    const original = globalThis.fetch;

    globalThis.fetch = (async () => ({
        ok: true,
        json: async () => ({
            places: [
                { id: "good", displayName: { text: "Billie's Café" }, formattedAddress: "365 Gloucester Rd" },
                { displayName: { text: "No id" } },
                { id: "no-name" },
            ],
        }),
    })) as unknown as typeof fetch;

    try {
        const found = await searchPlaces("cafes", { key: "test" });

        assert.deepEqual(found.map((place) => place.placeId), ["good"]);
        assert.equal(found[0].website, null);
    } finally {
        globalThis.fetch = original;
    }
});

test("a refusal is raised rather than read as no results", async () => {
    const original = globalThis.fetch;

    globalThis.fetch = (async () => ({
        ok: false,
        status: 403,
        text: async () => '{"error":{"message":"API key not valid"}}',
    })) as unknown as typeof fetch;

    try {
        await assert.rejects(
            () => searchPlaces("cafes", { key: "bad" }),
            /Places returned 403/,
        );
    } finally {
        globalThis.fetch = original;
    }
});

test("without a key it says so rather than calling Google", async () => {
    await assert.rejects(() => searchPlaces("cafes", { key: "" }), /GOOGLE_PLACES_API_KEY/);
});

// Google reads the area as a hint, not a boundary. A sweep of
// Gloucester Road came back 747 businesses, 313 of them on it.
test("Gloucester Road matches the Gloucester Rd in an address", () => {
    assert.equal(
        inTheArea("79-81 Gloucester Rd, Bishopston, Bristol BS7 8AA, UK", "Gloucester Road"),
        true,
    );
});

test("somewhere else in the same city does not", () => {
    for (const address of [
        "Wake The Tiger, 127 Albert Rd, Bristol BS2 0XS, UK",
        "Ashton Court Estate, Bristol BS3 2JT, UK",
        "Hollywood Ln, Patchway, Bristol BS10 7TW, UK",
    ]) {
        assert.equal(inTheArea(address, "Gloucester Road"), false, address);
    }
});

test("a neighbourhood matches where it appears in the address", () => {
    assert.equal(inTheArea("12 Cheltenham Rd, Montpelier, Bristol BS6 5RW", "Montpelier"), true);
    assert.equal(inTheArea("12 Cheltenham Rd, Montpelier, Bristol BS6 5RW", "Clifton"), false);
});

test("the other shortenings hold too", () => {
    assert.equal(inTheArea("5 North St, Bedminster, Bristol", "North Street"), true);
    assert.equal(inTheArea("5 Park Row, Bristol", "Park Street"), false);
});

test("no address is not in the area", () => {
    assert.equal(inTheArea(null, "Gloucester Road"), false);
    assert.equal(inTheArea("", "Gloucester Road"), false);
});

// The one that got through: a different street in a different suburb,
// whose name contains the area's.
test("Gloucester Road North is not Gloucester Road", () => {
    assert.equal(
        inTheArea("Air Balloon, 115 Gloucester Road North, Filton, Bristol BS7 0SE, UK", "Gloucester Road"),
        false,
    );
});

test("a house number or a range in front of it is still the street", () => {
    for (const address of [
        "79-81 Gloucester Rd, Bishopston, Bristol BS7 8AA, UK",
        "393 Gloucester Rd, Bristol BS7 8TS, UK",
        "13A Gloucester Rd, Bishopston, Bristol BS7 8AA, UK",
        "Gloucester Rd, Bristol",
    ]) {
        assert.equal(inTheArea(address, "Gloucester Road"), true, address);
    }
});

// London has a Gloucester Road. A sweep of Bristol's picked up a
// jeweller on South Kensington's.
test("the right street in the wrong city does not count", () => {
    assert.equal(
        inTheArea("66 Gloucester Rd, South Kensington, London SW7 4QT, UK", "Gloucester Road", "Bristol"),
        false,
    );
    assert.equal(
        inTheArea("393 Gloucester Rd, Bristol BS7 8TS, UK", "Gloucester Road", "Bristol"),
        true,
    );
});

test("without a city named, the street alone still decides", () => {
    assert.equal(inTheArea("393 Gloucester Rd, Bristol BS7 8TS, UK", "Gloucester Road"), true);
});

// Sixty is a ceiling with no page four, so the only way past it is a
// smaller question. Splitting Gloucester Road in half took one trade
// from 60 results to 98.
test("an area splits into bands running across it", () => {
    const road = {
        low: { latitude: 51.47, longitude: -2.595 },
        high: { latitude: 51.49, longitude: -2.583 },
    };

    const halves = splitViewport(road, 2);

    assert.equal(halves.length, 2);
    // South half starts at the south edge, north half ends at the north.
    assert.equal(halves[0].low.latitude, 51.47);
    assert.equal(halves[1].high.latitude, 51.49);
    // They meet in the middle, with no gap and no overlap.
    assert.equal(halves[0].high.latitude, halves[1].low.latitude);
    // The width is untouched: a street is cut across, not along.
    for (const band of halves) {
        assert.equal(band.low.longitude, -2.595);
        assert.equal(band.high.longitude, -2.583);
    }
});

test("one band is the whole area again", () => {
    const area = {
        low: { latitude: 51.47, longitude: -2.595 },
        high: { latitude: 51.49, longitude: -2.583 },
    };

    assert.deepEqual(splitViewport(area, 1), [area]);
});

test("more bands still cover it end to end", () => {
    const area = {
        low: { latitude: 51.47, longitude: -2.595 },
        high: { latitude: 51.49, longitude: -2.583 },
    };

    const bands = splitViewport(area, 4);

    assert.equal(bands.length, 4);
    assert.equal(bands[0].low.latitude, 51.47);
    assert.ok(Math.abs(bands[3].high.latitude - 51.49) < 1e-9);
});

// Every trade in the list is a billed search when it is ticked, so a
// repeat is money for the same answer twice. Five had crept in by the
// time the list reached two hundred, which is exactly when nobody is
// reading it top to bottom any more.
test("no trade is listed twice", () => {
    const seen = new Set<string>();
    const twice: string[] = [];

    for (const trade of EXTRA_TRADES) {
        if (seen.has(trade)) twice.push(trade);
        seen.add(trade);
    }

    assert.deepEqual(twice, []);
});

// Case and spacing count: "Thrift Store" and "thrift store" are one
// search and two charges.
test("nor in a different case or with odd spacing", () => {
    const tidied = EXTRA_TRADES.map((trade) => trade.toLowerCase().replace(/\s+/g, " ").trim());

    assert.equal(new Set(tidied).size, EXTRA_TRADES.length);
});

test("and none of them is blank", () => {
    assert.equal(EXTRA_TRADES.filter((trade) => !trade.trim()).length, 0);
});
