import assert from "node:assert/strict";
import { test } from "node:test";

import { offerBeingClaimed } from "@/lib/claim-offer";

test("the offer somebody signed in to claim", () => {
    assert.equal(offerBeingClaimed("/offers/dublin-pub-friday-y28in3?claim=1"), "dublin-pub-friday-y28in3");
});

test("an offer they only wanted to read is left alone", () => {
    // Following an offer link to the sign-in page is not asking to claim.
    assert.equal(offerBeingClaimed("/offers/dublin-pub-friday-y28in3"), null);
    assert.equal(offerBeingClaimed("/offers/dublin-pub-friday-y28in3?claim=0"), null);
    assert.equal(offerBeingClaimed("/dashboard"), null);
    assert.equal(offerBeingClaimed("/offers"), null);
    // Nothing that isn't a slug: the claim is for one offer, by name.
    assert.equal(offerBeingClaimed("/offers/../admin?claim=1"), null);
    assert.equal(offerBeingClaimed("/offers/a/b?claim=1"), null);
});
