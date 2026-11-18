import { readFile } from "node:fs/promises";
import path from "node:path";

import QRCode from "qrcode";
import sharp from "sharp";

// The page a letter is printed on: our letterhead, and the QR code for
// the one business it is going to.
//
// It is a background rather than part of the words because an <img> in
// Stannp's `pages` field destroys the whole body — not only the image,
// the text around it goes too, as a remote URL and as a data URI alike.
// Proved by sending both and reading the sample PDF back: the marker
// words either side of the tag were gone. `background` takes a URL,
// renders beneath the text, and leaves the words alone.
//
// A4 at 300dpi, which is what a printer wants.
//
// JPEG, not PNG. Stannp's `background` refuses a PNG — "Failed to save
// the background file" — whatever the format it takes, and their docs
// only list JPG/PNG/PDF for postcard fronts, not for a letter's
// background. Tested three ways against the live API: our route as PNG
// failed, a PNG with a proper .png extension failed, and a JPEG from
// the same domain worked. So the extension was never the problem and
// the format always was.
//
// Quality 92: there is a QR code on this page and JPEG artefacts around
// hard black edges are exactly what a phone camera struggles with.
const WIDTH = 2480;
const HEIGHT = 3508;

// Clear of Stannp's address window and of the clear zones it overlays
// at the edges, which would otherwise print a white box over the code.
const QR_SIZE = 420;
const QR_RIGHT = 300;
const QR_BOTTOM = 420;

const LOGO_WIDTH = 760;
const LOGO_LEFT = 300;
const LOGO_TOP = 240;

export async function letterBackground(url: string) {
    // High correction, because this is read off paper that has been
    // through a printer, an envelope and somebody's pocket.
    const qr = await QRCode.toBuffer(url, {
        width: QR_SIZE,
        margin: 1,
        errorCorrectionLevel: "H",
        color: { dark: "#17233BFF", light: "#FFFFFFFF" },
    });

    const logo = await readFile(
        path.join(process.cwd(), "public", "brand", "promotello-horizontal-primary.png"),
    );

    const logoResized = await sharp(logo).resize({ width: LOGO_WIDTH }).png().toBuffer();
    const { height: logoHeight = 0 } = await sharp(logoResized).metadata();

    return sharp({
        create: { width: WIDTH, height: HEIGHT, channels: 3, background: "#FFFFFF" },
    })
        .composite([
            { input: logoResized, left: LOGO_LEFT, top: LOGO_TOP },
            { input: qr, left: WIDTH - QR_RIGHT - QR_SIZE, top: HEIGHT - QR_BOTTOM - QR_SIZE },
            {
                // Said beside the code, because a QR with no caption on a
                // letter from somebody you have not heard of is a thing
                // people are told not to scan.
                input: await caption(),
                left: WIDTH - QR_RIGHT - QR_SIZE - 40,
                top: HEIGHT - QR_BOTTOM + 20,
            },
        ])
        .jpeg({ quality: 92, chromaSubsampling: "4:4:4" })
        .toBuffer()
        .then((jpeg) => ({ jpeg, logoHeight }));
}

async function caption() {
    const svg = `<svg width="${QR_SIZE + 80}" height="90" xmlns="http://www.w3.org/2000/svg">
        <text x="${(QR_SIZE + 80) / 2}" y="58" text-anchor="middle"
              font-family="Helvetica, Arial, sans-serif" font-size="40" fill="#17233B">
            Scan to see your page
        </text>
    </svg>`;

    return sharp(Buffer.from(svg)).png().toBuffer();
}
