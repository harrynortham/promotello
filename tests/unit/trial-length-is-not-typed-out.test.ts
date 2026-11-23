import assert from "node:assert/strict";
import { test } from "node:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// A trial length written out by hand goes stale silently. It happened
// eight times: the pricing page, the help centre, getting started, the
// billing help panel, four sentences in the lifecycle sequence, a
// button and a subject line — each quoting thirty days to businesses
// who were being offered ninety, while lib/billing.ts held both numbers
// all along.
//
// So: no user-facing file names a trial length as a literal. Use
// TRIAL_DAYS, FOUNDING_TRIAL_DAYS or freeFor(), and this never has to
// be found by reading the site again.

const roots = ["app", "lib", "components"];
const SKIP = /node_modules|\.next|tests?\//;

// A number of days or months, on a line that is talking about a trial
// or something being free. "Last 30 days" of scans is an analytics
// window and none of this test's business.
const PERIOD = /\b(30|90|thirty|ninety)[- ]days?\b|\b(1|3|one|three)[- ]months?\b/i;
// "free" as an object key (plan-features rows) is not prose.
const ABOUT_A_TRIAL = /\btrial\b|\bfree\b(?!\s*:)/i;

function files(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);

        if (SKIP.test(path)) return [];
        if (statSync(path).isDirectory()) return files(path);

        return /\.tsx?$/.test(path) ? [path] : [];
    });
}

test("no trial length is typed out in user-facing copy", () => {
    const offenders: string[] = [];

    for (const root of roots) {
        for (const path of files(root)) {
            // This file quotes the patterns it bans.
            if (path.includes("trial-length-is-not-typed-out")) continue;

            readFileSync(path, "utf8")
                .split("\n")
                .forEach((line, i) => {
                    // Comments explain the rule; they do not ship.
                    if (/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(line)) return;
                    if (!PERIOD.test(line) || !ABOUT_A_TRIAL.test(line)) return;

                    offenders.push(`${path}:${i + 1}  ${line.trim().slice(0, 90)}`);
                });
        }
    }

    assert.deepEqual(
        offenders,
        [],
        `a trial length is written out rather than read from lib/billing.ts:\n${offenders.join("\n")}`,
    );
});
