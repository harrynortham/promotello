import assert from "node:assert/strict";
import { test } from "node:test";

import { storedImage } from "@/lib/images";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";

const host = "example.supabase.co";
const good = `https://${host}/storage/v1/object/public/business-logos/abc/logo.jpg`;

test("a file in Supabase storage is servable", () => {
    assert.equal(storedImage(good), good);
});

test("anything next/image would refuse reads as no image", () => {
    // The one that took a dashboard down.
    assert.equal(storedImage("https://example.com/logo.png"), null);
    // Right host, wrong place: only the public bucket is allowed.
    assert.equal(storedImage(`https://${host}/storage/v1/object/sign/private/logo.jpg`), null);
    assert.equal(storedImage(`http://${host}/storage/v1/object/public/a.jpg`), null);
    assert.equal(storedImage("/brand/logo.svg"), null);
    assert.equal(storedImage("not a url"), null);
    assert.equal(storedImage(""), null);
    assert.equal(storedImage(null), null);
    assert.equal(storedImage(undefined), null);
});
