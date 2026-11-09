import assert from "node:assert/strict";
import { test } from "node:test";

import { checklistView, type ChecklistGroup } from "@/lib/onboarding-checklist";

function groups(done: { required: boolean[]; optional: boolean[] }): ChecklistGroup[] {
    const item = (id: string, completed: boolean) => ({
        id,
        label: id,
        description: id,
        completed,
        href: `/${id}`,
        action: id,
    });

    return [
        {
            title: "Get ready to go live",
            description: "",
            required: true,
            items: done.required.map((completed, index) => item(`r${index}`, completed)),
        },
        {
            title: "Bring in customers",
            description: "",
            required: false,
            items: done.optional.map((completed, index) => item(`o${index}`, completed)),
        },
    ];
}

test("while setup is unfinished the whole list is shown", () => {
    const view = checklistView(groups({ required: [true, false], optional: [false] }));

    assert.equal(view.done, false);
    assert.equal(view.ready, false);
    assert.equal(view.progress, 50);
    assert.equal(view.nextStepId, "r1", "the next step is the first thing left");
    assert.equal(view.groups.length, 2);
    assert.equal(view.groups[0].items.length, 2, "ticked steps still count as progress");
});

test("once the required steps are done only what is left is shown", () => {
    const view = checklistView(groups({ required: [true, true], optional: [true, false] }));

    assert.equal(view.done, false);
    assert.equal(view.ready, true);
    assert.equal(view.groups.length, 1, "the finished group goes");
    assert.deepEqual(
        view.groups[0].items.map((item) => item.id),
        ["o1"],
        "and so do the ticked items in the one that is left",
    );
});

test("with nothing left the card goes entirely", () => {
    const view = checklistView(groups({ required: [true, true], optional: [true, true] }));

    assert.equal(view.done, true);
    assert.equal(view.groups.length, 0);
    assert.equal(view.nextStepId, null);
});

test("a business with no steps at all is finished, not stuck at zero", () => {
    const view = checklistView([]);

    assert.equal(view.done, true);
    assert.equal(view.progress, 100);
});

test("a locked step is never the next step", () => {
    const view = checklistView([
        {
            title: "Get ready to go live",
            description: "",
            required: true,
            items: [
                { id: "logo", label: "Add your logo", description: "", completed: false, href: "/logo", action: "Add logo" },
                {
                    id: "review",
                    label: "Send your page for review",
                    description: "",
                    completed: false,
                    locked: true,
                    lockedReason: "Ready once the steps above are done.",
                    href: "#send-for-review",
                    action: "Send for review",
                },
            ],
        },
    ]);

    // Pointing someone at something they can't do is worse than nothing.
    assert.equal(view.nextStepId, "logo");
    assert.equal(view.done, false);
});

test("once nothing is locked, the step they are waiting on leads", () => {
    const view = checklistView([
        {
            title: "Get ready to go live",
            description: "",
            required: true,
            items: [
                { id: "logo", label: "Add your logo", description: "", completed: true, href: "/logo", action: "Add logo" },
                {
                    id: "review",
                    label: "Send your page for review",
                    description: "",
                    completed: false,
                    locked: false,
                    href: "#send-for-review",
                    action: "Send for review",
                },
            ],
        },
    ]);

    assert.equal(view.nextStepId, "review");
});
