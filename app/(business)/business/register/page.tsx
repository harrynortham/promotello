import { Suspense } from "react";

import { sendSignedInAway } from "@/lib/already-signed-in";
import { BusinessRegisterForm, RegisterLoading } from "./register-form";

type PageProps = { searchParams: Promise<{ next?: string | string[] }> };

// Signed in already? Then this form has nothing to offer: on to the
// business dashboard, or to whatever sent them here.
async function RegisterOrDashboard({ searchParams }: PageProps) {
    await sendSignedInAway(searchParams, "/business/dashboard");

    return <BusinessRegisterForm />;
}

export default function BusinessRegisterPage({ searchParams }: PageProps) {
    return (
        <Suspense fallback={<RegisterLoading />}>
            <RegisterOrDashboard searchParams={searchParams} />
        </Suspense>
    );
}
