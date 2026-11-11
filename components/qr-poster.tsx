import Image from "next/image";

import { storedImage } from "@/lib/images";
import { posterTheme } from "@/lib/poster-colour";

// The printable QR poster (app/poster/[codeId]), also shown small on the
// QR page so a business can see what it is about to make. Everything is
// sized in em from the root font size, so one design covers A4, A5, two
// to a sheet and a thumbnail.
//
// Four arrangements of the same parts, because the same sheet has to
// work stuck inside a window, propped on a table and pinned by a till:
//
//   classic     a colour band with the name in it, words, then the code
//   code_first  the code on a colour panel at the top, words beneath
//   bold        the whole sheet in colour, read from the pavement
//   minimal     no colour block at all, for a window that wants quiet
//
// Paper is not decided here. Any of them prints at A4, A5 or two to a
// sheet.

export const POSTER_LAYOUTS = [
    {
        value: "classic",
        label: "Classic",
        hint: "Your name across the top, the offer in the middle.",
    },
    {
        value: "code_first",
        label: "Code first",
        hint: "The code up top, for tables and tills where they're already close.",
    },
    {
        value: "bold",
        label: "Bold",
        hint: "The whole sheet in colour, to read through a window.",
    },
    {
        value: "minimal",
        label: "Minimal",
        hint: "No colour block. Quiet enough for a smart window.",
    },
] as const;

export type PosterLayout = (typeof POSTER_LAYOUTS)[number]["value"];

export function posterLayout(value: string | null | undefined): PosterLayout {
    return POSTER_LAYOUTS.some((option) => option.value === value)
        ? (value as PosterLayout)
        : "classic";
}

type PosterProps = {
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
    // Their own two colours, when colour is "custom".
    headerColour?: string | null;
    accentColour?: string | null;
    // How the parts are arranged; see POSTER_LAYOUTS.
    layout?: string | null;
    // Words the business wrote; empty means work them out from the offer.
    eyebrow?: string | null;
    headline?: string | null;
    // The line under the headline on an offer poster: what the offer is,
    // in the business's own words. Empty falls back to the offer's
    // description.
    detail?: string | null;
    // The small line to use when the business hasn't written one, for a
    // poster that isn't about an offer — a loyalty card says what it
    // takes to fill: "Collect 9 stamps".
    eyebrowFallback?: string | null;
    // The line under "Point your phone camera here". A claim and a
    // stamp card ask for different things.
    caption?: string | null;
    className?: string;
};

// The parts every arrangement is built from, at module level because a
// component declared inside another one is a new type on every render.

function Logo({ url, size = "4.2em" }: { url?: string | null; size?: string }) {
    const src = storedImage(url);

    if (!src) return null;

    return (
        <Image
            src={src}
            alt=""
            width={96}
            height={96}
            className="shrink-0 rounded-[0.8em] object-cover"
            style={{ width: size, height: size }}
        />
    );
}

function Name({
    businessName,
    place,
    onColour,
}: {
    businessName: string;
    place?: string | null;
    // On the coloured band, where the second line is faded against it.
    onColour: boolean;
}) {
    return (
        <div className="min-w-0">
            <p className="truncate font-semibold" style={{ fontSize: "1.9em", lineHeight: 1.1 }}>
                {businessName}
            </p>
            {place && (
                <p
                    className={`mt-[0.2em] ${onColour ? "opacity-70" : "text-[#17233B]/60"}`}
                    style={{ fontSize: "1.05em" }}
                >
                    {place}
                </p>
            )}
        </div>
    );
}

function Pill({
    children,
    colour,
    ink,
    dark,
}: {
    children: string;
    colour: string;
    ink: string;
    dark: boolean;
}) {
    return (
        <p
            className="rounded-full px-[1em] py-[0.35em] font-semibold uppercase tracking-[0.12em]"
            style={{
                fontSize: "0.95em",
                backgroundColor: dark ? "rgba(255,255,255,0.18)" : colour,
                // On the bold layout the pill sits on the band itself,
                // so it borrows the band's ink rather than its own.
                color: dark ? "inherit" : ink,
            }}
        >
            {children}
        </p>
    );
}

