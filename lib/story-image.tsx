import { ImageResponse } from "next/og";

// A 1080×1920 Instagram story image for an offer or event: brand colours,
// big headline, and where to find it. Built with next/og.

export function storyImage({
    eyebrow,
    headline,
    badge,
    detail,
    business,
    url,
}: {
    eyebrow: string;
    headline: string;
    badge?: string;
    detail?: string;
    business: string;
    url: string;
}) {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    background: "#17233B",
                    color: "#FFF8F0",
                    padding: "120px 90px",
                    fontFamily: "sans-serif",
                }}
            >
                <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ fontSize: 40, letterSpacing: 6, textTransform: "uppercase", color: "#FF8F7D" }}>{eyebrow}</div>
                    <div style={{ fontSize: 64, marginTop: 24, color: "#FFF8F0", opacity: 0.8 }}>{business}</div>
                </div>

                <div style={{ display: "flex", flexDirection: "column" }}>
                    {badge && (
                        <div
                            style={{
                                display: "flex",
                                alignSelf: "flex-start",
                                background: "#FF593F",
                                color: "white",
                                fontSize: 64,
                                fontWeight: 700,
                                padding: "18px 40px",
                                borderRadius: 999,
                                marginBottom: 48,
                            }}
                        >
                            {badge}
                        </div>
                    )}
                    <div style={{ fontSize: headline.length > 60 ? 84 : 108, fontWeight: 700, lineHeight: 1.08 }}>{headline}</div>
                    {detail && <div style={{ fontSize: 48, marginTop: 40, opacity: 0.8 }}>{detail}</div>}
                </div>

                <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ fontSize: 44, opacity: 0.7 }}>Find it on</div>
                    <div style={{ fontSize: 72, fontWeight: 700, color: "#FF593F" }}>promotello</div>
                    <div style={{ fontSize: 36, opacity: 0.6, marginTop: 12 }}>{url}</div>
                </div>
            </div>
        ),
        {
            width: 1080,
            height: 1920,
            headers: { "Content-Disposition": "inline; filename=story.png" },
        },
    );
}
