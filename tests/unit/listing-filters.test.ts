import assert from "node:assert/strict";
import { test } from "node:test";

import type { CategoryGroup } from "@/lib/categories";
import {
    areaPhoto,
    areasFrom,
    citiesWithArea,
    filterBusinesses,
    filterOffers,
    inArea,
    interleaveByCity,
    isInArea,
    type ListingBusiness,
    type ListingOffer,
    type ListingPlace,
} from "@/lib/listing-filters";

// Two cities that both have a "City Centre", which is the case these
// functions exist to get right: area names are only unique within a city.
const BRISTOL = "city-bristol";
const BATH = "city-bath";

const places: Record<string, ListingPlace> = {
    bristolCentre: { area: "City Centre", areaId: "a-bs-centre", city: "Bristol", cityId: BRISTOL },
    bristolClifton: { area: "Clifton", areaId: "a-bs-clifton", city: "Bristol", cityId: BRISTOL },
    bathCentre: { area: "City Centre", areaId: "a-ba-centre", city: "Bath", cityId: BATH },
    bathKeynsham: { area: "Keynsham", areaId: "a-ba-keynsham", city: "Bath", cityId: BATH },
    // Saved before areas had ids.
    legacyClifton: { area: "Clifton", areaId: null, city: "Bristol", cityId: BRISTOL },
};

function business(place: ListingPlace, over: Partial<ListingBusiness> = {}): ListingBusiness {
    return {
        ...place,
        id: over.id ?? `b-${place.areaId ?? place.area}`,
        slug: "a-business",
        name: "A Business",
        description: null,
        logoUrl: null,
        categoryId: "cat-cafes",
        categoryName: "Cafés & coffee",
        createdAt: "2026-01-01T00:00:00.000Z",
        offerCount: 0,
        coverImageUrl: null,
        isSample: false,
        topOffer: null,
        ...over,
    };
}

function offer(place: ListingPlace, over: Partial<ListingOffer> = {}): ListingOffer {
    return {
        id: over.id ?? `o-${place.areaId ?? place.area}`,
        slug: "an-offer",
        title: "Free pastry",
        discount: "Free pastry",
        description: "With any hot drink.",
        availability: "Weekdays",
        expiresAt: "2026-12-01",
        createdAt: "2026-01-01T00:00:00.000Z",
        imageUrl: null,
        categoryId: "cat-cafes",
        categoryName: "Cafés & coffee",
        redemptionCount: 0,
        maxRedemptions: null,
        ...over,
        business: {
            ...place,
            id: "b-1",
            slug: "a-business",
            name: "A Business",
            logoUrl: null,
            isSample: false,
            ...over.business,
        },
    };
}

const groups: CategoryGroup[] = [
    {
        id: "cat-food",
        parent_id: null,
        slug: "food-drink",
        name: "Food & drink",
        description: null,
        image_url: null,
        sort_order: 1,
        is_active: true,
        subcategories: [
            {
                id: "cat-cafes",
                parent_id: "cat-food",
                slug: "cafes-coffee",
                name: "Cafés & coffee",
                description: null,
                image_url: null,
                sort_order: 1,
                is_active: true,
            },
        ],
    },
];

test("two cities' areas with the same name stay apart", () => {
    const areas = areasFrom([places.bristolCentre, places.bathCentre, places.bathCentre]);

    assert.equal(areas.length, 2, "City Centre should be two areas, not one");

    const bath = areas.find((area) => area.cityId === BATH);
    const bristol = areas.find((area) => area.cityId === BRISTOL);

    assert.equal(bath?.name, "City Centre");
    assert.equal(bath?.cityName, "Bath");
    assert.equal(bath?.count, 2);
    assert.equal(bristol?.count, 1);
});

test("areas come back busiest first", () => {
    const areas = areasFrom([places.bristolClifton, places.bathCentre, places.bathCentre]);
    assert.deepEqual(areas.map((area) => `${area.name}/${area.count}`), ["City Centre/2", "Clifton/1"]);
});

test("a location saved before areas had ids still groups with its own city", () => {
    const areas = areasFrom([places.legacyClifton, places.legacyClifton]);

    assert.equal(areas.length, 1);
    assert.equal(areas[0].id, null);
    assert.equal(areas[0].cityId, BRISTOL);
    assert.equal(areas[0].count, 2);
});

test("a listing is only in its own city's area of that name", () => {
    const [bathCentre] = areasFrom([places.bathCentre]);

    assert.ok(isInArea(places.bathCentre, bathCentre));
    assert.ok(!isInArea(places.bristolCentre, bathCentre), "Bristol's City Centre is a different area");
    assert.ok(!isInArea(places.bathKeynsham, bathCentre));
});

