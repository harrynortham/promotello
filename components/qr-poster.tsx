import Image from "next/image";

import { cardColour } from "@/lib/loyalty-design";

// The printable QR poster (app/poster/[codeId]), also shown small on the
// QR page so a business can see what it is about to make. Everything is
// sized in em from the root font size, so one design covers A4, A5 and a
// thumbnail.
export function QrPoster({
    width,
    height,
    fontSize,
    businessName,
    place,
    logoUrl,
    offer,
    qrMarkup,
    link,
    colour,
    eyebrow,
    headline,
    detail,
    className = "",
}: {
    width: string;
    height: string;
    // The root size everything scales from: 16px at A4.
    fontSize: number;
    businessName: string;
    place?: string | null;
    logoUrl?: string | null;
    // The headline offer, when the poster points at one.
    offer?: { discount: string; description?: string | null } | null;
    qrMarkup: string;
    link: string;
    // The business's chosen poster colour, falling back to navy.
    colour?: string | null;
    // Words the business wrote; empty means work them out from the offer.
    eyebrow?: string | null;
    headline?: string | null;
    // The line under the headline on an offer poster: what the offer is,
    // in the business's own words. Empty falls back to the offer's
    // description.
    detail?: string | null;
    className?: string;
}) {
    // A code that opens the business page lands on a list of offers, so
    // "claim it" has nothing to point at yet.
    const theme = cardColour(colour);
    const pill = eyebrow?.trim() || (offer ? "Exclusive offer" : "Scan for offers");
    const title = headline?.trim() || (offer ? offer.discount : `See what's on at ${businessName}`);
    // A written headline is usually a sentence, so it needs smaller type.
    const titleSize = headline?.trim() ? "3.4em" : offer ? "5.4em" : "3.8em";

    return (
        <article
            className={`relative flex flex-col overflow-hidden bg-[#FFF8F0] text-[#17233B] ${className}`}
            style={{ width, height, fontSize: `${fontSize}px` }}
        >
            <header
                className="flex items-center gap-[1em] px-[2.5em] py-[1.8em] text-white"
                style={{ backgroundColor: theme.header }}
            >
                {logoUrl && (
                    <Image
                        src={logoUrl}
                        alt=""
                        width={96}
                        height={96}
                        className="rounded-[0.8em] object-cover"
                        style={{ width: "4.2em", height: "4.2em" }}
                    />
                )}
                <div className="min-w-0">
                    <p className="truncate font-semibold" style={{ fontSize: "1.9em", lineHeight: 1.1 }}>
                        {businessName}
                    </p>
                    {place && <p className="mt-[0.2em] text-white/70" style={{ fontSize: "1.05em" }}>{place}</p>}
                </div>
            </header>

            <div className="flex flex-1 flex-col items-center justify-center px-[2.5em] py-[1.5em] text-center">
                <p
                    className="rounded-full px-[1em] py-[0.35em] font-semibold uppercase tracking-[0.12em] text-white"
                    style={{ fontSize: "0.95em", backgroundColor: theme.stamp }}
                >
                    {pill}
                </p>

                <h1 className="mt-[0.5em] font-semibold tracking-tight" style={{ fontSize: titleSize, lineHeight: 1.05 }}>
                    {title}
                </h1>

                {offer && (detail?.trim() || offer.description) && (
                    <p
                        className="mt-[0.5em] line-clamp-3 max-w-[24em] text-[#17233B]/75"
                        style={{ fontSize: "1.45em", lineHeight: 1.3 }}
                    >
                        {detail?.trim() || offer.description}
                    </p>
                )}

                {/* No shadow on paper: a printer flattens the blur into
                    a solid grey rectangle around the code, which reads as
                    the words above and below running into it. A hairline
                    keeps the card's edge instead. */}
                <div
                    className="mt-[1.6em] rounded-[1.4em] bg-white p-[1em] shadow-[0_0.4em_1.6em_rgba(23,35,59,0.12)] print:border print:border-[#17233B]/10 print:shadow-none [&>svg]:h-full [&>svg]:w-full"
                    style={{ width: "23em", height: "23em" }}
                    dangerouslySetInnerHTML={{ __html: qrMarkup }}
                />

                <p className="mt-[1em] font-semibold" style={{ fontSize: "1.5em" }}>
                    Point your phone camera here
                </p>
                <p className="mt-[0.3em] text-[#17233B]/70" style={{ fontSize: "1.05em" }}>
                    {offer
                        ? "Claim it free on Promotello, then show your code when you pay."
                        : "Every offer is free to claim on Promotello. Show your code when you pay."}
                </p>
            </div>

            <footer className="flex items-center justify-between border-t border-[#17233B]/10 px-[2.5em] py-[1.2em]">
                <Image
                    src="/brand/promotello-horizontal-primary.svg"
                    alt="Promotello"
                    width={180}
                    height={48}
                    style={{ width: "9em", height: "auto" }}
                />
                <p className="text-[#17233B]/70" style={{ fontSize: "0.95em" }}>
                    {link.replace(/^https?:\/\//, "")}
                </p>
            </footer>
        </article>
    );
}
