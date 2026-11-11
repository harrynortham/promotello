import { Suspense } from "react";

import { sendSignedInAway } from "@/lib/already-signed-in";
import { SignupForm } from "./signup-form";

type PageProps = { searchParams: Promise<{ next?: string | string[] }> };

// Somebody with an account doesn't need one: on to their dashboard, or
// to whatever they were part-way through.
async function SignupOrDashboard({ searchParams }: PageProps) {
    await sendSignedInAway(searchParams, "/dashboard");

    return <SignupForm />;
}

export default function SignupPage({ searchParams }: PageProps) {
    return (
        <Suspense>
            <SignupOrDashboard searchParams={searchParams} />
        </Suspense>
    );
}
