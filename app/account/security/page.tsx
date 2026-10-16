import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/utils/supabase/server";
import SecurityForm from "./security-form";

async function SecurityContent() {
    await connection();

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    return (
        <SecurityForm
            email={user.email ?? ""}
            pendingEmail={user.new_email ?? ""}
        />
    );
}

function SecurityLoading() {
    return (
        <section
            role="status"
            aria-label="Loading security settings"
            className="space-y-6"
        >
            <Skeleton className="h-10 w-56" />
            <Skeleton className="h-5 w-80 max-w-full" />
            <Skeleton className="h-96 rounded-2xl" />
            <Skeleton className="h-72 rounded-2xl" />
        </section>
    );
}

export default function SecurityPage() {
    return (
        <Suspense fallback={<SecurityLoading />}>
            <SecurityContent />
        </Suspense>
    );
}