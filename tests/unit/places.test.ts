import assert from "node:assert/strict";
import { test } from "node:test";

import { citiesWithTown, cityForVisitor } from "@/lib/geo";
import { listPlaces } from "@/lib/places";

test("listPlaces names a few places and summarises the rest", () => {
    assert.equal(listPlaces([]), "");
    assert.equal(listPlaces(["Bristol"]), "Bristol");
    assert.equal(listPlaces(["Bristol", "Bath"]), "Bristol and Bath");
    assert.equal(listPlaces(["Bristol", "Bath", "Wells"]), "Bristol, Bath and Wells");
    // Two named, and the count covers the two that aren't.
    assert.equal(listPlaces(["Bristol", "Bath", "Wells", "Frome"]), "Bristol, Bath and 2 more places");
    assert.equal(listPlaces(["A", "B", "C", "D", "E", "F"]), "A, B and 4 more places");
});

const cities = [
    { slug: "bristol", areas: ["Clifton", "City Centre", "Bedminster"] },
    { slug: "bath", areas: ["City Centre", "Keynsham", "Widcombe"] },
];

test("a detected town is matched to the city whose area it is", () => {
    assert.deepEqual(citiesWithTown(cities, "Keynsham").map((city) => city.slug), ["bath"]);
    assert.deepEqual(citiesWithTown(cities, "clifton").map((city) => city.slug), ["bristol"]);
    // Spacing and case from the header shouldn't matter.
    assert.deepEqual(citiesWithTown(cities, "  WIDCOMBE ").map((city) => city.slug), ["bath"]);
});

test("a town name that two cities share settles nothing", () => {
    // Both have a City Centre, so the caller falls back to distance.
    assert.equal(citiesWithTown(cities, "City Centre").length, 2);
});

test("an unknown or empty town matches no city", () => {
    assert.deepEqual(citiesWithTown(cities, "London"), []);
    assert.deepEqual(citiesWithTown(cities, "   "), []);
});

const located = [
    { slug: "bristol", areas: ["Clifton", "City Centre"], latitude: 51.4545, longitude: -2.5879, radiusKm: 20, name: "Bristol" },
    { slug: "bath", areas: ["City Centre", "Keynsham"], latitude: 51.3811, longitude: -2.359, radiusKm: 12, name: "Bath" },
];

test("a town between two cities goes to the city it belongs to", () => {
    // Keynsham is 8km from Bristol's centre and 10km from Bath's, so distance
    // alone would say Bristol. It is one of Bath's areas.
    assert.equal(cityForVisitor(located, "Keynsham", 51.4142, -2.4986)?.slug, "bath");
});

test("without a town match, the nearest city centre wins", () => {
    assert.equal(cityForVisitor(located, "Somewhere Else", 51.4545, -2.5879)?.slug, "bristol");
    assert.equal(cityForVisitor(located, null, 51.3811, -2.359)?.slug, "bath");
});

test("a town name that matches an area far away is ignored", () => {
    // A "Keynsham" 300km north is not Bath's Keynsham, and is in no city.
    assert.equal(cityForVisitor(located, "Keynsham", 54.0, -2.4986), null);
});

test("a town name alone still places someone when there is no position", () => {
    assert.equal(cityForVisitor(located, "Clifton", null, null)?.slug, "bristol");
});

test("nobody is placed outside every city", () => {
    assert.equal(cityForVisitor(located, "London", 51.5074, -0.1278), null);
    assert.equal(cityForVisitor(located, null, null, null), null);
});
