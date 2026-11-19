import assert from "node:assert/strict";
import { test } from "node:test";

import { DEFAULT_ICON, iconName, isIconName } from "@/lib/cover-icons";

test("a real lucide name is kept", () => {
    assert.equal(iconName("Beer"), "Beer");
    assert.equal(iconName("Scissors"), "Scissors");
    assert.equal(iconName("Croissant"), "Croissant");
});

// The name arrives in a request and ends up naming a component to
// render, so anything not in the library has to stop here.
test("anything not in the library becomes the shop front", () => {
    assert.equal(iconName("NotAnIcon"), DEFAULT_ICON);
    assert.equal(iconName(""), DEFAULT_ICON);
    assert.equal(iconName(null), DEFAULT_ICON);
    assert.equal(iconName(undefined), DEFAULT_ICON);
    assert.equal(iconName(42), DEFAULT_ICON);
    assert.equal(iconName({}), DEFAULT_ICON);
});

// hasOwnProperty rather than `in`, so the prototype chain is not a way
// to name something that is not an icon.
test("an inherited property is not an icon", () => {
    assert.equal(isIconName("toString"), false);
    assert.equal(isIconName("constructor"), false);
    assert.equal(isIconName("__proto__"), false);
    assert.equal(iconName("constructor"), DEFAULT_ICON);
});

test("the fallback is itself a real icon", () => {
    assert.equal(isIconName(DEFAULT_ICON), true);
});
