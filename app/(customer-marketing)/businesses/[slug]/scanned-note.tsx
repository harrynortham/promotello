import Link from "next/link";
import { FiArrowDown, FiClock } from "react-icons/fi";

// Someone scanned a poster for something that has gone: an offer that
// ended, a card closed to new joiners, a code the business retired. They
// are standing in the shop holding their phone, so the page says what
// happened in one line and points at what is on instead. Never an error:
// nothing has gone wrong from where they're standing.

const reasons = {
    offer: {
        heading: "That offer has ended.",
        body: (name: string) => `The poster you scanned was for an offer that's finished. Here's what ${name} has on now.`,
    },
    card: {
        heading: "That card has closed.",
        body: (name: string) => `${name} isn't adding new members to the card on that poster. Everything else they have on is below.`,
    },
    poster: {
        heading: "That poster is out of date.",
        body: (name: string) => `It still brings you to the right place. Here's what ${name} has on now.`,
    },
} as const;

export function ScannedNote({ reason, businessName }: { reason: string; businessName: string }) {
    const copy = reasons[reason as keyof typeof reasons];

    if (!copy) {
        return null;
    }

    return (
        <section
            aria-labelledby="scanned-note-heading"
            className="mb-5 flex flex-col gap-4 rounded-2xl border border-[#FF593F]/30 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
        >
            <div className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#FF593F]/10 text-[#FF593F]">
                    <FiClock aria-hidden="true" className="size-5" />
                </span>

                <div>
                    <h2 id="scanned-note-heading" className="font-semibold">
                        {copy.heading}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-[#17233B]/70">{copy.body(businessName)}</p>
                </div>
            </div>

            <Link
                href="#offers"
                className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-[#FF593F] px-4 py-2 text-sm font-semibold text-white sm:self-auto"
            >
                See what&rsquo;s on
                <FiArrowDown aria-hidden="true" />
            </Link>
        </section>
    );
}
