"use client";

import { useState } from "react";

import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
            <Alert className="mt-8 border-amber-200 bg-amber-50 text-amber-800">
                <AlertTitle>This offer has been fully claimed</AlertTitle>

                <AlertDescription>
                    Please browse our other available deals.
                </AlertDescription>
            </Alert>
        );
    }

    if (code) {
        return (
            <Card className="mt-8 border-[#17233B] bg-[#17233B] text-white">
                <CardContent className="p-6 text-center">
                    <Badge
                        variant="outline"
                        className="border-white/20 bg-white/10 text-white/80"
                    >
                        Redemption successful
                    </Badge>

                    <p className="mt-5 text-sm text-white/70">
                        Your redemption code
                    </p>

                    <p className="mt-2 text-3xl font-bold tracking-[0.2em]">
                        {code}
                    </p>

                    <p className="mt-3 text-sm text-white/70">
                        Show this code to the business.
                    </p>

                    {emailWarning && (
                        <Alert className="mt-5 border-amber-300/30 bg-amber-400/10 text-amber-200">
                            <AlertTitle>Confirmation email unavailable</AlertTitle>

                            <AlertDescription className="text-amber-200">
                                {emailWarning}
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>
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
                <Alert variant="destructive" className="mt-4">
                    <AlertTitle>Unable to redeem offer</AlertTitle>

                    <AlertDescription>{message}</AlertDescription>
                </Alert>
            )}
        </div>
    );
}