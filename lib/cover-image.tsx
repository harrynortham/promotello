/* eslint-disable @next/next/no-img-element -- satori, which next/og
   renders through, draws plain <img> and knows nothing about
   next/image. These are inline SVG data URIs besides: there is nothing
   to fetch and nothing to optimise. */
import { ImageResponse } from "next/og";

import { categoryIcon, iconDataUri } from "@/lib/cover-icons";
import { coverLayout, coverPalette, type CoverPalette } from "@/lib/cover-colours";

// The same pixels an uploaded cover is cropped to in the browser:
// 16/9 at maxSize 1600, from the cover config in
// components/business-image-form.tsx. A generated cover that is a
// different shape would sit differently in the directory card and the
// page header, which is the one thing it must not do.
export const COVER_WIDTH = 1600;
export const COVER_HEIGHT = 900;

// What the logo averages to, if there is a logo and sharp can read it.
//
// sharp's own stats() gives it: the most common colour in a coarse
// histogram, rather than the mean of every pixel. That matters — the
// mean of a red-and-white logo is pink, which belongs to no business,
// while the most common is one or the other. It is still often white or
// black, which is what isUsableLogoColour is for.
export async function dominantColourFromBytes(bytes: Buffer): Promise<string | null> {
    try {
        const sharp = (await import("sharp")).default;
        const { dominant } = await sharp(bytes).stats();

        return `#${[dominant.r, dominant.g, dominant.b]
            .map((value) => value.toString(16).padStart(2, "0"))
            .join("")}`.toUpperCase();
    } catch {
        // A logo that will not decode is the same as no logo: the
        // trade's colour is used instead. Worth no more than this,
        // since nothing is lost by it.
        return null;
    }
}

// The same, for a logo already in storage.
export async function dominantColourOf(imageUrl: string): Promise<string | null> {
    try {
        const response = await fetch(imageUrl);

        if (!response.ok) return null;

        return dominantColourFromBytes(Buffer.from(await response.arrayBuffer()));
    } catch {
        return null;
    }
}

type CoverContent = {
    // The trade, for the colour, and its mark, for the pattern. The
    // mark is the category's own icon_path; the slug still picks the
    // colour, which is a code decision rather than an editable one.
    categorySlug?: string | null;
    categoryIconPath?: string | null;
    logoColour?: string | null;
    variation?: number;
};

function Cover({ palette, layout, content }: { palette: CoverPalette; layout: ReturnType<typeof coverLayout>; content: CoverContent }) {
    const icon = categoryIcon(content.categoryIconPath);

    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                backgroundImage: `linear-gradient(${layout.direction}, ${palette.from}, ${palette.to})`,
            }}
        >
            {layout.pattern === "tiled" ? (
                // A wall of marks. Laid out by hand rather than with a
                // repeating background, which satori does not do: six
                // rows of eight, offset on alternate rows so it reads as
                // a pattern and not a grid.
                // top/left/width/height rather than inset: satori does
                // not resolve the shorthand, so the box shrank to its
                // contents and the rows' width: 100% resolved against
                // that — eight cups in the left third of a bare cover.
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: COVER_WIDTH,
                        height: COVER_HEIGHT,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-around",
                    }}
                >
                    {[0, 1, 2, 3, 4, 5].map((row) => (
                        <div
                            key={row}
                            style={{
                                display: "flex",
                                // Spelled out, because satori sizes a
                                // flex child to its contents unless
                                // told otherwise: without it the eight
                                // cups bunched into the left third and
                                // the right half of the cover was bare.
                                width: "100%",
                                justifyContent: "space-around",
                                marginLeft: row % 2 === 0 ? 0 : 90,
                                marginRight: row % 2 === 0 ? 0 : -90,
                            }}
                        >
                            {[0, 1, 2, 3, 4, 5, 6, 7].map((column) => (
                                <img key={column} alt="" src={iconDataUri(icon, palette.ink, 0.2)} width={86} height={86} />
                            ))}
                        </div>
                    ))}
                </div>
            ) : (
                // One big one, bleeding off the bottom-right corner.
                // Cropped on purpose: a whole icon centred in a
                // rectangle looks like a missing-image placeholder,
                // which is the one thing a cover must not look like.
                <img
                    alt=""
                    src={iconDataUri(icon, palette.ink, 0.17)}
                    width={760}
                    height={760}
                    style={{ position: "absolute", right: -130, bottom: -150 }}
                />
            )}

        </div>
    );
}

export function coverImage(content: CoverContent) {
    const variation = content.variation ?? 0;

    return new ImageResponse(
        (
            <Cover
                palette={coverPalette({ logoColour: content.logoColour, categorySlug: content.categorySlug, variation })}
                layout={coverLayout(variation)}
                content={content}
            />
        ),
        { width: COVER_WIDTH, height: COVER_HEIGHT },
    );
}
