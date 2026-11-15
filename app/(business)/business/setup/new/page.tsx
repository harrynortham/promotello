import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/utils/supabase/server";
import { NewBusinessStep } from "./new-business-step";

export const metadata: Metadata = {
    title: "Add your business",
    robots: { index: false, follow: false },
};

function LoadingState() {
    return (
        <main className="min-h-dvh bg-[#FFF8F0] px-6 py-10">
            <div className="mx-auto w-full max-w-6xl space-y-6">
                <Skeleton className="h-4 w-40 rounded-full" />
                <Skeleton className="h-10 w-80 max-w-full rounded-lg" />
                <Skeleton className="h-64 w-full max-w-xl rounded-2xl" />
            </div>
        </main>
    );
}

// The first screen of the same flow a claimed page starts in. A business
// somebody signs up for doesn't exist yet, so it needs a name before it
// can have a page — and that is the only thing this asks for. Everything
// after it is the seven steps both kinds of business share.
async function NewBusinessContent() {
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

    // Somebody who signed up through /business/register gave their name
    // there, and Google brings one with it. Somebody who started as a
    // customer — claimed a voucher, collected some stamps — never has,
    // and this is the first moment we need one: everything from here is
    // addressed to a person who runs a business.
    return (
        <NewBusinessStep
            firstName={fullName.trim().split(/\s+/)[0] || null}
            needsName={fullName.trim().length === 0}
        />
    );
}

export default function NewBusinessPage() {
    return (
        <Suspense fallback={<LoadingState />}>
            <NewBusinessContent />
        </Suspense>
    );
}
