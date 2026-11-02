import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";

import { LoyaltyStamps } from "@/components/loyalty-stamps";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { joinLoyaltyAsGuest, joinLoyaltyProgram } from "./actions";

type LoyaltyCalloutProps = {
    businessId: string;
    businessName: string;
    program: {
        id: string;
        stamps_required: number;
        reward: string;
        card_colour?: string | null;
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
    program,
    card,
    isSignedIn,
    problem,
    preview,
}: LoyaltyCalloutProps) {
    const problems: Record<string, string> = {
        unavailable: "This loyalty card isn't available right now.",
        details: "We need your name and an email address to make your card.",
        signin: "You already have an account with that email. Log in and your card is there.",
    };
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
                        <LoyaltyStamps
                            stamps={card?.stamps ?? 0}
                            required={program.stamps_required}
                            size="sm"
                            colour={program.card_colour}
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
                        <SubmitButton pendingLabel="Joining…" className="h-11 bg-[#FF593F] px-6 text-base text-white hover:bg-[#FF593F]/90">
                            Join the loyalty card
                        </SubmitButton>
                    </form>
                ) : (
                    <form
                        action={joinLoyaltyAsGuest}
                        className="w-full shrink-0 rounded-2xl bg-white/10 p-4 sm:w-80"
                    >
                        <input type="hidden" name="programId" value={program.id} />
                        <input type="hidden" name="businessId" value={businessId} />

                        <p className="text-sm font-medium text-white">Join in a few seconds</p>

                        <div className="mt-3 space-y-2">
                            <Label htmlFor="loyalty-name" className="text-xs text-white/70">
                                Your name
                            </Label>
                            <Input
                                id="loyalty-name"
                                name="name"
                                required
                                maxLength={80}
                                autoComplete="given-name"
                                placeholder="Ellie"
                                className="bg-white text-[#17233B]"
                            />

                            <Label htmlFor="loyalty-email" className="text-xs text-white/70">
                                Email
                            </Label>
                            <Input
                                id="loyalty-email"
                                name="email"
                                type="email"
                                required
                                autoComplete="email"
                                placeholder="you@example.com"
                                className="bg-white text-[#17233B]"
                            />
                        </div>

                        <SubmitButton
                            pendingLabel="Joining…"
                            className="mt-3 h-11 w-full bg-[#FF593F] px-6 text-base text-white hover:bg-[#FF593F]/90"
                        >
                            Get my card
                        </SubmitButton>

                        <p className="mt-3 text-xs text-white/60">
                            No app and no password. Already have an account?{" "}
                            <Link
                                href={`/login?next=${encodeURIComponent(`/businesses/${businessId}`)}`}
                                className="font-medium text-white underline"
                            >
                                Log in
                            </Link>
                            .
                        </p>
                    </form>
                )}
            </div>
        </section>
    );
}
