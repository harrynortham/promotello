"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FiExternalLink } from "react-icons/fi";

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

import { notifyBusinessOfOfferReview, notifyFollowersOfApprovedOffer } from "./actions";

type Status = "pending" | "approved" | "rejected" | "suspended";

type Business = {
    id: string;
    name: string;
    approval_status: string;
};

type Offer = {
    id: string;
    slug: string;
    title: string;
    category: string;
    discount: string;
    description: string;
    availability: string;
    expires_at: string;
    created_at: string;
    terms: string;
    image_url: string | null;
    max_redemptions: number | null;
    redemption_count: number;
    approval_status: Status;
    businesses: Business | Business[] | null;
};

type ReviewAction = {
    offerId: string;
    decision: "approved" | "rejected";
} | null;

const statusLabels: Record<Status, string> = {
    pending: "Waiting",
    approved: "Live",
    rejected: "Rejected",
    suspended: "Suspended",
};

const statusStyles: Record<Status, string> = {
    pending: "bg-amber-100 text-amber-800 hover:bg-amber-100",
    approved: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
    rejected: "bg-red-100 text-red-800 hover:bg-red-100",
    suspended: "bg-red-100 text-red-800 hover:bg-red-100",
};

const pageSize = 25;

function getBusiness(offer: Offer): Business | null {
    return (Array.isArray(offer.businesses) ? offer.businesses[0] : offer.businesses) ?? null;
}

function getBusinessName(offer: Offer) {
    return getBusiness(offer)?.name ?? "Unknown business";
}

