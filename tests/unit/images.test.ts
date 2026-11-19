import assert from "node:assert/strict";
import { test } from "node:test";

import { isGeneratedCover, uploadedCover } from "@/lib/business-images";
import { encodingFor, localImage, storedImage } from "@/lib/images";

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

// The local Supabase stack serves storage over http on a port, and
// hardcoding https meant every picture read as no image while
// developing. The check follows whatever NEXT_PUBLIC_SUPABASE_URL says,
// so it is the deployment that decides what counts, not a literal.
test("the local stack's http pictures are shown", () => {
    const live = process.env.NEXT_PUBLIC_SUPABASE_URL;

    try {
        process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:55321";

        const local = "http://127.0.0.1:55321/storage/v1/object/public/offer-images/a/b.jpg";

        assert.equal(storedImage(local), local);

        // Same host, another port: a different service, and next/image
        // has not been told about it. The hostname-only check this
        // replaced would have let it through.
        assert.equal(
            storedImage("http://127.0.0.1:54321/storage/v1/object/public/offer-images/a/b.jpg"),
            null,
        );

        // Still only the public bucket, and still not somebody else.
        assert.equal(storedImage("http://127.0.0.1:55321/storage/v1/object/sign/private/b.jpg"), null);
        assert.equal(storedImage("http://localhost:55321/storage/v1/object/public/a.jpg"), null);

        // The live host is not this deployment's host any more.
        assert.equal(storedImage(good), null);
    } finally {
        process.env.NEXT_PUBLIC_SUPABASE_URL = live;
    }
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

// What a cropped image is encoded as.
//
// Never WebP: Outlook on Windows renders mail through Word, which has
// never supported it, so a .webp logo arrives in an email as a red
// cross and lib/email.ts refuses to send one.
test("a logo is PNG only when it actually needs to be", () => {
    assert.equal(encodingFor("auto", true), "image/png");

    // A type says a file *can* carry transparency, not that it does.
    // Both WebP logos we had were fully opaque, and as PNG they came out
    // four and eight times bigger for nothing.
    assert.equal(encodingFor("auto", false), "image/jpeg");
});

test("a photograph is JPEG whatever its pixels say", () => {
    assert.equal(encodingFor("image/jpeg", true), "image/jpeg");
    assert.equal(encodingFor("image/jpeg", false), "image/jpeg");
});

test("nothing can ask for a format an email client won't draw", () => {
    for (const transparent of [true, false]) {
        assert.notEqual(encodingFor("auto", transparent), "image/webp");
    }
});

// A cover we drew is a stand-in, and the setup steps have to be able to
// tell. The answer rides on the stored path, so these are the shapes it
// actually comes back in.
const BUCKET = "https://owdxoarqivpoplpqiylt.supabase.co/storage/v1/object/public/business-logos";
const BUSINESS = "53e2d26f-711e-48f1-8a97-5258c9236e0d";

test("a cover we drew is known by the name it was stored under", () => {
    assert.equal(isGeneratedCover(`${BUCKET}/${BUSINESS}/cover-generated-1795100008912.png`), true);
});

test("a photo the business uploaded is not", () => {
    assert.equal(isGeneratedCover(`${BUCKET}/${BUSINESS}/cover-1795100008912.jpg`), false);
    assert.equal(isGeneratedCover(`${BUCKET}/${BUSINESS}/cover-1795100008912.png`), false);
    assert.equal(isGeneratedCover(`${BUCKET}/${BUSINESS}/cover-1795100008912.webp`), false);
});

test("a logo is never a generated cover, whatever it is called", () => {
    assert.equal(isGeneratedCover(`${BUCKET}/${BUSINESS}/logo-1795100008912.png`), false);
});

test("nothing at all is not a generated cover", () => {
    assert.equal(isGeneratedCover(null), false);
    assert.equal(isGeneratedCover(undefined), false);
    assert.equal(isGeneratedCover(""), false);
});

// The prefix is matched after a slash, so a business whose own upload
// happens to sit under a path containing the words is still theirs.
test("the name is matched as a path segment, not anywhere in the url", () => {
    assert.equal(isGeneratedCover(`${BUCKET}/${BUSINESS}/cover-1795.jpg?v=cover-generated-1`), false);
    assert.equal(isGeneratedCover("https://example.com/cover-generated/photo.jpg"), false);
});

test("uploadedCover gives back only what the business actually sent", () => {
    const theirs = `${BUCKET}/${BUSINESS}/cover-1795100008912.jpg`;
    const ours = `${BUCKET}/${BUSINESS}/cover-generated-1795100008912.png`;

    assert.equal(uploadedCover(theirs), theirs);
    // Both "nothing" and "only a placeholder" answer the same, because
    // that is the question the setup steps are asking.
    assert.equal(uploadedCover(ours), null);
    assert.equal(uploadedCover(null), null);
    assert.equal(uploadedCover(""), null);
});