// Balanced: a headline across a poster leaves one word stranded on the
// last line otherwise.
function Title({ children, size }: { children: string; size: string }) {
    return (
        <h1 className="text-balance font-semibold tracking-tight" style={{ fontSize: size, lineHeight: 1.05 }}>
            {children}
        </h1>
    );
}

function Body({ children, dark }: { children: string; dark: boolean }) {
    return (
        <p
            className={`line-clamp-3 max-w-[24em] ${dark ? "opacity-80" : "text-[#17233B]/75"}`}
            style={{ fontSize: "1.45em", lineHeight: 1.3 }}
        >
            {children}
        </p>
    );
}

// No shadow on paper: a printer flattens the blur into a solid grey
// rectangle around the code, which reads as the words above and below
// running into it. A hairline keeps the card's edge instead.
function Code({ markup, size = "23em" }: { markup: string; size?: string }) {
    return (
        <div
            className="rounded-[1.4em] bg-white p-[1em] shadow-[0_0.4em_1.6em_rgba(23,35,59,0.12)] print:border print:border-[#17233B]/10 print:shadow-none [&>svg]:h-full [&>svg]:w-full"
            style={{ width: size, height: size }}
            dangerouslySetInnerHTML={{ __html: markup }}
        />
    );
}

function ScanLines({ caption, dark }: { caption: string; dark: boolean }) {
    return (
        <>
            <p className="font-semibold" style={{ fontSize: "1.5em" }}>
                Point your phone camera here
            </p>
            <p
                className={`mt-[0.3em] ${dark ? "opacity-75" : "text-[#17233B]/70"}`}
                style={{ fontSize: "1.05em" }}
            >
                {caption}
            </p>
        </>
    );
}

function Footer({ link, dark }: { link: string; dark: boolean }) {
    return (
        <footer
            className={`flex items-center justify-between px-[2.5em] py-[1.2em] ${dark ? "bg-white" : "border-t border-[#17233B]/10"}`}
        >
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
    );
}

