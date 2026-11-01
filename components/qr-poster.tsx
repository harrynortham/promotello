import Image from "next/image";

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
    className = "",
}: {
    width: string;
    height: string;
    // The root size everything scales from: 16px at A4.
    fontSize: number;
    businessName: string;
    place?: string | null;
    logoUrl?: string | null;
    // The headline offer, when the business has one.
    offer?: { discount: string; title: string } | null;
    qrMarkup: string;
    link: string;
    className?: string;
}) {
    return (
        <article
            className={`relative flex flex-col overflow-hidden bg-[#FFF8F0] text-[#17233B] ${className}`}
            style={{ width, height, fontSize: `${fontSize}px` }}
        >
            <header className="flex items-center gap-[1em] bg-[#17233B] px-[2.5em] py-[1.8em] text-white">
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
                <p className="rounded-full bg-[#FF593F] px-[1em] py-[0.35em] font-semibold uppercase tracking-[0.12em] text-white" style={{ fontSize: "0.95em" }}>
                    {offer ? "Exclusive offer" : "Scan for offers"}
                </p>

                <h1 className="mt-[0.5em] font-semibold tracking-tight" style={{ fontSize: offer ? "5.4em" : "3.8em", lineHeight: 1 }}>
                    {offer ? offer.discount : `See what's on at ${businessName}`}
                </h1>

                {offer && (
                    <p className="mt-[0.5em] max-w-[24em] text-[#17233B]/75" style={{ fontSize: "1.45em", lineHeight: 1.3 }}>
                        {offer.title}
                    </p>
                )}

                <div
                    className="mt-[1.6em] rounded-[1.4em] bg-white p-[1em] shadow-[0_0.4em_1.6em_rgba(23,35,59,0.12)] [&>svg]:h-full [&>svg]:w-full"
                    style={{ width: "23em", height: "23em" }}
                    dangerouslySetInnerHTML={{ __html: qrMarkup }}
                />

                <p className="mt-[1em] font-semibold" style={{ fontSize: "1.5em" }}>
                    Point your phone camera here
                </p>
                <p className="mt-[0.3em] text-[#17233B]/70" style={{ fontSize: "1.05em" }}>
                    Claim it free on Promotello, then show your code when you pay.
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