test("citiesWithArea finds every city using an area name", () => {
    const all = [places.bristolCentre, places.bathCentre, places.bathKeynsham];

    assert.equal(citiesWithArea(all, "City Centre").length, 2);
    assert.deepEqual(citiesWithArea(all, "Keynsham"), [BATH]);
    assert.deepEqual(citiesWithArea(all, "Nowhere"), []);
});

test("the ?area= filter narrows by name, and no area means everything", () => {
    assert.ok(inArea(places.bathKeynsham, "Keynsham"));
    assert.ok(!inArea(places.bathKeynsham, "Clifton"));
    assert.ok(inArea(places.bathKeynsham, undefined));
});

test("searching finds a listing by the city it is in", () => {
    const offers = [offer(places.bathKeynsham), offer(places.bristolClifton, { id: "o-2" })];

    assert.deepEqual(filterOffers(offers, groups, { search: "bath" }).map((item) => item.id), ["o-a-ba-keynsham"]);
    assert.deepEqual(filterOffers(offers, groups, { search: "bristol" }).map((item) => item.id), ["o-2"]);
    assert.equal(filterOffers(offers, groups, { search: "keynsham" }).length, 1);
    assert.equal(filterOffers(offers, groups, { search: "wells" }).length, 0);
});

test("businesses are searchable by city too", () => {
    const businesses = [business(places.bathKeynsham), business(places.bristolClifton)];

    assert.equal(filterBusinesses(businesses, groups, { search: "Bath" }).length, 1);
    assert.equal(filterBusinesses(businesses, groups, { search: "Bristol" }).length, 1);
});

test("filtering by area still works inside one city", () => {
    const offers = [offer(places.bathCentre), offer(places.bathKeynsham, { id: "o-2" })];

    assert.deepEqual(filterOffers(offers, groups, { area: "Keynsham" }).map((item) => item.id), ["o-2"]);
});

test("a list spanning cities takes one from each in turn", () => {
    // Newest-first across three cities would put all of Bath's first.
    const offers = [
        offer(places.bathCentre, { id: "bath-1" }),
        offer(places.bathKeynsham, { id: "bath-2" }),
        offer(places.bathCentre, { id: "bath-3" }),
        offer(places.bristolClifton, { id: "bristol-1" }),
        offer(places.bristolCentre, { id: "bristol-2" }),
    ];

    const mixed = interleaveByCity(offers, (item) => item.business.cityId);

    assert.deepEqual(mixed.map((item) => item.id), ["bath-1", "bristol-1", "bath-2", "bristol-2", "bath-3"]);
    assert.equal(mixed.length, offers.length, "nothing may be dropped");
});

test("one city's list is left exactly as it is", () => {
    const offers = [offer(places.bathCentre, { id: "a" }), offer(places.bathKeynsham, { id: "b" })];

    assert.deepEqual(
        interleaveByCity(offers, (item) => item.business.cityId).map((item) => item.id),
        ["a", "b"],
    );
});

test("listings with no city still come back", () => {
    const nowhere: ListingPlace = { area: null, areaId: null, city: null, cityId: null };
    const offers = [offer(nowhere, { id: "a" }), offer(places.bathCentre, { id: "b" })];

    assert.equal(interleaveByCity(offers, (item) => item.business.cityId).length, 2);
});

test("a neighbourhood borrows its picture from a business in it", () => {
    const shops = [
        business(places.bristolClifton, { id: "newest", createdAt: "2026-03-01T00:00:00.000Z", coverImageUrl: "/new.jpg" }),
        business(places.bristolClifton, { id: "oldest", createdAt: "2026-01-01T00:00:00.000Z", coverImageUrl: "/old.jpg" }),
    ];

    // The longest-standing one, so a new arrival doesn't change the page.
    assert.equal(areaPhoto(shops), "/old.jpg");
});

test("a business with no picture is passed over, not treated as the answer", () => {
    const shops = [
        business(places.bristolClifton, { id: "oldest", createdAt: "2026-01-01T00:00:00.000Z", coverImageUrl: null }),
        business(places.bristolClifton, { id: "newer", createdAt: "2026-02-01T00:00:00.000Z", coverImageUrl: "/has-one.jpg" }),
    ];

    assert.equal(areaPhoto(shops), "/has-one.jpg");
});

test("a neighbourhood with nothing to show says so, and the caller falls back", () => {
    assert.equal(areaPhoto([]), null);
    assert.equal(areaPhoto([business(places.bristolClifton, { coverImageUrl: null })]), null);
});
