"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";

type RedeemButtonProps = {
    offerId: string;
    isFullyClaimed?: boolean;
};

type RedemptionResult = {
    redemption_code: string;
};

export default function RedeemButton({
    offerId,
    isFullyClaimed = false,
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

        const redemption = data as RedemptionResult;

        setCode(redemption.redemption_code);
        setIsRedeeming(false);
    }

    if (isFullyClaimed) {
        return (
            <div className="mt-8 rounded-2xl bg-[#17233B]/5 p-5 text-center">
                <p className="font-semibold text-[#17233B]">
                    This offer has been fully claimed.
                </p>

                <p className="mt-2 text-sm text-[#17233B]/60">
                    Please browse our other available deals.
                </p>
            </div>
        );
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
            <Button
                type="button"
                size="lg"
                variant="default"
                onClick={redeemOffer}
                disabled={isRedeeming}
                className="w-full"
            >
                {isRedeeming ? "Redeeming…" : "Get this deal"}
            </Button>

            {errorMessage && (
                <p className="mt-3 text-center text-sm text-red-600">
                    {errorMessage}
                </p>
            )}
        </div>
    );
}