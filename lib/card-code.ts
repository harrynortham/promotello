// The code out of whatever a QR carried.
//
// A loyalty card's QR holds the link staff land on when they scan it
// with a phone camera (/stamp/<code>); a voucher's holds /redeem/<code>.
// Both codes are ten characters, so a code typed or read by hand is
// taken at face value and the page it opens decides what it is.

export type ScannedKind = "stamp" | "redeem";

export function scannedCodeFrom(kind: ScannedKind, text: string) {
    const value = text.trim();

    const link = value.match(new RegExp(`/${kind}/([a-z0-9]{6,32})`, "i"));
    if (link) return link[1].toUpperCase();

    const bare = value.match(/^([a-z0-9]{10})$/i);
    if (bare) return bare[1].toUpperCase();

    return null;
}

// A loyalty card, which is where this started.
export function cardCodeFrom(text: string) {
    return scannedCodeFrom("stamp", text);
}
