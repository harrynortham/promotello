"use client";

import Link from "next/link";
import { useState } from "react";
import { FiArrowRight } from "react-icons/fi";

import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { joinLoyaltyAsGuest } from "./actions";

const action =
    "h-11 w-full bg-[#FF593F] px-6 text-base font-medium text-white transition hover:bg-[#FF593F]/90 " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

// Joining needs a name and an email, but a business's page is the wrong
// place to open with a form: someone reading about a barber hasn't decided
// they want a card yet, and two white input boxes shout louder on this panel
// than the thing being offered.
//
// So the card makes its offer, and the fields only appear once the person
// has said yes. The button keeps its label across both steps, because the
// thing they asked for hasn't changed — the second press is the one that
// does it.
export function LoyaltyJoin({
    programId,
    businessId,
    loginHref,
    // The server sent them back with something to correct, so the fields
    // need to be open and showing it rather than hidden behind the button.
    startOpen = false,
}: {
    programId: string;
    businessId: string;
    loginHref: string;
    startOpen?: boolean;
}) {
    const [open, setOpen] = useState(startOpen);

    if (!open) {
        return (
            <div className="w-full shrink-0 sm:w-auto">
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className={`${action} inline-flex items-center justify-center gap-2 rounded-md sm:w-auto`}
                >
                    Get my card
                    <FiArrowRight aria-hidden="true" />
                </button>

                <p className="mt-3 text-center text-xs text-white/60 sm:text-right">
                    Free, and no app to download.
                </p>
            </div>
        );
    }

    return (
        <form action={joinLoyaltyAsGuest} className="w-full shrink-0 rounded-2xl bg-white/10 p-4 sm:w-80">
            <input type="hidden" name="programId" value={programId} />
            <input type="hidden" name="businessId" value={businessId} />

            <div className="space-y-2">
                <Label htmlFor="loyalty-name" className="text-xs text-white/70">
                    Your name
                </Label>
                <Input
                    id="loyalty-name"
                    name="name"
                    required
                    maxLength={80}
                    autoComplete="given-name"
                    autoFocus={!startOpen}
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

            <SubmitButton pendingLabel="Joining…" className={`${action} mt-3 rounded-md`}>
                Get my card
            </SubmitButton>

            <p className="mt-3 text-xs text-white/60">
                No app and no password. Already have an account?{" "}
                <Link href={loginHref} className="font-medium text-white underline">
                    Log in
                </Link>
                .
            </p>
        </form>
    );
}
