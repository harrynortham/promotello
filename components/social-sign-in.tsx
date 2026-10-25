"use client";

import { useState } from "react";
import { FaApple } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";

import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";

// "Continue with Google / Apple" for sign-in and sign-up. Supabase sends
// people to the provider and back to /auth/callback, which signs them in
// and continues to `next`. A new email creates an account; an existing
// one signs in to it.

type Provider = "google" | "apple";

// Only providers set up in Supabase are shown. Set in Vercel and
// .env.local, e.g. NEXT_PUBLIC_AUTH_PROVIDERS=google,apple
export const authProviders = (process.env.NEXT_PUBLIC_AUTH_PROVIDERS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is Provider => value === "google" || value === "apple");

const details: Record<Provider, { label: string; icon: React.ReactNode; className: string }> = {
    google: {
        label: "Continue with Google",
        icon: <FcGoogle aria-hidden="true" className="size-5" />,
        className: "border-[#dadce0] bg-white text-[#1f1f1f] hover:bg-[#f8f9fa]",
    },
    apple: {
        label: "Continue with Apple",
        icon: <FaApple aria-hidden="true" className="size-5" />,
        className: "border-black bg-black text-white hover:bg-black/85 hover:text-white",
    },
};

export function SocialSignIn({
    next,
    dividerLabel = "or use your email",
}: {
    // Where to go after signing in; a function is called on click (for
    // pages that read ?next= from the address bar then).
    next: string | (() => string);
    dividerLabel?: string;
}) {
    const [pending, setPending] = useState<Provider | null>(null);
    const [errorMessage, setErrorMessage] = useState("");

    if (authProviders.length === 0) return null;

    async function signIn(provider: Provider) {
        setPending(provider);
        setErrorMessage("");

        const destination = typeof next === "function" ? next() : next;

        const { error } = await createClient().auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`,
            },
        });

        // On success the browser is already on its way to the provider.
        if (error) {
            setPending(null);
            setErrorMessage("We couldn't connect to that service. Try again, or use your email.");
        }
    }

    return (
        <div className="mt-8 space-y-3">
            {authProviders.map((provider) => (
                <Button
                    key={provider}
                    type="button"
                    variant="outline"
                    size="lg"
                    disabled={pending !== null}
                    onClick={() => signIn(provider)}
                    className={`h-12 w-full gap-3 text-base font-medium ${details[provider].className}`}
                >
                    {details[provider].icon}
                    {pending === provider ? "Connecting…" : details[provider].label}
                </Button>
            ))}

            {errorMessage && (
                <p role="alert" className="text-sm text-destructive">
                    {errorMessage}
                </p>
            )}

            <div className="flex items-center gap-3 pt-3 text-xs text-muted-foreground" aria-hidden="true">
                <span className="h-px flex-1 bg-border" />
                {dividerLabel}
                <span className="h-px flex-1 bg-border" />
            </div>
        </div>
    );
}
