import assert from "node:assert/strict";
import { test } from "node:test";

import { HEADLINE_MAX, isOfferKind, offerHeadline, offerKind, kindTakes } from "@/lib/offer-kinds";
import {
    DEFAULT_TERMS,
    OFFER_TEMPLATES,
    TEMPLATES_SHOWN,
    offerTemplate,
    templatesFor,
} from "@/lib/offer-templates";

const CATEGORIES = ["food-drink", "things-to-do", "shopping", "health-beauty", "services", "travel-stays"];

// Every template is filled into the real offer form, so each one has to
// be an offer the form would have accepted had somebody typed it.

test("every template is a real kind of offer", () => {
    for (const template of OFFER_TEMPLATES) {
        assert.equal(isOfferKind(template.kind), true, `${template.id}: ${template.kind}`);
    }
});

test("every template gives its kind what that kind asks for", () => {
    for (const template of OFFER_TEMPLATES) {
        const spec = offerKind(template.kind);

        if (spec.itemRequired) {
            assert.ok(template.item, `${template.id} is a ${template.kind} and needs an item`);
        }

        if (kindTakes(template.kind, "value")) {
            // Not every kind that takes a value requires one, but one
            // that supplies a value must be a kind that takes one.
            assert.ok(true);
        } else {
            assert.equal(template.value, undefined, `${template.id} supplies a value its kind ignores`);
        }

        if (!kindTakes(template.kind, "item")) {
            assert.equal(template.item, undefined, `${template.id} supplies an item its kind ignores`);
        }
    }
});

test("every template builds a headline that fits", () => {
    for (const template of OFFER_TEMPLATES) {
        const headline = offerHeadline({
            kind: template.kind,
            value: template.value ? String(template.value) : "",
            quantity: template.quantity ? String(template.quantity) : "",
            item: template.item ?? "",
            text: "",
        });

        assert.ok(headline.length > 0, `${template.id} builds no headline`);
        assert.ok(
            headline.length <= HEADLINE_MAX,
            `${template.id} builds "${headline}", ${headline.length} characters over ${HEADLINE_MAX}`,
        );
    }
});

test("ids are unique, because one is pressed by id", () => {
    const ids = OFFER_TEMPLATES.map((template) => template.id);

    assert.equal(new Set(ids).size, ids.length);
});

test("every template says what it is for, and that is not the description again", () => {
    for (const template of OFFER_TEMPLATES) {
        assert.ok(template.why.length > 20, `${template.id} needs a reason to pick it`);
        assert.notEqual(template.why, template.description, `${template.id} repeats itself`);
    }
});

test("days are days of the week", () => {
    for (const template of OFFER_TEMPLATES) {
        for (const day of template.days ?? []) {
            assert.ok(Number.isInteger(day) && day >= 0 && day <= 6, `${template.id}: ${day}`);
        }
    }
});

test("a time pair is a pair, because the form asks for both", () => {
    for (const template of OFFER_TEMPLATES) {
        if (template.from || template.until) {
            assert.ok(template.from && template.until, `${template.id} has one time and not the other`);
            assert.ok(template.from! < template.until!, `${template.id} ends before it starts`);
        }
    }
});

// --- Which ones a business is shown ------------------------------------

test("a trade sees its own first", () => {
    const shown = templatesFor("food-drink");

    assert.equal(shown[0].categories.includes("food-drink"), true);
});

test("every trade gets a full set, even the ones with two of their own", () => {
    for (const slug of CATEGORIES) {
        assert.equal(templatesFor(slug).length, TEMPLATES_SHOWN, slug);
    }
});

test("a business with no category still gets something to start from", () => {
    assert.equal(templatesFor(null).length, TEMPLATES_SHOWN);
    assert.equal(templatesFor("").length, TEMPLATES_SHOWN);
    // The ones that suit anybody lead, since nothing else is known.
    assert.equal(templatesFor(null)[0].categories.length, 0);
});

test("an unknown category falls back rather than showing nothing", () => {
    assert.equal(templatesFor("taxidermy").length, TEMPLATES_SHOWN);
});

test("nothing is listed twice in one set", () => {
    for (const slug of [...CATEGORIES, "", "taxidermy"]) {
        const ids = templatesFor(slug).map((template) => template.id);
        assert.equal(new Set(ids).size, ids.length, slug);
    }
});

test("one is found by the id the form sends back", () => {
    assert.equal(offerTemplate("pastry-before-ten")?.kind, "freebie");
    assert.equal(offerTemplate("nothing-like-this"), null);
});

test("terms are always said, by the template or by the default", () => {
    assert.ok(DEFAULT_TERMS.includes("Promotello code"));

    for (const template of OFFER_TEMPLATES) {
        const terms = template.terms ?? DEFAULT_TERMS;
        assert.ok(terms.length > 20, `${template.id} has terms too short to mean anything`);
    }
});
