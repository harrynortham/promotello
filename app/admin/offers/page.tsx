"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/utils/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

import { notifyFollowersOfApprovedOffer } from "./actions";

type Offer = {
    id: string;
    title: string;
    category: string;
    discount: string;
    description: string;
    availability: string;
    expires_at: string;
    terms: string;
    image_url: string | null;
    approval_status:
    | "pending"
    | "approved"
    | "rejected"
    | "suspended";
    businesses:
    | { name: string }
    | { name: string }[]
    | null;
};

type ReviewAction = {
    offerId: string;
    decision: "approved" | "rejected";
} | null;

const pageSize = 25;

function getBusinessName(offer: Offer) {
    if (Array.isArray(offer.businesses)) {
        return offer.businesses[0]?.name ?? "Unknown business";
    }

    return offer.businesses?.name ?? "Unknown business";
}

export default function AdminOffersPage() {
    const router = useRouter();

    const [offers, setOffers] = useState<Offer[]>([]);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [activeOfferId, setActiveOfferId] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [reviewAction, setReviewAction] =
        useState<ReviewAction>(null);

    async function loadOffers(
        requestedSearch = "",
        requestedPage = 1,
    ) {
        setIsLoading(true);
        setErrorMessage("");

        const supabase = createClient();

        const from = (requestedPage - 1) * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
            .from("offers")
            .select(
                `
          id,
          title,
          category,
          discount,
          description,
          availability,
          expires_at,
          terms,
          image_url,
          approval_status,
          businesses (
            name
          )
        `,
                { count: "exact" },
            )
            .eq("approval_status", "pending")
            .order("created_at", { ascending: true })
            .range(from, to);

        if (requestedSearch.trim()) {
            const searchValue = requestedSearch.trim();

            query = query.or(
                `title.ilike.%${searchValue}%,category.ilike.%${searchValue}%`,
            );
        }

        const { data, error, count } = await query;

        if (error) {
            setErrorMessage(error.message);
        } else {
            setOffers((data ?? []) as Offer[]);
            setTotalPages(Math.max(1, Math.ceil((count ?? 0) / pageSize)));
        }

        setIsLoading(false);
    }

    useEffect(() => {
        async function checkAccess() {
            const supabase = createClient();

            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                router.replace("/login");
                return;
            }

            const { data: isAdmin, error } = await supabase.rpc(
                "is_platform_admin",
            );

            if (error || !isAdmin) {
                router.replace("/dashboard");
                return;
            }

            await loadOffers("", 1);
        }

        checkAccess();
    }, [router]);

    async function reviewOffer(
        offerId: string,
        decision: "approved" | "rejected",
    ) {
        setActiveOfferId(offerId);
        setErrorMessage("");

        const supabase = createClient();

        const { error } = await supabase.rpc("review_offer", {
            offer_id: offerId,
            decision,
        });

        if (error) {
            setErrorMessage(error.message);
            setActiveOfferId("");
            return;
        }

        if (decision === "approved") {
            // Followers are emailed once per offer, so a retry is harmless.
            await notifyFollowersOfApprovedOffer(offerId).catch((notifyError) =>
                console.error("Could not email followers", notifyError),
            );
        }

        setReviewAction(null);
        await loadOffers(search, page);
        setActiveOfferId("");
    }

    return (
        <div>
            <div>

                <header>
                    <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                        Promotion approvals
                    </h1>

                    <p className="mt-3 text-[#17233B]/65">
                        Review promotions submitted by businesses.
                    </p>
                </header>

                <Card className="mt-8 border-[#17233B]/10">
                    <CardContent className="p-6">
                        <form
                            onSubmit={(event) => {
                                event.preventDefault();
                                setPage(1);
                                loadOffers(search, 1);
                            }}
                            className="flex flex-col gap-3 sm:flex-row sm:items-end"
                        >
                            <div className="flex-1 space-y-2">
                                <Label htmlFor="search">
                                    Search promotions
                                </Label>

                                <Input
                                    id="search"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Title or category"
                                />
                            </div>

                            <Button type="submit" variant="default">
                                Search
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {errorMessage && (
                    <Alert variant="destructive" className="mt-8">
                        <AlertTitle>Unable to load promotions</AlertTitle>

                        <AlertDescription>{errorMessage}</AlertDescription>
                    </Alert>
                )}

                {isLoading ? (
                    <div className="mt-10 space-y-6">
                        {[1, 2, 3].map((item) => (
                            <div
                                key={item}
                                className="overflow-hidden rounded-xl border border-[#17233B]/10 bg-white"
                            >
                                <Skeleton className="h-48 w-full rounded-none" />

                                <div className="space-y-5 p-6 sm:p-8">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-3">
                                            <Skeleton className="h-4 w-32 rounded-md" />
                                            <Skeleton className="h-8 w-64 rounded-md" />
                                            <Skeleton className="h-4 w-40 rounded-md" />
                                        </div>

                                        <Skeleton className="h-6 w-24 rounded-full" />
                                    </div>

                                    <Skeleton className="h-16 w-full rounded-md" />

                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-56 rounded-md" />
                                        <Skeleton className="h-4 w-72 rounded-md" />
                                        <Skeleton className="h-4 w-full rounded-md" />
                                    </div>

                                    <div className="flex gap-3">
                                        <Skeleton className="h-10 w-28 rounded-md" />
                                        <Skeleton className="h-10 w-28 rounded-md" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : offers.length === 0 ? (
                    <Alert className="mt-10 border-[#17233B]/10 bg-white">
                        <AlertTitle>No promotions need review</AlertTitle>

                        <AlertDescription>
                            No pending promotions matched your search.
                        </AlertDescription>
                    </Alert>
                ) : (
                    <>
                        <section className="mt-10 space-y-6">
                            {offers.map((offer) => (
                                <Card
                                    key={offer.id}
                                    className="overflow-hidden border-[#17233B]/10 shadow-sm"
                                >
                                    {offer.image_url && (
                                        <div className="relative aspect-[3/1] w-full overflow-hidden bg-[#FFF8F0]">
                                            <Image
                                                src={offer.image_url}
                                                alt={offer.title}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                    )}

                                    <CardHeader>
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-[#FF593F]">
                                                    {getBusinessName(offer)}
                                                </p>

                                                <CardTitle className="mt-1 text-2xl">
                                                    {offer.title}
                                                </CardTitle>

                                                <p className="mt-2 text-sm text-[#17233B]/70">
                                                    {offer.category} · {offer.discount}
                                                </p>
                                            </div>

                                            <Badge
                                                variant="outline"
                                                className="w-fit border-amber-200 bg-amber-100 text-amber-800"
                                            >
                                                Pending
                                            </Badge>
                                        </div>
                                    </CardHeader>

                                    <CardContent>
                                        <p className="leading-7 text-[#17233B]/65">
                                            {offer.description}
                                        </p>

                                        <div className="mt-5 space-y-2 text-sm text-[#17233B]/70">
                                            <p>{offer.availability}</p>

                                            <p>
                                                Expires{" "}
                                                {new Intl.DateTimeFormat("en-GB", {
                                                    day: "numeric",
                                                    month: "long",
                                                    year: "numeric",
                                                }).format(new Date(offer.expires_at))}
                                            </p>

                                            <p>{offer.terms}</p>
                                        </div>

                                        <Separator className="my-6" />

                                        <div className="flex flex-col gap-3 sm:flex-row">
                                            <Button
                                                type="button"
                                                disabled={activeOfferId === offer.id}
                                                onClick={() =>
                                                    setReviewAction({
                                                        offerId: offer.id,
                                                        decision: "approved",
                                                    })
                                                }
                                                variant="default"
                                            >
                                                Approve
                                            </Button>

                                            <Button
                                                type="button"
                                                disabled={activeOfferId === offer.id}
                                                onClick={() =>
                                                    setReviewAction({
                                                        offerId: offer.id,
                                                        decision: "rejected",
                                                    })
                                                }
                                                variant="destructive"
                                            >
                                                Reject
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </section>

                        <nav className="mt-8 flex items-center justify-between">
                            {page > 1 ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        const nextPage = page - 1;
                                        setPage(nextPage);
                                        loadOffers(search, nextPage);
                                    }}
                                >
                                    Previous
                                </Button>
                            ) : (
                                <span />
                            )}

                            <span className="text-sm text-[#17233B]/70">
                                Page {page} of {totalPages}
                            </span>

                            {page < totalPages ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        const nextPage = page + 1;
                                        setPage(nextPage);
                                        loadOffers(search, nextPage);
                                    }}
                                >
                                    Next
                                </Button>
                            ) : (
                                <span />
                            )}
                        </nav>
                    </>
                )}
            </div>

            <Dialog
                open={reviewAction !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setReviewAction(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {reviewAction?.decision === "approved"
                                ? "Approve this promotion?"
                                : "Reject this promotion?"}
                        </DialogTitle>

                        <DialogDescription>
                            {reviewAction?.decision === "approved"
                                ? "This promotion will become eligible to appear publicly."
                                : "This promotion will not appear publicly to customers."}
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setReviewAction(null)}
                            disabled={activeOfferId !== ""}
                        >
                            Cancel
                        </Button>

                        <Button
                            type="button"
                            variant={
                                reviewAction?.decision === "approved"
                                    ? "default"
                                    : "destructive"
                            }
                            onClick={() => {
                                if (reviewAction) {
                                    reviewOffer(
                                        reviewAction.offerId,
                                        reviewAction.decision,
                                    );
                                }
                            }}
                            disabled={activeOfferId !== ""}
                        >
                            {activeOfferId !== ""
                                ? "Saving…"
                                : reviewAction?.decision === "approved"
                                    ? "Approve promotion"
                                    : "Reject promotion"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}