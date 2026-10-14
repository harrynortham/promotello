"use client";

import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type Redemption = {
    id: string;
    redemption_code: string;
    redeemed_at: string;
    used_at: string | null;
    offers:
    | {
        slug: string;
        title: string;
        discount: string;
        businesses:
        | { name: string }
        | { name: string }[]
        | null;
    }
    | {
        slug: string;
        title: string;
        discount: string;
        businesses:
        | { name: string }
        | { name: string }[]
        | null;
    }[]
    | null;
};

function getOffer(offers: Redemption["offers"]) {
    return Array.isArray(offers) ? offers[0] : offers;
}

function getBusinessName(
    businesses:
        | { name: string }
        | { name: string }[]
        | null
        | undefined,
) {
    if (!businesses) {
        return "Local business";
    }

    return Array.isArray(businesses)
        ? businesses[0]?.name ?? "Local business"
        : businesses.name;
}

export default function RedemptionList({
    redemptions,
}: {
    redemptions: Redemption[];
}) {
    return (
        <main className="min-h-screen px-6 py-6 text-[#17233B] sm:py-16">
            <div className="mx-auto max-w-4xl">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <Badge
                            variant="outline"
                            className="border-[#FF593F]/30 bg-[#FF593F]/10 text-[#FF593F]"
                        >
                            Customer account
                        </Badge>

                        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                            My redemptions
                        </h1>

                        <p className="mt-3 text-[#17233B]/65">
                            Keep track of the offers you have redeemed.
                        </p>
                    </div>

                    <Button
                        render={<Link href="/#offers" />}
                        nativeButton={false}
                        variant="default"
                        size="sm"
                    >
                        Browse deals
                    </Button>
                </div>

                {redemptions.length === 0 ? (
                    <Alert className="mt-10 border-[#17233B]/10 bg-white">
                        <AlertTitle>No redemptions yet</AlertTitle>

                        <AlertDescription>
                            When you redeem an offer, your redemption code and offer details
                            will appear here.
                        </AlertDescription>

                        <Button
                            render={<Link href="/#offers" />}
                            nativeButton={false}
                            variant="default"
                            size="sm"
                            className="mt-5"
                        >
                            Explore deals
                        </Button>
                    </Alert>
                ) : (
                    <section className="mt-10 grid gap-6">
                        {redemptions.map((redemption) => {
                            const offer = getOffer(redemption.offers);

                            if (!offer) {
                                return null;
                            }

                            const businessName = getBusinessName(offer.businesses);
                            const isUsed = Boolean(redemption.used_at);

                            return (
                                <Card
                                    key={redemption.id}
                                    className="border-[#17233B]/10 shadow-sm"
                                >
                                    <CardHeader>
                                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-[#17233B]/60">
                                                    {businessName}
                                                </p>

                                                <CardTitle className="mt-2 text-2xl">
                                                    {offer.title}
                                                </CardTitle>

                                                <p className="mt-2 font-semibold text-[#FF593F]">
                                                    {offer.discount}
                                                </p>
                                            </div>

                                            <Badge
                                                variant="outline"
                                                className={
                                                    isUsed
                                                        ? "border-slate-200 bg-slate-100 text-slate-700"
                                                        : "border-emerald-200 bg-emerald-100 text-emerald-800"
                                                }
                                            >
                                                {isUsed ? "Used" : "Active"}
                                            </Badge>
                                        </div>
                                    </CardHeader>

                                    <CardContent>
                                        <div className="rounded-xl bg-[#17233B] p-5 text-center text-white">
                                            <p className="text-sm text-white/70">
                                                Redemption code
                                            </p>

                                            <p className="mt-2 text-2xl font-bold tracking-[0.2em]">
                                                {redemption.redemption_code}
                                            </p>

                                            <p className="mt-3 text-sm text-white/70">
                                                {isUsed
                                                    ? "This redemption has been marked as used."
                                                    : "Show this code to the business."}
                                            </p>
                                        </div>

                                        <Separator className="my-6" />

                                        <div className="flex flex-wrap items-center justify-between gap-4">
                                            <div className="text-sm text-[#17233B]/60">
                                                <p>
                                                    Redeemed{" "}
                                                    {new Date(
                                                        redemption.redeemed_at,
                                                    ).toLocaleDateString("en-GB", {
                                                        day: "numeric",
                                                        month: "long",
                                                        year: "numeric",
                                                    })}
                                                </p>

                                                {redemption.used_at && (
                                                    <p className="mt-1 text-green-700">
                                                        Used{" "}
                                                        {new Date(
                                                            redemption.used_at,
                                                        ).toLocaleDateString("en-GB", {
                                                            day: "numeric",
                                                            month: "long",
                                                            year: "numeric",
                                                        })}
                                                    </p>
                                                )}
                                            </div>

                                            <Button
                                                render={
                                                    <Link href={`/offers/${offer.slug}`} />
                                                }
                                                nativeButton={false}
                                                variant="outline"
                                                size="sm"
                                            >
                                                View offer
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </section>
                )}
            </div>
        </main>
    );
}