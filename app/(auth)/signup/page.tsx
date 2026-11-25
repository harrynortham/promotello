import { Suspense } from "react";

import { sendSignedInAway } from "@/lib/already-signed-in";
import { createClient } from "@/utils/supabase/server";
import { SignupForm } from "./signup-form";

type PageProps = {
    searchParams: Promise<{ next?: string | string[]; card?: string | string[] }>;
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Somebody arriving from a guest loyalty card, to make the account it
// will move into. The match is on the email, so the field is filled
// with the address the card was issued to rather than left to memory —
// get it wrong and the card never appears in the account, and nothing
// anywhere says so.
//
// The token comes in, not the address: it is already in the URL of the
// page they pressed the button on, so nothing new is written into
// browser history or sent in a referrer.
async function emailForCard(card: string | string[] | undefined) {
    const token = Array.isArray(card) ? card[0] : card;
    if (!token || !uuid.test(token)) return undefined;

    const supabase = await createClient();
    const { data } = await supabase.rpc("guest_card_email", { card_token: token });

    return typeof data === "string" && data ? data : undefined;
}

// Somebody with an account doesn't need one: on to their dashboard, or
// to whatever they were part-way through.
async function SignupOrDashboard({ searchParams }: PageProps) {
    await sendSignedInAway(searchParams, "/dashboard");

    const { card } = await searchParams;

    return <SignupForm defaultEmail={await emailForCard(card)} />;
}

export default function SignupPage({ searchParams }: PageProps) {
    return (
        <Suspense>
            <SignupOrDashboard searchParams={searchParams} />
        </Suspense>
    );
}
