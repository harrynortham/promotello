"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/utils/supabase/client";

type Redemption = {
    id: string;
    redemption_code: string;
    used_at: string | null;
};

type RedeemButtonProps = {
    offerId: string;
    isSignedIn: boolean;
    isFullyClaimed?: boolean;
    isExpired?: boolean;
    initialRedemption: Redemption | null;
};

function parseRedemption(value: unknown): Redemption | null {
    const row = Array.isArray(value) ? value[0] : value;

    if (!row || typeof row !== "object") {
        return null;
    }

    if (
        !("id" in row) ||
        typeof row.id !== "string" ||
        !("redemption_code" in row) ||
        typeof row.redemption_code !== "string"
    ) {
        return null;
    }

    return {
        id: row.id,
        redemption_code: row.redemption_code,
        used_at:
            "used_at" in row && typeof row.used_at === "string"
                ? row.used_at
                : null,
    };
}

export default function RedeemButton({
    offerId,
    isSignedIn,
    isFullyClaimed = false,
    isExpired = false,
    initialRedemption,
}: RedeemButtonProps) {
    const router = useRouter();
    const busyRef = useRef(false);

    const [isRedeeming, setIsRedeeming] = useState(false);
    const [claimedRedemption, setClaimedRedemption] =
        useState<Redemption | null>(null);
    const [message, setMessage] = useState("");
    const [emailWarning, setEmailWarning] = useState("");

    const redemption = claimedRedemption ?? initialRedemption;

    async function redeemOffer() {
        if (busyRef.current || redemption) return;

        busyRef.current = true;
        setIsRedeeming(true);
        setMessage("");
        setEmailWarning("");

        try {
            const supabase = createClient();

            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();

            if (userError || !user) {
                throw new Error(
                    "Please sign in before claiming this offer.",
                );
            }

            // Recheck in case this offer was claimed in another tab.
            const existing = await supabase
                .from("offer_redemptions")
                .select("id, redemption_code, used_at")
                .eq("offer_id", offerId)
                .eq("user_id", user.id)
                .maybeSingle();

            if (existing.error) {
                throw new Error(
                    "We couldn’t check your vouchers. Please try again.",
                );
            }

            if (existing.data) {
                setClaimedRedemption(existing.data);
                router.refresh();
                return;
            }

            const { data, error } = await supabase.rpc(
                "redeem_offer",
                {
                    requested_offer_id: offerId,
                },
            );

            if (error) {
                // Another request may have created the claim first.
                const recovered = await supabase
                    .from("offer_redemptions")
                    .select("id, redemption_code, used_at")
                    .eq("offer_id", offerId)
                    .eq("user_id", user.id)
                    .maybeSingle();

                if (!recovered.error && recovered.data) {
                    setClaimedRedemption(recovered.data);
                    router.refresh();
                    return;
                }

                throw new Error(error.message);
            }

            const newRedemption = parseRedemption(data);

            if (!newRedemption) {
                throw new Error(
                    "We couldn’t display the result. Check My vouchers before trying again.",
                );
            }

            // Show the voucher even if the email service is unavailable.
            setClaimedRedemption(newRedemption);

            try {
                const { error: emailError } =
                    await supabase.functions.invoke(
                        "send-redemption-confirmation",
                        {
                            body: {
                                redemption_id: newRedemption.id,
                            },
                        },
                    );

                if (emailError) throw emailError;
            } catch {
                setEmailWarning(
                    "Your voucher is saved, but we couldn’t send the confirmation email. You can still access it in My vouchers.",
                );
            }

            router.refresh();
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "We couldn’t claim this offer. Please try again.",
            );
        } finally {
            busyRef.current = false;
            setIsRedeeming(false);
        }
    }

    // Existing vouchers take priority over the total claim limit.
    if (redemption) {
        const isUsed = Boolean(redemption.used_at);

        const statusLabel = isUsed
            ? "Already used"
            : isExpired
                ? "Promotion expired"
                : "Your claimed voucher";

        return (
            <Card className="mt-8 border-[#17233B] bg-[#17233B] text-white">
                <CardContent className="p-6 text-center">
                    <Badge
                        variant="outline"
                        className="border-white/20 bg-white/10 text-white/80"
                    >
                        {statusLabel}
                    </Badge>

                    <p className="mt-5 text-sm text-white/70">
                        Your redemption code
                    </p>

                    <p className="mt-2 break-all font-mono text-3xl font-bold tracking-[0.2em]">
                        {redemption.redemption_code}
                    </p>

                    <p className="mt-3 text-sm leading-6 text-white/70">
                        {isUsed
                            ? "The business has marked this voucher as used."
                            : isExpired
                                ? "The published expiry date has passed. Contact the business if you have a question about this voucher."
                                : "Show this code to the business when using your offer."}
                    </p>

                    <Button
                        render={
                            <Link href="/dashboard/redemptions" />
                        }
                        nativeButton={false}
                        variant="secondary"
                        className="mt-6"
                    >
                        View my voucher
                    </Button>

                    {emailWarning && (
                        <Alert className="mt-5 border-amber-300/30 bg-amber-400/10 text-left text-amber-200">
                            <AlertTitle>
                                Confirmation email unavailable
                            </AlertTitle>

                            <AlertDescription className="text-amber-200">
                                {emailWarning}
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>
        );
    }

    if (isExpired) {
        return (
            <Alert className="mt-8 border-amber-200 bg-amber-50 text-amber-800">
                <AlertTitle>This promotion has expired</AlertTitle>

                <AlertDescription>
                    New claims are no longer available.
                </AlertDescription>

                <Button
                    render={<Link href="/offers" />}
                    nativeButton={false}
                    variant="outline"
                    size="sm"
                    className="mt-4"
                >
                    Browse other offers
                </Button>
            </Alert>
        );
    }

    if (isFullyClaimed) {
        return (
            <Alert className="mt-8 border-amber-200 bg-amber-50 text-amber-800">
                <AlertTitle>
                    This offer has been fully claimed
                </AlertTitle>

                <AlertDescription>
                    No new claims are available. If you claimed it with
                    another account, sign in to that account to find your
                    voucher.
                </AlertDescription>

                <Button
                    render={<Link href="/offers" />}
                    nativeButton={false}
                    variant="outline"
                    size="sm"
                    className="mt-4"
                >
                    Browse other offers
                </Button>
            </Alert>
        );
    }

    if (!isSignedIn) {
        return (
            <div className="mt-8 space-y-4">
                <Button
                    render={<Link href="/login" />}
                    nativeButton={false}
                    size="lg"
                    className="w-full"
                >
                    Log in to claim this deal
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                    New to Promotello?{" "}
                    <Link
                        href="/signup"
                        className="font-medium underline underline-offset-4"
                    >
                        Create an account
                    </Link>
                </p>
            </div>
        );
    }

    return (
        <div className="mt-8">
            <Button
                type="button"
                size="lg"
                onClick={redeemOffer}
                disabled={isRedeeming}
                className="w-full"
            >
                {isRedeeming ? "Claiming…" : "Get this deal"}
            </Button>

            {message && (
                <Alert variant="destructive" className="mt-4">
                    <AlertTitle>
                        Unable to claim offer
                    </AlertTitle>

                    <AlertDescription>{message}</AlertDescription>
                </Alert>
            )}
        </div>
    );
}