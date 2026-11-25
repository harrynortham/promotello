import test from "node:test";
import assert from "node:assert/strict";

import {
    BIO_CORAL,
    BIO_KINDS,
    bioAccent,
    inkOn,
    DEFAULT_ORDER,
    arrangement,
    moved,
    noticeShowing,
    tidyUrl,
    waUrl,
} from "@/lib/bio-sections";

// A business that has never opened the screen has no rows at all, and
// must keep exactly the page it had before any of this existed.
test("no saved rows means the default order, all showing", () => {
    const sections = arrangement([]);

    assert.deepEqual(
        sections.map((section) => section.kind),
        [...DEFAULT_ORDER],
    );
    assert.ok(sections.every((section) => section.enabled));
});

test("a saved arrangement is used, in its own order", () => {
    const sections = arrangement([
        { kind: "find_us", position: 0, enabled: true },
        { kind: "offers", position: 1, enabled: false },
    ]);

    assert.equal(sections[0].kind, "find_us");
    assert.equal(sections[1].kind, "offers");
    assert.equal(sections[1].enabled, false);
});

// The one that bites later: a kind added to the product after somebody
// arranged their page would be invisible to them forever.
test("a kind they have never seen appears at the bottom, switched on", () => {
    const sections = arrangement([
        { kind: "offers", position: 0, enabled: true },
        { kind: "find_us", position: 1, enabled: true },
    ]);

    assert.equal(sections.length, BIO_KINDS.length);
    assert.deepEqual(sections.slice(0, 2).map((s) => s.kind), ["offers", "find_us"]);

    const photos = sections.find((section) => section.kind === "photos");
    assert.ok(photos);
    assert.equal(photos.enabled, true);
});

test("a row we no longer have is ignored rather than rendered", () => {
    const sections = arrangement([
        { kind: "a_kind_we_dropped", position: 0, enabled: true },
        { kind: "offers", position: 1, enabled: true },
    ]);

    assert.ok(sections.every((section) => (section.kind as string) !== "a_kind_we_dropped"));
    assert.equal(sections[0].kind, "offers");
});

test("moving renumbers from zero, so positions cannot drift", () => {
    const start = arrangement([]);
    const after = moved(start, "loyalty", -1);

    assert.equal(after[1].kind, "loyalty");
    assert.equal(after[2].kind, "offers");
    assert.deepEqual(
        after.map((section) => section.position),
        after.map((_, index) => index),
    );
});

test("moving off either end changes nothing", () => {
    const start = arrangement([]);
    const first = start[0].kind;
    const last = start[start.length - 1].kind;

    assert.equal(moved(start, first, -1)[0].kind, first);
    assert.equal(moved(start, last, 1)[start.length - 1].kind, last);
});

// A bio page that can carry a javascript: url can carry anything.
test("only http and https survive", () => {
    assert.equal(tidyUrl("javascript:alert(1)"), null);
    assert.equal(tidyUrl("data:text/html,hi"), null);
    assert.equal(tidyUrl(""), null);
    assert.equal(tidyUrl("not a url"), null);
    assert.ok(tidyUrl("https://example.com")?.startsWith("https://"));
});

test("a bare domain is assumed to be https", () => {
    assert.equal(tidyUrl("example.com/menu"), "https://example.com/menu");
});

test("a notice is up all through its last day and gone after", () => {
    const notice = "Closed Sunday 24th";

    assert.equal(noticeShowing(notice, "2026-11-24", new Date("2026-11-24T18:00:00Z")), notice);
    assert.equal(noticeShowing(notice, "2026-11-24", new Date("2026-11-25T09:00:00Z")), null);
    assert.equal(noticeShowing(notice, null, new Date("2030-01-01T00:00:00Z")), notice);
    assert.equal(noticeShowing("   ", "2030-01-01"), null);
});

// 07… is how a UK number is written, not how it is dialled from abroad,
// which is what a wa.me link is.
test("a uk mobile becomes an international whatsapp link", () => {
    assert.equal(waUrl("07700 900123"), "https://wa.me/447700900123");
    assert.equal(waUrl("+44 7700 900123"), "https://wa.me/447700900123");
    assert.equal(waUrl("123"), null);
});

test("an accent falls back to coral rather than to nothing", () => {
    assert.equal(bioAccent(null), BIO_CORAL);
    assert.equal(bioAccent(""), BIO_CORAL);
    assert.equal(bioAccent("rgb(1,2,3)"), BIO_CORAL);
    assert.equal(bioAccent("#1F4034"), "#1F4034");
});

// A row nobody can read is worse than one in the wrong colour.
test("the ink is the one you can read", () => {
    assert.equal(inkOn("#17233B"), "#FFFFFF");
    assert.equal(inkOn("#FF593F"), "#FFFFFF");
    assert.equal(inkOn("#FFF8F0"), "#17233B");
});
