import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { addressParts } from "@/lib/address";
import { createClient } from "@/utils/supabase/server";

import RedemptionList, {
    type WalletRedemption,
} from "./redemption-list";

function firstRelation<T>(value: T | T[] | null): T | null {
    return Array.isArray(value) ? value[0] ?? null : value;
}

function LoadingState() {
    return (
        <section
            role="status"
            aria-label="Loading your vouchers"
            className="mx-auto max-w-5xl space-y-6 py-6"
        >
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-5 w-80 max-w-full" />

            <div className="grid gap-4 sm:grid-cols-3">
                {[1, 2, 3].map((item) => (
                    <Skeleton
                        key={item}
                        className="h-24 rounded-2xl"
                    />
                ))}
            </div>

            <Skeleton className="h-80 rounded-3xl" />
            <Skeleton className="h-80 rounded-3xl" />
        </section>
    );
}

async function RedemptionsContent() {
    await connection();

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data, error } = await supabase
        .from("offer_redemptions")
        .select(
            `
                id,
                redemption_code,
                redeemed_at,
                used_at,
                offers (
                    slug,
                    title,
                    discount,
                    availability,
                    expires_at,
                    terms,
                    approval_status,
                    businesses (
                        id,
                        slug,
                        name,
                        approval_status,
                        business_locations (
                            name,
                            address_line_1,
                            city,
                            region,
                            postal_code
                        )
                    )
                )
            `,
        )
        .eq("user_id", user.id)
        .order("redeemed_at", {
            ascending: false,
            nullsFirst: false,
        });

    if (error) {
        return (
            <section className="mx-auto max-w-5xl space-y-6 py-6">
                <h1 className="text-3xl font-semibold tracking-tight">
                    My vouchers
                </h1>

                <Alert variant="destructive">
                    <AlertTitle>
                        We couldn’t load your vouchers
                    </AlertTitle>

                    <AlertDescription>
                        Please refresh the page and try again.
                    </AlertDescription>
                </Alert>
            </section>
        );
    }

    const redemptions: WalletRedemption[] = (data ?? []).map(
        (redemption) => {
            const offer = firstRelation(redemption.offers);

            const business = offer
                ? firstRelation(offer.businesses)
                : null;

            const locations = business?.business_locations;
            const location = locations
                ? firstRelation(locations)
                : null;

            const address = addressParts(location).join(", ");

            return {
                id: redemption.id,
                code: redemption.redemption_code,
                claimedAt: redemption.redeemed_at,
                usedAt: redemption.used_at,
                offer: offer
                    ? {
                        slug: offer.slug,
                        title: offer.title,
                        discount: offer.discount,
                        availability: offer.availability,
                        expiresAt: offer.expires_at,
                        terms: offer.terms,
                        approved:
                            offer.approval_status === "approved" &&
                            business?.approval_status === "approved",
                    }
                    : null,
                business: business
                    ? {
                        id: business.id,
                        slug: business.slug,
                        name: business.name,
                        address,
                    }
                    : null,
            };
        },
    );

    // Gift vouchers from businesses' automations, shown alongside.
    const { data: gifts } = await supabase
        .from("reward_vouchers")
        .select("id, code, kind, reward, created_at, expires_at, used_at, businesses ( id, slug, name )")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    const giftLabels: Record<string, string> = {
        welcome: "Welcome gift",
        birthday: "Birthday treat",
        winback: "Come-back gift",
    };

    const giftRedemptions: WalletRedemption[] = (gifts ?? []).map((gift) => {
        const business = firstRelation(gift.businesses);

        return {
            id: gift.id,
            code: gift.code,
            claimedAt: gift.created_at,
            usedAt: gift.used_at,
            offer: {
                slug: null,
                title: gift.reward,
                discount: giftLabels[gift.kind] ?? "Gift",
                availability: "One use. Show the code or QR to staff.",
                expiresAt: gift.expires_at,
                terms: "A personal gift from the business. It can't be swapped for cash.",
                approved: true,
            },
            business: business ? { id: business.id, slug: business.slug, name: business.name, address: "" } : null,
        };
    });

    const all = [...giftRedemptions, ...redemptions].sort(
        (a, b) => (b.claimedAt ?? "").localeCompare(a.claimedAt ?? ""),
    );

    return (
        <RedemptionList
            redemptions={all}
            today={new Date().toISOString().slice(0, 10)}
        />
    );
}

export default function CustomerRedemptionsPage() {
    return (
        <Suspense fallback={<LoadingState />}>
            <RedemptionsContent />
        </Suspense>
    );
}