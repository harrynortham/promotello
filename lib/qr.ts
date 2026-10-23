import QRCode from "qrcode";

// The short link printed on a poster. Scans go through /q/<code> so they
// can be counted before redirecting.
export function qrLink(origin: string, code: string) {
    return `${origin.replace(/\/$/, "")}/q/${code}`;
}

// QR code as an SVG string. High error correction keeps it scannable if the
// poster gets scuffed or partly covered.
export function qrSvg(url: string, color = "#17233B") {
    return QRCode.toString(url, {
        type: "svg",
        errorCorrectionLevel: "H",
        margin: 1,
        color: { dark: color, light: "#FFFFFF" },
    });
}

export function deviceFromUserAgent(userAgent: string | null) {
    const ua = (userAgent ?? "").toLowerCase();

    if (/ipad|tablet|kindle|silk|(android(?!.*mobile))/.test(ua)) return "tablet";
    if (/mobi|iphone|ipod|android/.test(ua)) return "mobile";
    if (/windows|macintosh|linux|cros/.test(ua)) return "desktop";

    return "other";
}
