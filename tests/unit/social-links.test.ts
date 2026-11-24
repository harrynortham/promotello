import assert from "node:assert/strict";
import { test } from "node:test";

import { SOCIAL_NETWORKS, SOCIAL_ORDER, socialHandle, socialUrl, socialsOf } from "@/lib/social-links";
import { socialProfiles } from "@/lib/site";

const url = (key: Parameters<typeof socialUrl>[0], value: string) => {
    const result = socialUrl(key, value);

    return "url" in result ? result.url : "INVALID";
};

// The four ways somebody gives you their Instagram, all landing in the
// same place. This is the whole point of the field.
test("a handle, an @handle, a bare path and a pasted link all agree", () => {
    const expected = "https://instagram.com/theanchorbristol";

    assert.equal(url("instagram", "theanchorbristol"), expected);
    assert.equal(url("instagram", "@theanchorbristol"), expected);
    assert.equal(url("instagram", "instagram.com/theanchorbristol"), expected);
    assert.equal(url("instagram", "https://www.instagram.com/theanchorbristol"), "https://www.instagram.com/theanchorbristol");
});

test("whitespace around it is not a reason to refuse", () => {
    assert.equal(url("instagram", "  @theanchorbristol  "), "https://instagram.com/theanchorbristol");
});

test("an empty box means they have not got one, not that it is wrong", () => {
    for (const nothing of ["", "   ", null, undefined]) {
        assert.deepEqual(socialUrl("instagram", nothing), { url: null });
    }
});

// TikTok and YouTube carry the @ in the path; the others do not.
test("the @ goes where each network puts it", () => {
    assert.equal(url("tiktok", "@theanchor"), "https://tiktok.com/@theanchor");
    assert.equal(url("tiktok", "theanchor"), "https://tiktok.com/@theanchor");
    assert.equal(url("youtube", "theanchor"), "https://youtube.com/@theanchor");
    assert.equal(url("x", "@theanchor"), "https://x.com/theanchor");
    assert.equal(url("facebook", "@theanchor"), "https://facebook.com/theanchor");
});

test("twitter.com is still an X link", () => {
    assert.equal(url("x", "https://twitter.com/theanchor"), "https://twitter.com/theanchor");
});

// Pasting the wrong one in the wrong box is a mistake worth saying out
// loud, rather than turning a whole URL into a handle.
test("a link to another network is refused", () => {
    assert.equal(url("instagram", "https://facebook.com/theanchor"), "INVALID");
    assert.equal(url("facebook", "https://instagram.com/theanchor"), "INVALID");
    assert.equal(url("x", "https://youtube.com/@theanchor"), "INVALID");
});

test("the network's own front page is not a link to them", () => {
    assert.equal(url("instagram", "https://instagram.com"), "INVALID");
    assert.equal(url("instagram", "https://instagram.com/"), "INVALID");
});

test("nonsense is refused rather than stored", () => {
    assert.equal(url("instagram", "the anchor bristol"), "INVALID");
    assert.equal(url("instagram", "https://instagram.com/the anchor"), "INVALID");
    assert.equal(url("instagram", "javascript:alert(1)"), "INVALID");
    assert.equal(url("instagram", "@" + "x".repeat(200)), "INVALID");
});

// A stored http link should not send a customer somewhere insecure.
test("http is upgraded to https", () => {
    assert.equal(url("instagram", "http://instagram.com/theanchor"), "https://instagram.com/theanchor");
});

// profile.php?id=… is how a lot of Facebook pages are reachable, and
// dropping the query would break every one of them.
test("a query string is kept", () => {
    assert.equal(
        url("facebook", "https://facebook.com/profile.php?id=61550000000000"),
        "https://facebook.com/profile.php?id=61550000000000",
    );
});

test("what goes in the box is what they typed, not the url", () => {
    assert.equal(socialHandle("instagram", "https://instagram.com/theanchor"), "theanchor");
    assert.equal(socialHandle("tiktok", "https://tiktok.com/@theanchor"), "@theanchor");
    assert.equal(socialHandle("instagram", null), "");
    // One we cannot take apart is shown whole rather than mangled.
    assert.equal(
        socialHandle("facebook", "https://facebook.com/profile.php?id=615"),
        "profile.php?id=615",
    );
});

test("a handle survives the round trip", () => {
    for (const network of SOCIAL_NETWORKS) {
        const stored = socialUrl(network.key, "theanchor");

        assert.ok("url" in stored && stored.url, `${network.key} should store something`);
        assert.equal(
            url(network.key, socialHandle(network.key, (stored as { url: string }).url)),
            (stored as { url: string }).url,
            `${network.key} did not survive`,
        );
    }
});

test("only the ones filled in are shown, in a fixed order", () => {
    const shown = socialsOf({
        instagram_url: "https://instagram.com/a",
        tiktok_url: "https://tiktok.com/@b",
        facebook_url: null,
    });

    assert.deepEqual(shown.map((entry) => entry.network.key), ["instagram", "tiktok"]);
    assert.deepEqual(socialsOf({}), []);
});

// One order for every row of these, everywhere. The three lists cannot
// import one another cleanly — the networks a business can fill in, the
// accounts Promotello keeps, and the signature's hand-written HTML — so
// this is what stops one of them being reordered on its own.

test("the networks a business can fill in are in the house order", () => {
    assert.deepEqual(SOCIAL_NETWORKS.map((network) => network.key), SOCIAL_ORDER);
});

test("Promotello's own accounts are in the house order", () => {
    assert.deepEqual(socialProfiles.map((profile) => profile.network), SOCIAL_ORDER);
});
