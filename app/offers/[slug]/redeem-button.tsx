"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";

type RedeemButtonProps = {
    offerId: string;
    isFullyClaimed?: boolean;
};

type RedemptionResult = {
    id: string;
    redemption_code: string;
};

export default function RedeemButton({
    offerId,
    isFullyClaimed = false,
}: RedeemButtonProps) {
    const [isRedeeming, setIsRedeeming] = useState(false);
    const [code, setCode] = useState("");
    const [message, setMessage] = useState("");
    const [emailWarning, setEmailWarning] = useState("");

    async function redeemOffer() {
        setIsRedeeming(true);
        setMessage("");
        setEmailWarning("");

        const supabase = createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            setMessage("Please sign in to redeem this offer.");
            setIsRedeeming(false);
            return;
        }

        const { data, error } = await supabase.rpc("redeem_offer", {
            requested_offer_id: offerId,
        });

        if (error) {
            setMessage(error.message);
            setIsRedeeming(false);
            return;
        }

        const redemption = data as RedemptionResult;

        setCode(redemption.redemption_code);

        const { error: emailError } = await supabase.functions.invoke(
            "send-redemption-confirmation",
            {
                body: {
                    redemption_id: redemption.id,
                },
            },
        );

        if (emailError) {
            setEmailWarning(
                "Your redemption was successful, but we could not send the confirmation email.",
            );
        }

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

                {emailWarning && (
                    <p className="mt-4 text-sm text-amber-200">
                        {emailWarning}
                    </p>
                )}
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

            {message && (
                <p className="mt-3 text-center text-sm text-red-600">
                    {message}
                </p>
            )}
        </div>
    );
}