function when(value: string) {
    return new Date(value).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

export default function AdminOffersPage() {
    const router = useRouter();

    const [offers, setOffers] = useState<Offer[]>([]);
    // Waiting is the queue, in the order they arrived. Everything else is
    // the catalogue, newest first, for looking an offer up.
    const [tab, setTab] = useState<"pending" | "all">("pending");
    const [status, setStatus] = useState<Status | "all">("all");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [activeOfferId, setActiveOfferId] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [reviewAction, setReviewAction] = useState<ReviewAction>(null);
    // The offer being read in full, rather than scrolling past every
    // description in the queue.
    const [reading, setReading] = useState<Offer | null>(null);

    async function loadOffers(
        requestedSearch = "",
        requestedPage = 1,
        requestedTab: "pending" | "all",
        requestedStatus: Status | "all",
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
          slug,
          title,
          category,
          discount,
          description,
          availability,
          expires_at,
          created_at,
          terms,
          image_url,
          max_redemptions,
          redemption_count,
          approval_status,
          businesses (
            id,
            name,
            approval_status
          )
        `,
                { count: "exact" },
            )
            .order("created_at", { ascending: requestedTab === "pending" })
            .range(from, to);

        if (requestedTab === "pending") {
            query = query.eq("approval_status", "pending");
        } else if (requestedStatus !== "all") {
            query = query.eq("approval_status", requestedStatus);
        }

        if (requestedSearch.trim()) {
            const value = requestedSearch.trim();

            query = query.or(
                `title.ilike.%${value}%,category.ilike.%${value}%,discount.ilike.%${value}%`,
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

            await loadOffers("", 1, "pending", "all");
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

        await notifyBusinessOfOfferReview(offerId, decision).catch((notifyError) =>
            console.error("Could not email the business", notifyError),
        );

        setReviewAction(null);
        setReading(null);
        await loadOffers(search, page, tab, status);
        setActiveOfferId("");
    }

    return (
        <div>
            <div>
                <header>
                    <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                        Offers
                    </h1>

                    <p className="mt-3 text-[#17233B]/65">
                        {tab === "pending"
                            ? "Offers waiting for review, oldest first."
                            : "Every offer on Promotello, newest first."}
                    </p>
                </header>

                <div className="mt-8 flex flex-wrap gap-2">
                    {([["pending", "Waiting for review"], ["all", "All offers"]] as const).map(([key, label]) => (
                        <Button
                            key={key}
                            type="button"
                            variant={tab === key ? "default" : "outline"}
                            onClick={() => {
                                setTab(key);
                                setPage(1);
                                loadOffers(search, 1, key, status);
                            }}
                        >
                            {label}
                        </Button>
                    ))}
                </div>

                <Card className="mt-4 border-[#17233B]/10">
                    <CardContent className="p-6">
                        <form
                            onSubmit={(event: FormEvent<HTMLFormElement>) => {
                                event.preventDefault();
                                setPage(1);
                                loadOffers(search, 1, tab, status);
                            }}
                            className="flex flex-col gap-3 sm:flex-row sm:items-end"
                        >
                            <div className="flex-1 space-y-2">
                                <Label htmlFor="search">Search offers</Label>

                                <Input
                                    id="search"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Offer title, category or discount"
                                />
                            </div>

                            {tab === "all" && (
                                <div className="space-y-2">
                                    <Label htmlFor="status">Status</Label>

                                    <select
                                        id="status"
                                        value={status}
                                        onChange={(event) => {
                                            const chosen = event.target.value as Status | "all";
                                            setStatus(chosen);
                                            setPage(1);
                                            loadOffers(search, 1, tab, chosen);
                                        }}
                                        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm sm:w-44"
                                    >
                                        <option value="all">Any status</option>
                                        {(Object.keys(statusLabels) as Status[]).map((key) => (
                                            <option key={key} value={key}>{statusLabels[key]}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <Button type="submit">Search</Button>
                        </form>
                    </CardContent>
                </Card>

                {errorMessage && (
                    <Alert variant="destructive" className="mt-8">
                        <AlertTitle>Unable to load offers</AlertTitle>
                        <AlertDescription>{errorMessage}</AlertDescription>
                    </Alert>
                )}

                {isLoading ? (
                    <div className="mt-10 space-y-4">
                        {[1, 2, 3].map((item) => (
                            <div key={item} className="rounded-xl border border-[#17233B]/10 bg-white p-6">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-3">
                                        <Skeleton className="h-4 w-32 rounded-md" />
                                        <Skeleton className="h-7 w-64 rounded-md" />
                                        <Skeleton className="h-4 w-48 rounded-md" />
                                    </div>

                                    <Skeleton className="h-6 w-20 rounded-full" />
                                </div>

                                <div className="mt-6 flex gap-3">
                                    <Skeleton className="h-10 w-28 rounded-md" />
                                    <Skeleton className="h-10 w-28 rounded-md" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : offers.length === 0 ? (
                    <Alert className="mt-10 border-[#17233B]/10 bg-white">
                        <AlertTitle>
                            {tab === "pending" ? "No offers need review" : "No offers found"}
                        </AlertTitle>

                        <AlertDescription>
                            {tab === "pending"
                                ? "Nothing is waiting. Try All offers to look one up."
                                : "Nothing matched that search and status."}
                        </AlertDescription>
                    </Alert>
                ) : (
                    <>
                        {/* No photographs in the queue: a row is for deciding
                            which offer to open, and twenty pictures make that
                            a long scroll. The offer itself carries its photo. */}
                        <section className="mt-10 space-y-4">
                            {offers.map((offer) => {
                                const business = getBusiness(offer);
                                const businessLive = business?.approval_status === "approved";

                                return (
                                    <Card key={offer.id} className="border-[#17233B]/10 shadow-sm">
                                        <CardHeader>
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-[#FF593F]">
                                                        {getBusinessName(offer)}
                                                    </p>

                                                    <CardTitle className="mt-1 text-xl">
                                                        {offer.title}
                                                    </CardTitle>

                                                    <p className="mt-2 text-sm text-[#17233B]/70">
                                                        {offer.discount} · {offer.category} · submitted{" "}
                                                        {when(offer.created_at)}
                                                    </p>
                                                </div>

                                                <Badge className={`w-fit ${statusStyles[offer.approval_status]}`}>
                                                    {statusLabels[offer.approval_status]}
                                                </Badge>
                                            </div>
                                        </CardHeader>

                                        <CardContent>
                                            {!businessLive && (
                                                <Alert className="mb-5 border-amber-200 bg-amber-50">
                                                    <AlertTitle>Approve the business first</AlertTitle>

                                                    <AlertDescription>
                                                        {getBusinessName(offer)} is{" "}
                                                        {business?.approval_status ?? "not approved"}. An offer
                                                        stays invisible to customers until its business is
                                                        live, so it is reviewed after the business, not
                                                        before.{" "}
                                                        {business && (
                                                            <Link
                                                                href={`/admin/businesses/${business.id}`}
                                                                className="font-medium text-[#FF593F]"
                                                            >
                                                                Open the business
                                                            </Link>
                                                        )}
                                                    </AlertDescription>
                                                </Alert>
                                            )}

                                            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => setReading(offer)}
                                                >
                                                    View offer
                                                </Button>

                                                <Button
                                                    render={<Link href={`/admin/offers/${offer.id}`} />}
                                                    nativeButton={false}
                                                    variant="outline"
                                                >
                                                    Open
                                                </Button>

                                                {offer.approval_status === "pending" && (
                                                    <>
                                                        <Button
                                                            type="button"
                                                            disabled={activeOfferId === offer.id || !businessLive}
                                                            onClick={() =>
                                                                setReviewAction({
                                                                    offerId: offer.id,
                                                                    decision: "approved",
                                                                })
                                                            }
                                                        >
                                                            Approve
                                                        </Button>

                                                        {/* Rejecting stays open whatever the
                                                            business's status. */}
                                                        <Button
                                                            type="button"
                                                            variant="destructive"
                                                            disabled={activeOfferId === offer.id}
                                                            onClick={() =>
                                                                setReviewAction({
                                                                    offerId: offer.id,
                                                                    decision: "rejected",
                                                                })
                                                            }
                                                        >
                                                            Reject
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </section>

                        <nav className="mt-8 flex items-center justify-between">
                            {page > 1 ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        const nextPage = page - 1;
                                        setPage(nextPage);
                                        loadOffers(search, nextPage, tab, status);
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
                                        loadOffers(search, nextPage, tab, status);
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

            {/* The whole offer as the business submitted it, photo and all,
                without leaving the queue. */}
            <Dialog open={reading !== null} onOpenChange={(open) => !open && setReading(null)}>
                <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
                    {reading && (
                        <>
                            <DialogHeader>
                                <DialogTitle>{reading.title}</DialogTitle>

                                <DialogDescription>
                                    {getBusinessName(reading)} · {reading.category} · {reading.discount}
                                </DialogDescription>
                            </DialogHeader>

                            {reading.image_url && (
                                <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-[#FFF4E8]">
                                    <Image
                                        src={reading.image_url}
                                        alt=""
                                        fill
                                        sizes="576px"
                                        className="object-cover"
                                    />
                                </div>
                            )}

                            <p className="leading-7 text-[#17233B]/70">{reading.description}</p>

                            <dl className="space-y-2 text-sm">
                                {[
                                    ["Availability", reading.availability],
                                    ["Expires", when(reading.expires_at)],
                                    [
                                        "Limit",
                                        reading.max_redemptions
                                            ? `${reading.redemption_count} of ${reading.max_redemptions} claimed`
                                            : `${reading.redemption_count} claimed, no limit`,
                                    ],
                                    ["Terms", reading.terms],
                                ].map(([label, value]) => (
                                    <div key={label} className="flex flex-wrap gap-x-3">
                                        <dt className="text-[#17233B]/65">{label}</dt>
                                        <dd className="flex-1 text-right font-medium">{value}</dd>
                                    </div>
                                ))}
                            </dl>

                            <Separator />

                            <DialogFooter>
                                <Button
                                    render={
                                        <Link
                                            href={`/offers/${reading.slug}`}
                                            target="_blank"
                                            rel="noreferrer"
                                        />
                                    }
                                    nativeButton={false}
                                    variant="outline"
                                >
                                    Preview the page
                                    <FiExternalLink aria-hidden="true" />
                                </Button>

                                <Button
                                    render={<Link href={`/admin/offers/${reading.id}`} />}
                                    nativeButton={false}
                                    variant="outline"
                                >
                                    Open everything we have
                                </Button>

                                {reading.approval_status === "pending" && (
                                    <Button
                                        type="button"
                                        disabled={getBusiness(reading)?.approval_status !== "approved"}
                                        onClick={() =>
                                            setReviewAction({ offerId: reading.id, decision: "approved" })
                                        }
                                    >
                                        Approve
                                    </Button>
                                )}
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

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
                                ? "Approve this offer?"
                                : "Reject this offer?"}
                        </DialogTitle>

                        <DialogDescription>
                            {reviewAction?.decision === "approved"
                                ? "This offer will become eligible to appear publicly."
                                : "This offer will not appear publicly to customers."}
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
                                    ? "Approve offer"
                                    : "Reject offer"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
