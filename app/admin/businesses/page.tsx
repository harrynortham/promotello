"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
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
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/utils/supabase/client";

import { notifyBusinessReviewed } from "./actions";

type Business = {
    id: string;
    slug: string;
    name: string;
    category: string;
    description: string | null;
    website_url: string | null;
    contact_email: string | null;
    approval_status: "pending" | "approved" | "rejected" | "suspended";
    review_requested_at: string | null;
    closed_at: string | null;
    created_at: string;
    business_locations:
    | {
        name: string;
        address_line_1: string;
        address_line_2: string | null;
        city: string;
        region: string | null;
        postal_code: string | null;
        country_code: string;
    }[]
    | null;
};

type Status = "pending" | "approved" | "rejected" | "suspended";

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

type ReviewAction = {
    businessId: string;
    decision: "approved" | "rejected";
} | null;

const pageSize = 25;

export default function AdminBusinessesPage() {
    const router = useRouter();

    const [businesses, setBusinesses] = useState<Business[]>([]);
    // Waiting is the queue, in the order they arrived. Everything else is
    // the directory, newest first, for looking something up.
    const [tab, setTab] = useState<"pending" | "all">("pending");
    const [status, setStatus] = useState<Status | "all">("all");
    // What is typed, and what the list is filtered by: the box changes on
    // every keystroke, the query on submit.
    const [search, setSearch] = useState("");
    const [appliedSearch, setAppliedSearch] = useState("");
    const [page, setPage] = useState(1);
    // Bumped to ask for the same filters again, after a decision.
    const [refreshKey, setRefreshKey] = useState(0);
    const [isAllowed, setIsAllowed] = useState(false);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [activeBusinessId, setActiveBusinessId] = useState("");
    // Edits a business made to its own page after we approved it. They
    // are already live; this is how many nobody has read yet.
    const [unreadEdits, setUnreadEdits] = useState(0);
    // Businesses still describing themselves in their own words,
    // because the list had nothing for them.
    const [withoutCategory, setWithoutCategory] = useState(0);
    const [errorMessage, setErrorMessage] = useState("");
    const [reviewAction, setReviewAction] =
        useState<ReviewAction>(null);

    // Only the newest request may write to the page, and the state is the
    // only description of what to show: see the same change in
    // app/admin/offers/page.tsx for what this is fixing.
    const latestRequest = useRef(0);

    const loadBusinesses = useCallback(async (
        requestedSearch: string,
        requestedPage: number,
        requestedTab: "pending" | "all",
        requestedStatus: Status | "all",
    ) => {
        const requestId = ++latestRequest.current;

        setIsLoading(true);
        setErrorMessage("");

        const supabase = createClient();

        const from = (requestedPage - 1) * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
            .from("businesses")
            .select(
                `
          id,
          slug,
          name,
          category,
          description,
          website_url,
          contact_email,
          approval_status,
          review_requested_at,
          closed_at,
          created_at,
          business_locations (
            name,
            address_line_1,
            address_line_2,
            city,
            region,
            postal_code,
            country_code
          )
        `,
                { count: "exact" },
            )
            .order("created_at", { ascending: requestedTab === "pending" })
            .range(from, to);

        if (requestedTab === "pending") {
            // Pending only means nobody has approved it. The queue is the
            // businesses that have asked and are still here.
            query = query
                .eq("approval_status", "pending")
                .not("review_requested_at", "is", null)
                .is("closed_at", null);
        } else if (requestedStatus !== "all") {
            query = query.eq("approval_status", requestedStatus);
        }

        if (requestedSearch.trim()) {
            const value = requestedSearch.trim();

            query = query.or(
                `name.ilike.%${value}%,category.ilike.%${value}%`,
            );
        }

        const { data, error, count } = await query;

        // Answered a question the page has already moved on from.
        if (requestId !== latestRequest.current) {
            return;
        }

        if (error) {
            setErrorMessage(error.message);
        } else {
            setBusinesses((data ?? []) as Business[]);
            setTotalPages(Math.max(1, Math.ceil((count ?? 0) / pageSize)));
        }

        setIsLoading(false);
    }, [])

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

            setIsAllowed(true);
        }

        checkAccess();
    }, [router]);

    // How many edits to an approved page nobody has read. The page
    // itself is already changed; this is only the prompt to look.
    useEffect(() => {
        if (!isAllowed) return;

        const supabase = createClient();

        void supabase
            .from("business_edits")
            .select("id", { count: "exact", head: true })
            .is("reviewed_at", null)
            .then(({ count }) => setUnreadEdits(count ?? 0));

        void supabase
            .rpc("businesses_without_a_category")
            .then(({ data }) => setWithoutCategory((data ?? []).length));
    }, [isAllowed, refreshKey]);

    // One load, for whatever the page is currently asking to see.
    useEffect(() => {
        if (!isAllowed) return;

        async function run() {
            await loadBusinesses(appliedSearch, page, tab, status);
        }

        void run();
    }, [isAllowed, appliedSearch, page, tab, status, refreshKey, loadBusinesses]);

    async function reviewBusiness(
        businessId: string,
        decision: "approved" | "rejected",
    ) {
        setActiveBusinessId(businessId);
        setErrorMessage("");

        const supabase = createClient();

        const { error } = await supabase.rpc("review_business", {
            business_id: businessId,
            decision,
        });

        if (error) {
            setErrorMessage(error.message);
            setActiveBusinessId("");
            return;
        }

        await notifyBusinessReviewed(businessId, decision).catch((notifyError) =>
            console.error("Could not email the business", notifyError),
        );

        setReviewAction(null);
        setRefreshKey((key) => key + 1);
        setActiveBusinessId("");
    }

    return (
        <div>
            <div>

                <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                            Businesses
                        </h1>

                        <p className="mt-3 text-[#17233B]/65">
                            {tab === "pending"
                                ? "Businesses waiting to join Promotello, oldest first."
                                : "Every business on Promotello, newest first."}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {withoutCategory > 0 && (
                            <Button
                                render={<Link href="/admin/businesses/categories" />}
                                nativeButton={false}
                            >
                                {withoutCategory} without a category
                            </Button>
                        )}

                        <Button
                            render={<Link href="/admin/businesses/edits" />}
                            nativeButton={false}
                            variant={unreadEdits > 0 ? "default" : "outline"}
                        >
                            {unreadEdits > 0
                                ? `${unreadEdits} edited since approval`
                                : "Edited since approval"}
                        </Button>

                        <Button
                            render={<Link href="/business/setup/new" />}
                            nativeButton={false}
                            variant="outline"
                        >
                            Set up a business for an owner
                        </Button>
                    </div>
                </header>

                <div className="mt-8 flex flex-wrap gap-2">
                    {([["pending", "Waiting for review"], ["all", "All businesses"]] as const).map(([key, label]) => (
                        <Button
                            key={key}
                            type="button"
                            variant={tab === key ? "default" : "outline"}
                            onClick={() => {
                                setTab(key);
                                setPage(1);
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
                                setAppliedSearch(search);
                            }}
                            className="flex flex-col gap-3 sm:flex-row sm:items-end"
                        >
                            <div className="flex-1 space-y-2">
                                <Label htmlFor="search">Search businesses</Label>

                                <Input
                                    id="search"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Business name or category"
                                />
                            </div>

                            {tab === "all" && (
                                <div className="space-y-2">
                                    <Label htmlFor="status">Status</Label>

                                    <select
                                        id="status"
                                        value={status}
                                        onChange={(event) => {
                                            setStatus(event.target.value as Status | "all");
                                            setPage(1);
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
                        <AlertTitle>Unable to load businesses</AlertTitle>
                        <AlertDescription>{errorMessage}</AlertDescription>
                    </Alert>
                )}

                {isLoading ? (
                    <div className="mt-10 space-y-6">
                        {[1, 2, 3].map((item) => (
                            <div
                                key={item}
                                className="rounded-xl border border-[#17233B]/10 bg-white p-6 sm:p-8"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-3">
                                        <Skeleton className="h-4 w-32 rounded-md" />
                                        <Skeleton className="h-8 w-64 rounded-md" />
                                    </div>

                                    <Skeleton className="h-6 w-24 rounded-full" />
                                </div>

                                <Skeleton className="mt-6 h-16 w-full rounded-md" />

                                <div className="mt-5 space-y-2">
                                    <Skeleton className="h-4 w-56 rounded-md" />
                                    <Skeleton className="h-4 w-72 rounded-md" />
                                    <Skeleton className="h-4 w-80 rounded-md" />
                                </div>

                                <div className="mt-7 flex gap-3">
                                    <Skeleton className="h-10 w-36 rounded-md" />
                                    <Skeleton className="h-10 w-36 rounded-md" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : businesses.length === 0 ? (
                    <Alert className="mt-10 border-[#17233B]/10 bg-white">
                        <AlertTitle>
                            {tab === "pending" ? "No businesses need review" : "No businesses found"}
                        </AlertTitle>

                        <AlertDescription>
                            {tab === "pending"
                                ? "Nothing is waiting. Try All businesses to look one up."
                                : "Nothing matched that search and status."}
                        </AlertDescription>
                    </Alert>
                ) : (
                    <>
                        <section className="mt-10 space-y-6">
                            {businesses.map((business) => {
                                const location = business.business_locations?.[0];

                                const address = location
                                    ? [
                                        location.address_line_1,
                                        location.address_line_2,
                                        location.city,
                                        location.region,
                                        location.postal_code,
                                        location.country_code,
                                    ]
                                        .filter(Boolean)
                                        .join(", ")
                                    : null;

                                return (
                                    <Card
                                        key={business.id}
                                        className={`border-[#17233B]/10 shadow-sm ${business.closed_at ? "bg-[#17233B]/[0.02] opacity-70" : ""}`}
                                    >
                                        <CardHeader>
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                <div>
                                                    <p className="text-sm font-medium text-[#FF593F]">
                                                        {business.category}
                                                    </p>

                                                    <CardTitle className="mt-1 text-2xl">
                                                        {business.name}
                                                    </CardTitle>
                                                </div>

                                                <div className="flex w-fit flex-wrap gap-2">
                                                    <Badge className={`w-fit ${statusStyles[business.approval_status]}`}>
                                                        {statusLabels[business.approval_status]}
                                                    </Badge>

                                                    {business.closed_at ? (
                                                        <Badge variant="outline" className="w-fit text-[#17233B]/55">
                                                            Closed
                                                        </Badge>
                                                    ) : (
                                                        business.approval_status === "pending" &&
                                                        !business.review_requested_at && (
                                                            <Badge variant="outline" className="w-fit">
                                                                Not sent for review
                                                            </Badge>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        </CardHeader>

                                        <CardContent>
                                            {business.description && (
                                                <p className="leading-7 text-[#17233B]/65">
                                                    {business.description}
                                                </p>
                                            )}

                                            <div className="mt-5 space-y-2 text-sm text-[#17233B]/70">
                                                {business.contact_email && (
                                                    <p>Contact: {business.contact_email}</p>
                                                )}

                                                {business.website_url && (
                                                    <p>Website: {business.website_url}</p>
                                                )}

                                                {address && <p>Location: {address}</p>}
                                            </div>

                                            <Separator className="my-6" />

                                            <div className="flex flex-col gap-3 sm:flex-row">
                                                <Button
                                                    render={<Link href={`/admin/businesses/${business.id}`} />}
                                                    nativeButton={false}
                                                    variant="outline"
                                                >
                                                    Open
                                                </Button>

                                                {/* The page as it will look, before saying yes to
                                                    it. A pending business is readable by an admin,
                                                    and shows itself as a preview. */}
                                                <Button
                                                    render={
                                                        <Link
                                                            href={`/businesses/${business.slug}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                        />
                                                    }
                                                    nativeButton={false}
                                                    variant="outline"
                                                >
                                                    View full profile
                                                    <FiExternalLink aria-hidden="true" />
                                                </Button>

                                                {business.approval_status === "pending" && (
                                                    <>
                                                        <Button
                                                            type="button"
                                                            disabled={activeBusinessId === business.id}
                                                            onClick={() =>
                                                                setReviewAction({
                                                                    businessId: business.id,
                                                                    decision: "approved",
                                                                })
                                                            }
                                                        >
                                                            Approve business
                                                        </Button>

                                                        <Button
                                                            type="button"
                                                            variant="destructive"
                                                            disabled={activeBusinessId === business.id}
                                                            onClick={() =>
                                                                setReviewAction({
                                                                    businessId: business.id,
                                                                    decision: "rejected",
                                                                })
                                                            }
                                                        >
                                                            Reject business
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
                                        setPage(page - 1);
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
                                        setPage(page + 1);
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
                                ? "Approve this business?"
                                : "Reject this business?"}
                        </DialogTitle>

                        <DialogDescription>
                            {reviewAction?.decision === "approved"
                                ? "This business will be eligible to appear publicly."
                                : "This business will not be allowed to operate publicly."}
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setReviewAction(null)}
                            disabled={activeBusinessId !== ""}
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
                            disabled={activeBusinessId !== ""}
                            onClick={() => {
                                if (reviewAction) {
                                    reviewBusiness(
                                        reviewAction.businessId,
                                        reviewAction.decision,
                                    );
                                }
                            }}
                        >
                            {activeBusinessId !== ""
                                ? "Saving…"
                                : reviewAction?.decision === "approved"
                                    ? "Approve business"
                                    : "Reject business"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}