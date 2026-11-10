import sharp from "sharp";

import { qrSvg } from "@/lib/qr";
import { absoluteUrl } from "@/lib/site";

// A voucher's QR code as a PNG, for the email that confirms the claim.
// The card on the offer page draws its own in the browser; no email
// client runs JavaScript, and none of the big ones show an SVG either
// (the logo at the top of every email is a PNG for the same reason).
//
// It gives nothing away: the picture is the code, which is already in
// the email it appears in, and the link it carries is our own
// /redeem/<code> — the page that decides what the code is and who may
// use it.

// Big enough for a retina screen at the 160px it is shown at, and for
// somebody who enlarges the email to scan it off another phone.
const SIZE = 480;

// Ten characters, which is both shapes: an offer voucher (10 hex) and a
// reward voucher from an automation ("G" + 9 hex). Anything else isn't a
// code, so there is nothing to draw.
const CODE = /^[0-9A-Z]{10}$/;

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
    const { code } = await params;
    const wanted = decodeURIComponent(code).toUpperCase();

    if (!CODE.test(wanted)) {
        return new Response("Not found", { status: 404 });
    }

    const svg = await qrSvg(absoluteUrl(`/redeem/${wanted}`), "#17233B", 2);
    const png = await sharp(Buffer.from(svg)).resize(SIZE, SIZE).png().toBuffer();

    return new Response(new Uint8Array(png), {
        headers: {
            "Content-Type": "image/png",
            // The picture of a code is the same picture for ever, and
            // Gmail's proxy will cache it once for everyone anyway.
            "Cache-Control": "public, max-age=31536000, immutable",
            "X-Robots-Tag": "noindex",
        },
    });
}