export function QrPoster(props: PosterProps) {
    const {
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
        headerColour,
        accentColour,
        layout,
        eyebrow,
        headline,
        detail,
        eyebrowFallback,
        caption,
        className = "",
    } = props;

    // A code that opens the business page lands on a list of offers, so
    // "claim it" has nothing to point at yet.
    const theme = posterTheme({ colour, header: headerColour, accent: accentColour });
    const chosen = posterLayout(layout);
    const dark = chosen === "bold";
    const pill =
        eyebrow?.trim() || eyebrowFallback?.trim() || (offer ? "Exclusive offer" : "Scan for offers");
    const title = headline?.trim() || (offer ? offer.discount : `See what's on at ${businessName}`);
    const body = offer ? detail?.trim() || offer.description : null;
    const scanLine =
        caption?.trim() ||
        (offer
            ? "Claim it free on Promotello, then show your code when you pay."
            : "Every offer is free to claim on Promotello. Show your code when you pay.");

    // A written headline is usually a sentence, so it needs smaller type.
    const titleSize = headline?.trim() ? "3.4em" : offer ? "5.4em" : "3.8em";

    const sheet = `relative flex flex-col overflow-hidden ${dark ? "" : "bg-[#FFF8F0] text-[#17233B]"} ${className}`;
    const style = {
        width,
        height,
        fontSize: `${fontSize}px`,
        ...(dark ? { backgroundColor: theme.header, color: theme.ink } : {}),
    };

    if (chosen === "code_first") {
        return (
            <article className={sheet} style={style}>
                {/* The code is the whole top of the sheet: somebody at a
                    table has their phone out already. */}
                <div
                    className="flex items-center justify-center py-[2.2em]"
                    style={{ backgroundColor: theme.header }}
                >
                    <Code markup={qrMarkup} size="21em" />
                </div>

                <div className="flex flex-1 flex-col items-center justify-center gap-[0.5em] px-[2.5em] py-[1.5em] text-center">
                    <Pill colour={theme.accent} ink={theme.accentInk} dark={dark}>{pill}</Pill>
                    <Title size={titleSize}>{title}</Title>
                    {body && <Body dark={dark}>{body}</Body>}

                    <div className="mt-[0.6em] flex items-center gap-[1em]">
                        <Logo url={logoUrl} size="3.2em" />
                        <p className="truncate font-semibold" style={{ fontSize: "1.6em" }}>
                            {businessName}
                        </p>
                    </div>

                    <div className="mt-[0.4em]">
                        <ScanLines caption={scanLine} dark={dark} />
                    </div>
                </div>

                <Footer link={link} dark={dark} />
            </article>
        );
    }

    if (chosen === "bold") {
        return (
            <article className={sheet} style={style}>
                {/* Read from the pavement: no bands, no cream, the
                    offer as big as the sheet allows. */}
                <div className="flex flex-1 flex-col items-center justify-center gap-[0.6em] px-[2.5em] py-[2em] text-center">
                    <Pill colour={theme.accent} ink={theme.accentInk} dark={dark}>{pill}</Pill>
                    <Title size={titleSize}>{title}</Title>
                    {body && <Body dark={dark}>{body}</Body>}

                    <div className="mt-[0.8em]">
                        <Code markup={qrMarkup} size="21em" />
                    </div>

                    <div className="mt-[0.6em]">
                        <ScanLines caption={scanLine} dark={dark} />
                    </div>

                    <div className="mt-[1em] flex items-center gap-[0.8em]">
                        <Logo url={logoUrl} size="3em" />
                        <p className="truncate font-semibold" style={{ fontSize: "1.5em" }}>
                            {businessName}
                            {place && <span className="opacity-70"> · {place}</span>}
                        </p>
                    </div>
                </div>

                <Footer link={link} dark={dark} />
            </article>
        );
    }

    if (chosen === "minimal") {
        return (
            <article className={sheet} style={style}>
                {/* Nothing shouting: a name, a code, and one line. */}
                <header className="flex items-center gap-[1em] px-[2.5em] pt-[2.4em]">
                    <Logo url={logoUrl} size="3.4em" />
                    <Name businessName={businessName} place={place} onColour={false} />
                </header>

                <div className="flex flex-1 flex-col items-center justify-center gap-[0.8em] px-[2.5em] text-center">
                    <Code markup={qrMarkup} size="24em" />

                    <h1
                        className="mt-[0.6em] text-balance font-semibold tracking-tight"
                        style={{ fontSize: headline?.trim() ? "2.8em" : "3.4em", lineHeight: 1.1 }}
                    >
                        {title}
                    </h1>

                    <p className="text-[#17233B]/70" style={{ fontSize: "1.2em" }}>
                        Point your phone camera here
                    </p>
                </div>

                <Footer link={link} dark={dark} />
            </article>
        );
    }

    return (
        <article className={sheet} style={style}>
            <header
                className="flex items-center gap-[1em] px-[2.5em] py-[1.8em]"
                style={{ backgroundColor: theme.header, color: theme.ink }}
            >
                <Logo url={logoUrl} />
                <Name businessName={businessName} place={place} onColour />
            </header>

            <div className="flex flex-1 flex-col items-center justify-center px-[2.5em] py-[1.5em] text-center">
                <Pill colour={theme.accent} ink={theme.accentInk} dark={dark}>{pill}</Pill>

                <div className="mt-[0.5em]">
                    <Title size={titleSize}>{title}</Title>
                </div>

                {body && (
                    <div className="mt-[0.5em]">
                        <Body dark={dark}>{body}</Body>
                    </div>
                )}

                <div className="mt-[1.6em]">
                    <Code markup={qrMarkup} />
                </div>

                <div className="mt-[1em]">
                    <ScanLines caption={scanLine} dark={dark} />
                </div>
            </div>

            <Footer link={link} dark={dark} />
        </article>
    );
}
