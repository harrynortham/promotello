import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

import { emailSocialRow } from "@/lib/email";
import { socialProfiles } from "@/lib/site";

// The icons in every email's footer are the same six accounts the
// website's footer links to, and the file names are the network keys.
// That is the whole arrangement, so these two tests are the whole of
// what can go wrong with it.

test("every account on the site has an icon in the email footer", () => {
    const row = emailSocialRow();

    for (const profile of socialProfiles) {
        assert.ok(row.includes(profile.url), `links to ${profile.label}`);
        assert.ok(
            row.includes(`/email/social/${profile.network}.png`),
            `draws ${profile.network}.png`,
        );
        // Half of mail clients block images until asked.
        assert.ok(row.includes(`alt="${profile.label}"`), `${profile.label} is named`);
    }
});

// A seventh account added to lib/site.ts without an icon beside it
// would ship a broken image to everybody, and the first to notice
// would be a customer.
test("every icon the footer asks for is a file we actually serve", () => {
    const served = path.join(process.cwd(), "public", "email", "social");

    for (const profile of socialProfiles) {
        const file = path.join(served, `${profile.network}.png`);

        assert.ok(fs.existsSync(file), `public/email/social/${profile.network}.png is missing`);
        assert.ok(fs.statSync(file).size > 0, `${profile.network}.png is empty`);
    }
});

test("the links are absolute, because an email has no site to be relative to", () => {
    const row = emailSocialRow();

    assert.ok(!/src="\//.test(row), "no root-relative image");
    assert.match(row, /src="https?:\/\//);
});
