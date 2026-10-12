"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

type RedeemButtonProps = {
    offerId: string;
};

export default function RedeemButton({
    offerId,
}: RedeemButtonProps) {
    const [isRedeeming, setIsRedeeming] = useState(false);
    const [code, setCode] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    async function redeemOffer() {
        setIsRedeeming(true);
        setErrorMessage("");

        const supabase = createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            setErrorMessage("Please sign in to redeem this offer.");
            setIsRedeeming(false);
            return;
        }

        const { data, error } = await supabase.rpc("redeem_offer", {
            requested_offer_id: offerId,
        });

        if (error) {
            setErrorMessage(error.message);
            setIsRedeeming(false);
            return;
        }

        setCode(data.redemption_code);
        setIsRedeeming(false);
    }

    if (code) {
        return (
            <div className="mt-8 rounded-2xl bg-[#17233B] p-5 text-center text-white">
                <p className="text-sm text-white/70">Your redemption code</p>

                <p className="mt-2 text-3xl font-bold tracking-[0.2em]">
                    {code}
                </p>

                <p className="mt-3 text-sm text-white/70">
                    Show this code to the business.
                </p>
            </div>
        );
    }

    return (
        <div className="mt-8">
            <button
                type="button"
                onClick={redeemOffer}
                disabled={isRedeeming}
                className="w-full rounded-full bg-[#FF593F] px-6 py-3 font-semibold text-[#17233B] transition hover:bg-[#E94D36] disabled:cursor-not-allowed disabled:opacity-60"
            >
                {isRedeeming ? "Redeeming…" : "Get this deal"}
            </button>

            {errorMessage && (
                <p className="mt-3 text-center text-sm text-red-600">
                    {errorMessage}
                </p>
            )}
        </div>
    );
}