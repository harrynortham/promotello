"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";

type InviteAcceptanceProps = {
    token: string;
    businessId: string;
    label: string;
};

export default function InviteAcceptance({ token, businessId, label }: InviteAcceptanceProps) {
    const router = useRouter();
    const [isAccepting, setIsAccepting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    async function acceptInvitation() {
        setIsAccepting(true);
        setErrorMessage("");

        const { error } = await createClient().rpc("accept_business_invitation", {
            requested_token: token,
        });

        if (error) {
            setErrorMessage(error.message);
            setIsAccepting(false);
            return;
        }

        router.push(`/business/${businessId}?welcome=1`);
        router.refresh();
    }

    return (
        <>
            {errorMessage && (
                <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                    {errorMessage}
                </p>
            )}

            <Button type="button" onClick={acceptInvitation} disabled={isAccepting} className="mt-8 w-full">
                {isAccepting ? "Accepting…" : label}
            </Button>
        </>
    );
}
