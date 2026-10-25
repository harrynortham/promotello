import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";

import { LoyaltyStamps } from "@/components/loyalty-stamps";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { joinLoyaltyProgram } from "./actions";

type LoyaltyCalloutProps = {
    businessId: string;
    businessName: string;
    program: {
        id: string;
        stamps_required: number;
        reward: string;
        terms: string | null;
    };
    card: { stamps: number } | null;
    isSignedIn: boolean;
    unavailable?: boolean;
};

// Loyalty card offer on a business profile: join, or see your progress.
export function LoyaltyCallout({
    businessId,
    businessName,
    program,
    card,
    isSignedIn,
    unavailable,
}: LoyaltyCalloutProps) {
    const reward = program.reward.charAt(0).toLowerCase() + program.reward.slice(1);

    return (
        <section
            id="loyalty"
            aria-labelledby="loyalty-heading"
            className="scroll-mt-28 overflow-hidden rounded-2xl bg-[#17233B] text-white"
        >
            <div className="flex flex-col gap-6 p-6 sm:p-8 md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#FF8A73]">
                        Loyalty card
                    </p>
                    <h2 id="loyalty-heading" className="mt-2 text-2xl font-semibold tracking-tight">
                        Collect {program.stamps_required} stamps, get {reward}
                    </h2>
                    <p className="mt-2 max-w-md text-sm text-white/70">
                        {card
                            ? `You have ${card.stamps} of ${program.stamps_required} stamps. Show your card at ${businessName} to collect more.`
                            : `Join free and get a stamp every time you visit ${businessName}.`}
                    </p>
                    {program.terms && <p className="mt-2 max-w-md text-xs text-white/55">{program.terms}</p>}

                    <div className="mt-5 [&_span]:border-white/25">
                        <LoyaltyStamps stamps={card?.stamps ?? 0} required={program.stamps_required} size="sm" />
                    </div>

                    {unavailable && (
                        <p role="alert" className="mt-4 text-sm text-[#FFB0A3]">
                            This loyalty card isn&apos;t available right now.
                        </p>
                    )}
                </div>

                {card ? (
                    <Button
                        render={<Link href="/dashboard/loyalty" />}
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
                        <SubmitButton pendingLabel="Joining…" className="h-11 bg-[#C8371D] px-6 text-base text-white hover:bg-[#C8371D]/90">
                            Join the loyalty card
                        </SubmitButton>
                    </form>
                ) : (
                    <Button
                        render={<Link href={`/login?next=${encodeURIComponent(`/businesses/${businessId}`)}`} />}
                        nativeButton={false}
                        size="lg"
                        className="shrink-0 bg-[#C8371D] text-white hover:bg-[#C8371D]/90"
                    >
                        Log in to join
                    </Button>
                )}
            </div>
        </section>
    );
}
