// The card code out of whatever a QR carried. A loyalty card's QR holds
// the link staff land on when they scan it with a phone camera
// (/stamp/<code>), and a code typed by hand is the code itself.
export function cardCodeFrom(text: string) {
    const value = text.trim();

    const link = value.match(/\/stamp\/([a-z0-9]{6,32})/i);
    if (link) return link[1].toUpperCase();

    const bare = value.match(/^([a-z0-9]{10})$/i);
    if (bare) return bare[1].toUpperCase();

    return null;
}
