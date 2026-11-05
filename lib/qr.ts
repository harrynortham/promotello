import QRCode from "qrcode";

// The short link printed on a poster. Scans go through /q/<code> so they
// can be counted before redirecting.
export function qrLink(origin: string, code: string) {
    return `${origin.replace(/\/$/, "")}/q/${code}`;
}

// The brand symbol, from marketing/brand/assets/promotello-symbol-coral.svg.
const SYMBOL_PATH =
    "M238 210 L238 169 C238 140 257 119 283 129 L343 155 C378 172 399 191 399 222 L399 305 C399 331 383 347 355 359 L238 399 L238 336 C238 310 258 296 284 284 L307 273 C334 260 334 249 307 235 Z M118 440 L118 313 C118 283 138 264 164 249 C187 236 213 226 238 219 L238 286 C238 307 224 318 202 330 C179 343 169 352 169 371 L169 397 C169 421 146 440 118 440 Z";

// Puts the brand symbol in the middle of a QR code, on a white tile so the
// covered modules do not confuse a scanner. Safe because every code is
// generated at error correction H, which recovers up to 30%; the tile is
// about 7% of the code's area.
export function brandQrSvg(svg: string) {
    const viewBox = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);

    if (!viewBox) return svg;

    const size = Number(viewBox[1]);
    const tile = size * 0.26;
    const tileAt = (size - tile) / 2;
    const logo = tile * 0.66;
    const logoAt = (size - logo) / 2;

    const badge =
        `<rect x="${tileAt}" y="${tileAt}" width="${tile}" height="${tile}" rx="${tile * 0.22}" fill="#FFFFFF"/>` +
        `<svg x="${logoAt}" y="${logoAt}" width="${logo}" height="${logo}" viewBox="0 0 340 370" overflow="visible">` +
        `<g transform="translate(20 20)">` +
        `<path transform="translate(-108 -118)" fill="#FF593F" fill-rule="evenodd" d="${SYMBOL_PATH}"/>` +
        `</g></svg>`;

    return svg.replace("</svg>", `${badge}</svg>`);
}

// QR code as an SVG string, with the brand symbol in the middle. High error
// correction keeps it scannable if the poster gets scuffed or partly covered.
//
// The margin is in modules (the little squares). One is enough on our own
// poster, where the code sits on white with room around it. A code someone
// downloads is going somewhere we can't see — a menu, a sticker, a leaflet
// — so it carries the four the spec asks for.
export async function qrSvg(url: string, color = "#17233B", margin = 1) {
    const svg = await QRCode.toString(url, {
        type: "svg",
        errorCorrectionLevel: "H",
        margin,
        color: { dark: color, light: "#FFFFFF" },
    });

    return brandQrSvg(svg);
}

export function deviceFromUserAgent(userAgent: string | null) {
    const ua = (userAgent ?? "").toLowerCase();

    if (/ipad|tablet|kindle|silk|(android(?!.*mobile))/.test(ua)) return "tablet";
    if (/mobi|iphone|ipod|android/.test(ua)) return "mobile";
    if (/windows|macintosh|linux|cros/.test(ua)) return "desktop";

    return "other";
}
