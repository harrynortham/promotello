import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { getCityOptions } from "@/lib/locations";
import { createClient } from "@/utils/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = {
    title: "Add your business",
    robots: { index: false, follow: false },
};

async function OnboardingContent() {
    await connection();

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // New businesses start by creating an account; the register page also
    // links to sign in for people who already have one.
    if (!user) {
        redirect("/business/register");
    }

    const fullName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";

    // Platform admins can set businesses up in cities that aren't live yet.
    const { data: isAdmin } = await supabase.rpc("is_platform_admin");
    const cities = await getCityOptions({ includeNotLive: isAdmin === true });

    return <OnboardingForm firstName={fullName.split(" ")[0] || null} cities={cities} />;
}

export default function OnboardingPage() {
    return (
        <main className="min-h-dvh bg-[#FFF8F0] px-6 py-8 text-[#17233B] sm:py-12">
            <div className="mx-auto max-w-2xl">
                <Link href="/business" aria-label="Promotello for business" className="inline-flex">
                    <Image src="/brand/promotello-horizontal-primary.svg" alt="Promotello" width={160} height={42} priority />
                </Link>

                <div className="mt-10">
                    <Suspense fallback={<Skeleton className="h-[32rem] rounded-3xl" />}>
                        <OnboardingContent />
                    </Suspense>
                </div>
            </div>
        </main>
    );
}
