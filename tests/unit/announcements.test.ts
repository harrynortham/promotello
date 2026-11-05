import assert from "node:assert/strict";
import { test } from "node:test";

import { announcementFor, readDismissed } from "@/lib/announcements";

test("the birthday nudge is for people who haven't added one", () => {
    const shown = announcementFor({ hasBirthday: false, dismissed: [] });

    assert.equal(shown?.id, "add-birthday");
    assert.ok(shown?.body.includes("never the year"), "says what we don't ask for");
});

test("it stops once there is a birthday, without being dismissed", () => {
    assert.equal(announcementFor({ hasBirthday: true, dismissed: [] }), null);
});

test("saying not now is remembered, and is per announcement", () => {
    assert.equal(announcementFor({ hasBirthday: false, dismissed: ["add-birthday"] }), null);

    // Something dismissed earlier doesn't silence a new suggestion.
    assert.equal(
        announcementFor({ hasBirthday: false, dismissed: ["some-older-thing"] })?.id,
        "add-birthday",
    );
});

test("dismissals survive whatever the account metadata holds", () => {
    assert.deepEqual(readDismissed({ dismissed_announcements: ["a", "b"] }), ["a", "b"]);
    assert.deepEqual(readDismissed({ dismissed_announcements: ["a", 2, null] }), ["a"]);

    for (const metadata of [null, undefined, {}, { dismissed_announcements: "a" }, { dismissed_announcements: 7 }]) {
        assert.deepEqual(readDismissed(metadata), [], `metadata: ${JSON.stringify(metadata)}`);
    }
});
