"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { registerCityInterest, type CityInterestState } from "./city-interest-actions";

const initial: CityInterestState = { status: "idle" };

// `town` is only a guess, from the IP address the request arrived on. On a
// mobile network that address belongs to the carrier's gateway, which can be
// the other end of the country, so the town is an editable field rather than
// a hidden one: the visitor can correct it, and the waitlist then records
// where they actually are instead of where their carrier is.
export function CityInterestForm({ town }: { town: string }) {
    const [state, formAction, pending] = useActionState(registerCityInterest, initial);
    const [where, setWhere] = useState(town);

    if (state.status === "saved") {
        return (
            <p role="status" className="text-sm font-medium">
                Thanks! We&apos;ll email you when Promotello comes to {where}.
            </p>
        );
    }

    return (
        <form action={formAction} className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Input
                type="text"
                name="town"
                required
                maxLength={100}
                aria-label="Your town"
                value={where}
                onChange={(event) => setWhere(event.target.value)}
                className="bg-white sm:w-40"
            />
            <Input
                type="email"
                name="email"
                required
                aria-label="Email address"
                placeholder="you@example.com"
                className="bg-white sm:w-64"
            />
            <Button type="submit" disabled={pending} className="bg-[#FF593F] text-white hover:bg-[#FF593F]/90">
                {pending ? "Saving…" : "Tell me when"}
            </Button>
            {state.status !== "idle" && (
                <p role="alert" className="text-sm text-[#B42318] sm:self-center">
                    {state.status === "invalid" ? "Enter a valid email address." : "Something went wrong. Try again."}
                </p>
            )}
        </form>
    );
}
