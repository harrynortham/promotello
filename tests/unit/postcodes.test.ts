import test from "node:test";
import assert from "node:assert/strict";

import { isNorthernIreland, placeFromResult } from "@/lib/postcodes";

// The postcode locates the lead, because the other direction does not
// work: reverse geocoding a shop's coordinates returns the nearest
// centroid, and from Joe's Bakery's own point the real BS7 8NZ is not in
// the nearest three.
test("a result becomes somewhere a lead can be", () => {
    assert.deepEqual(
        placeFromResult({
            postcode: "BS7 8NZ",
            latitude: 51.4795,
            longitude: -2.589666,
            admin_ward: "Redland",
            admin_district: "Bristol, City of",
            region: "South West",
        }),
        {
            postcode: "BS7 8NZ",
            latitude: 51.4795,
            longitude: -2.589666,
            ward: "Redland",
            district: "Bristol, City of",
            region: "South West",
        },
    );
});

test("a postcode with no coordinates is not half-stored", () => {
    // The whole point is where it is. Without that it is not an answer.
    assert.equal(placeFromResult({ postcode: "BS7 8NZ", admin_ward: "Redland" }), null);
    assert.equal(placeFromResult({ latitude: 51.4795, longitude: -2.58 }), null);
    assert.equal(placeFromResult(null), null);
});

test("missing areas are null rather than empty strings", () => {
    const place = placeFromResult({ postcode: "BS7 8NZ", latitude: 51.4, longitude: -2.5, admin_ward: "  " });

    assert.equal(place?.ward, null);
    assert.equal(place?.district, null);
});

test("Northern Ireland is recognised so it can be refused", () => {
    // BT postcodes come from Land and Property Services and commercial
    // use needs a licence from them, which we do not have.
    assert.equal(isNorthernIreland("BT1 5GS"), true);
    assert.equal(isNorthernIreland("bt495pq"), true);
    assert.equal(isNorthernIreland("BS7 8NZ"), false);
});
