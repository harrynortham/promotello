"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { registerCityInterest, type CityInterestState } from "./city-interest-actions";

const initial: CityInterestState = { status: "idle" };

export function CityInterestForm({ town }: { town: string }) {
    const [state, formAction, pending] = useActionState(registerCityInterest, initial);

    if (state.status === "saved") {
        return (
            <p role="status" className="text-sm font-medium">
                Thanks! We&apos;ll email you when Promotello comes to {town}.
            </p>
        );
    }

    return (
        <form action={formAction} className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <input type="hidden" name="town" value={town} />
            <Input
                type="email"
                name="email"
                required
                aria-label="Email address"
                placeholder="you@example.com"
                className="h-10 bg-white sm:w-64"
            />
            <Button type="submit" disabled={pending} className="h-10 bg-[#FF593F] text-white hover:bg-[#FF593F]/90">
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
