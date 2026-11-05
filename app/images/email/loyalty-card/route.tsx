import { ImageResponse } from "next/og";

// What a loyalty card looks like on a customer's phone, for the emails
// that ask a business to try Pro. Drawn here rather than photographed: it
// is the real card's shape and colours, and it can't go out of date.
//
// Rendered at twice the size it is shown at, so it stays sharp on a
// phone, and cached hard — it is the same picture for everyone.
export const alt = "A Promotello loyalty card with eight of nine stamps collected";
export const contentType = "image/png";

const WIDTH = 960;
const HEIGHT = 600;

const INK = "#17233B";
const CORAL = "#FF593F";
const CREAM = "#FFF4E8";

// Drawn, not typed: the font this renders with has no tick or star, and a
// character it doesn't have comes out as an empty box.
function Tick({ colour }: { colour: string }) {
    return (
        <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke={colour} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
        </svg>
    );
}

function Star({ colour }: { colour: string }) {
    return (
        <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke={colour} strokeWidth="2.5" strokeLinejoin="round">
            <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
    );
}

function Stamp({ filled, reward }: { filled: boolean; reward?: boolean }) {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 92,
                height: 92,
                borderRadius: 999,
                border: `4px solid ${filled ? CORAL : "rgba(255,255,255,0.28)"}`,
                background: filled ? CORAL : "transparent",
            }}
        >
            {reward ? <Star colour={filled ? "#FFFFFF" : "#FF8F7D"} /> : filled ? <Tick colour="#FFFFFF" /> : null}
        </div>
    );
}

export async function GET() {
    const stamps = Array.from({ length: 9 }, (_, index) => index < 8);

    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    background: CREAM,
                    padding: 48,
                }}
            >
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        background: INK,
                        borderRadius: 40,
                        padding: "48px 56px",
                        color: "#FFFFFF",
                    }}
                >
                    <div style={{ display: "flex", fontSize: 26, letterSpacing: 4, textTransform: "uppercase", color: "#FF8F7D" }}>
                        Loyalty card
                    </div>

                    <div style={{ display: "flex", fontSize: 52, fontWeight: 700, marginTop: 18 }}>
                        Collect 9 stamps, get a free coffee
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 18, marginTop: 40 }}>
                        {stamps.map((filled, index) => (
                            <Stamp key={index} filled={filled} reward={index === 8} />
                        ))}
                    </div>

                    <div style={{ display: "flex", fontSize: 30, marginTop: 36, color: "rgba(255,255,255,0.75)" }}>
                        One more visit to go
                    </div>
                </div>
            </div>
        ),
        {
            width: WIDTH,
            height: HEIGHT,
            headers: {
                // The same picture for everyone, and it only changes when
                // we change it.
                "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
            },
        },
    );
}
