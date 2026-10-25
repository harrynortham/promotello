import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { FiCheckCircle } from "react-icons/fi";

import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { getCityOptions } from "@/lib/locations";
import { joinWaitlist } from "./actions";

export const metadata: Metadata = {
    title: "Join the waitlist",
    description: "Promotello is launching city by city. Tell us where your business is and we'll let you know when we arrive.",
};

type PageProps = { searchParams: Promise<{ joined?: string; error?: string }> };

async function WaitlistContent({ searchParams }: PageProps) {
    // Read the request first so the city lookup runs per request, not
    // while the page is prerendered at build time.
    const { joined, error } = await searchParams;
    const cities = await getCityOptions();
    const liveCities = cities.map((city) => city.name).join(", ") || "Bristol";

    if (joined) {
        return (
            <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
                <FiCheckCircle aria-hidden="true" />
                <AlertTitle>You&apos;re on the list</AlertTitle>
                <AlertDescription>
                    We&apos;ll email you as soon as Promotello opens near you. In the meantime, take a look at{" "}
                    <Link href="/business/demo" className="font-medium underline">the demo</Link>.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <>
            <p className="text-lg leading-8 text-[#17233B]/70">
                Promotello is launching city by city, starting with {liveCities}, so each place has enough
                businesses and customers to be worth it. Tell us where you are and we&apos;ll email you when we
                arrive. The towns with the most interest are first in line.
            </p>

            {error && (
                <Alert variant="destructive" className="mt-6">
                    <AlertTitle>That didn&apos;t work</AlertTitle>
                    <AlertDescription>Check your name, email and town, and try again.</AlertDescription>
                </Alert>
            )}

            <form action={joinWaitlist} className="mt-8 space-y-5 rounded-3xl border border-[#17233B]/10 bg-white p-6 sm:p-8">
                <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="name">Your name</Label>
                        <Input id="name" name="name" required maxLength={120} autoComplete="name" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" name="email" type="email" required maxLength={320} autoComplete="email" />
                    </div>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="businessName">Business name (optional)</Label>
                        <Input id="businessName" name="businessName" maxLength={160} autoComplete="organization" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="town">Town or city</Label>
                        <Input id="town" name="town" required minLength={2} maxLength={100} placeholder="e.g. Bath" autoComplete="address-level2" />
                    </div>
                </div>
                <SubmitButton pendingLabel="Joining…">Join the waitlist</SubmitButton>
                <p className="text-xs text-[#17233B]/70">
                    We&apos;ll only use your email to tell you when Promotello opens near you. See our{" "}
                    <Link href="/legal/privacy" className="underline">privacy policy</Link>.
                </p>
            </form>
        </>
    );
}

export default function WaitlistPage(props: PageProps) {
    return (
        <main className="bg-[#FFF8F0] px-6 py-16 text-[#17233B] sm:py-24">
            <div className="mx-auto max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#C8371D]">Coming to your town</p>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">Join the waitlist</h1>
                <div className="mt-6">
                    <Suspense fallback={<Skeleton className="h-96 rounded-3xl" />}>
                        <WaitlistContent {...props} />
                    </Suspense>
                </div>
            </div>
        </main>
    );
}
