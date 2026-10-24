import { ImageResponse } from "next/og";

// Share images for an offer or event, in brand colours, using the offer's
// photo when it has one. Built with next/og.
//   story: 1080×1920, Instagram and Facebook stories
//   post:  1080×1080, Instagram and Facebook feed posts
//   og:    1200×630, link previews on WhatsApp, Facebook, X and iMessage

export type ShareImageFormat = "story" | "post" | "og";

type ShareImageContent = {
    eyebrow: string;
    headline: string;
    badge?: string;
    detail?: string;
    business: string;
    url: string;
    imageUrl?: string | null;
};

const sizes: Record<ShareImageFormat, { width: number; height: number }> = {
    story: { width: 1080, height: 1920 },
    post: { width: 1080, height: 1080 },
    og: { width: 1200, height: 630 },
};

function Badge({ text, size }: { text: string; size: number }) {
    return (
        <div
            style={{
                display: "flex",
                alignSelf: "flex-start",
                background: "#FF593F",
                color: "white",
                fontSize: size,
                fontWeight: 700,
                padding: `${size * 0.28}px ${size * 0.62}px`,
                borderRadius: 999,
            }}
        >
            {text}
        </div>
    );
}

function Story({ content }: { content: ShareImageContent }) {
    return (
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#17233B", color: "#FFF8F0" }}>
            {content.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={content.imageUrl} alt="" width={1080} height={760} style={{ width: 1080, height: 760, objectFit: "cover" }} />
            ) : (
                <div style={{ display: "flex", height: 300 }} />
            )}
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, padding: "70px 90px 110px" }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ fontSize: 40, letterSpacing: 6, textTransform: "uppercase", color: "#FF8F7D" }}>{`${content.eyebrow} · ${content.business}`}</div>
                    {content.badge && (
                        <div style={{ display: "flex", marginTop: 44 }}>
                            <Badge text={content.badge} size={58} />
                        </div>
                    )}
                    <div style={{ display: "flex", width: 900, fontSize: content.headline.length > 40 ? 76 : 92, fontWeight: 700, lineHeight: 1.08, marginTop: 36 }}>{content.headline}</div>
                    {content.detail && <div style={{ fontSize: 46, marginTop: 30, opacity: 0.8 }}>{content.detail}</div>}
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ fontSize: 42, opacity: 0.7 }}>Claim it free on</div>
                    <div style={{ fontSize: 72, fontWeight: 700, color: "#FF593F" }}>promotello</div>
                    <div style={{ fontSize: 34, opacity: 0.6, marginTop: 8 }}>{content.url}</div>
                </div>
            </div>
        </div>
    );
}

function Post({ content }: { content: ShareImageContent }) {
    return (
        <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#17233B", color: "#FFF8F0" }}>
            {content.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={content.imageUrl} alt="" width={1080} height={1080} style={{ position: "absolute", top: 0, left: 0, width: 1080, height: 1080, objectFit: "cover" }} />
            )}
            <div
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: 1080,
                    height: 1080,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    padding: 80,
                    backgroundImage: "linear-gradient(to bottom, rgba(23,35,59,0.05) 25%, rgba(23,35,59,0.95) 72%)",
                }}
            >
                <div style={{ fontSize: 34, letterSpacing: 5, textTransform: "uppercase", color: "#FF8F7D" }}>{content.business}</div>
                {content.badge && (
                    <div style={{ display: "flex", marginTop: 28 }}>
                        <Badge text={content.badge} size={46} />
                    </div>
                )}
                <div style={{ display: "flex", width: 920, fontSize: content.headline.length > 40 ? 62 : 76, fontWeight: 700, lineHeight: 1.08, marginTop: 24 }}>{content.headline}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 36 }}>
                    <div style={{ fontSize: 34, opacity: 0.8 }}>{content.detail ?? ""}</div>
                    <div style={{ fontSize: 46, fontWeight: 700, color: "#FF593F" }}>promotello</div>
                </div>
            </div>
        </div>
    );
}

function LinkPreview({ content }: { content: ShareImageContent }) {
    return (
        <div style={{ width: "100%", height: "100%", display: "flex", background: "#17233B", color: "#FFF8F0" }}>
            {content.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={content.imageUrl} alt="" width={520} height={630} style={{ width: 520, height: 630, objectFit: "cover" }} />
            )}
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, padding: "56px 60px" }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ fontSize: 26, letterSpacing: 4, textTransform: "uppercase", color: "#FF8F7D" }}>{content.business}</div>
                    {content.badge && (
                        <div style={{ display: "flex", marginTop: 26 }}>
                            <Badge text={content.badge} size={34} />
                        </div>
                    )}
                    <div style={{ display: "flex", width: 560, fontSize: content.headline.length > 50 ? 46 : 56, fontWeight: 700, lineHeight: 1.1, marginTop: 22 }}>{content.headline}</div>
                    {content.detail && <div style={{ fontSize: 28, marginTop: 18, opacity: 0.8 }}>{content.detail}</div>}
                </div>
                <div style={{ fontSize: 36, fontWeight: 700, color: "#FF593F" }}>promotello</div>
            </div>
        </div>
    );
}

export function shareImage(content: ShareImageContent, format: ShareImageFormat = "story") {
    const element =
        format === "post" ? <Post content={content} /> : format === "og" ? <LinkPreview content={content} /> : <Story content={content} />;

    return new ImageResponse(element, {
        ...sizes[format],
        headers: { "Content-Disposition": `inline; filename=${format}.png` },
    });
}

// Kept for the event route.
export function storyImage(content: ShareImageContent) {
    return shareImage(content, "story");
}
