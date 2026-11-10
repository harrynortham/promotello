import assert from "node:assert/strict";
import { test } from "node:test";

import { localImage, storedImage } from "@/lib/images";

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

// The live preview beside a form: the photo exists in the browser and
// nowhere else yet.
test("a picture the browser just made is shown as it is", () => {
    assert.equal(localImage("blob:http://localhost:3000/9f2b-1c4d"), "blob:http://localhost:3000/9f2b-1c4d");
    assert.equal(localImage("data:image/jpeg;base64,/9j/4AAQ"), "data:image/jpeg;base64,/9j/4AAQ");
});

test("nothing from anywhere else gets in that way", () => {
    assert.equal(localImage("https://example.com/logo.png"), null);
    assert.equal(localImage(good), null);
    assert.equal(localImage("data:text/html,<script>alert(1)</script>"), null);
    assert.equal(localImage("javascript:alert(1)"), null);
    assert.equal(localImage(null), null);
    assert.equal(localImage(""), null);
});
