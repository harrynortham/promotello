import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";

import { LoyaltyStamps } from "@/components/loyalty-stamps";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { joinLoyaltyProgram } from "./actions";

type LoyaltyCalloutProps = {
    businessId: string;
    businessName: string;
    // This business's own page, which is where somebody comes back to
    // — or rather, where they were when they asked for the card.
    returnPath: string;
    program: {
        id: string;
        // A business can run more than one card, so each says which it is.
        name?: string;
        stamps_required: number;
        reward: string;
        card_colour?: string | null;
        card_header?: string | null;
        card_accent?: string | null;
        stamp_icon?: string | null;
        terms: string | null;
    };
    card: { stamps: number } | null;
    isSignedIn: boolean;
    // Why the last attempt to join didn't work, from ?loyalty=.
    problem?: string;
    // The business's team previewing its page before approval: nothing to join yet.
    preview?: boolean;
};

// Loyalty card offer on a business profile: join, or see your progress.
export function LoyaltyCallout({
    businessId,
    businessName,
    returnPath,
    program,
    card,
    isSignedIn,
    problem,
    preview,
}: LoyaltyCalloutProps) {
    const problems: Record<string, string> = {
        unavailable: "This loyalty card isn't available right now.",
        // Left from the guest form, which a card emailed to somebody can
        // still send them back here with.
        details: "We need your name and an email address to make your card.",
        signin: "You already have an account with that email. Log in and your card is there.",
    };
    const reward = program.reward.charAt(0).toLowerCase() + program.reward.slice(1);

    return (
        <section
            id={`loyalty-${program.id}`}
            aria-labelledby={`loyalty-heading-${program.id}`}
            className="scroll-mt-28 overflow-hidden rounded-2xl bg-[#17233B] text-white"
        >
            <div className="flex flex-col gap-6 p-6 sm:p-8 md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#FF8A73]">
                        {program.name?.trim() || "Loyalty card"}
                    </p>
                    <h2
                        id={`loyalty-heading-${program.id}`}
                        className="mt-2 text-2xl font-semibold tracking-tight"
                    >
                        Collect {program.stamps_required} stamps, get {reward}
                    </h2>
                    <p className="mt-2 max-w-md text-sm text-white/70">
                        {card
                            ? `You have ${card.stamps} of ${program.stamps_required} stamps. Show your card at ${businessName} to collect more.`
                            : `Join free and get a stamp every time you visit ${businessName}.`}
                    </p>
                    {program.terms && <p className="mt-2 max-w-md text-xs text-white/55">{program.terms}</p>}

                    <div className="mt-5 [&_span]:border-white/25">
                        <LoyaltyStamps
                            stamps={card?.stamps ?? 0}
                            required={program.stamps_required}
                            size="sm"
                            colour={program.card_colour}
                            header={program.card_header}
                            accent={program.card_accent}
                            icon={program.stamp_icon}
                        />
                    </div>

                    {problem && problems[problem] && (
                        <p role="alert" className="mt-4 text-sm text-[#FFB0A3]">
                            {problems[problem]}
                        </p>
                    )}
                </div>

                {preview ? (
                    <p className="shrink-0 text-sm text-white/70">
                        Customers can join once you&apos;re live.
                    </p>
                ) : card ? (
                    <Button
                        render={<Link href={`/loyalty/${program.id}`} />}
                        nativeButton={false}
                        size="lg"
                        className="shrink-0 bg-white text-[#17233B] hover:bg-white/90"
                    >
                        Show my card
                        <FiArrowRight aria-hidden="true" />
                    </Button>
                ) : isSignedIn ? (
                    <form action={joinLoyaltyProgram} className="shrink-0">
                        <input type="hidden" name="programId" value={program.id} />
                        <input type="hidden" name="businessId" value={businessId} />
                        <SubmitButton pendingLabel="Joining…" className="h-11 bg-[#FF593F] px-6 text-base text-white hover:bg-[#FF593F]/90">
                            Join the loyalty card
                        </SubmitButton>
                    </form>
                ) : (
                    /* The same two doors as claiming an offer, and the
                       same promise: ?join=1 says what they pressed, so
                       the card is theirs by the time they land on it
                       rather than a button to press a second time. */
                    <div className="w-full shrink-0 space-y-3 sm:w-auto">
                        <Button
                            render={<Link href={`/login?next=${encodeURIComponent(`${returnPath}?join=1`)}`} />}
                            nativeButton={false}
                            size="lg"
                            className="w-full bg-white text-[#17233B] hover:bg-white/90 sm:w-auto"
                        >
                            Log in to get your card
                            <FiArrowRight aria-hidden="true" />
                        </Button>

                        <p className="text-center text-xs text-white/70 sm:text-right">
                            New to Promotello?{" "}
                            <Link
                                href={`/signup?next=${encodeURIComponent(`${returnPath}?join=1`)}`}
                                className="font-medium text-white underline underline-offset-4"
                            >
                                Create a free account
                            </Link>
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
}
