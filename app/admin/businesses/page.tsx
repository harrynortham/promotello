"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
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
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/utils/supabase/client";

type Business = {
    id: string;
    name: string;
    category: string;
    description: string | null;
    website_url: string | null;
    contact_email: string | null;
    approval_status: "pending" | "approved" | "rejected" | "suspended";
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

type ReviewAction = {
    businessId: string;
    decision: "approved" | "rejected";
} | null;

const pageSize = 25;

export default function AdminBusinessesPage() {
    const router = useRouter();

    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [activeBusinessId, setActiveBusinessId] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [reviewAction, setReviewAction] =
        useState<ReviewAction>(null);

    async function loadBusinesses(
        requestedSearch = "",
        requestedPage = 1,
    ) {
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
          name,
          category,
          description,
          website_url,
          contact_email,
          approval_status,
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
            .eq("approval_status", "pending")
            .order("created_at", { ascending: true })
            .range(from, to);

        if (requestedSearch.trim()) {
            const value = requestedSearch.trim();

            query = query.or(
                `name.ilike.%${value}%,category.ilike.%${value}%`,
            );
        }

        const { data, error, count } = await query;

        if (error) {
            setErrorMessage(error.message);
        } else {
            setBusinesses((data ?? []) as Business[]);
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

            await loadBusinesses("", 1);
        }

        checkAccess();
    }, [router]);

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

        setReviewAction(null);
        await loadBusinesses(search, page);
        setActiveBusinessId("");
    }

    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-10 text-[#17233B] sm:py-16">
            <div className="mx-auto max-w-5xl">
                <Button
                    render={<Link href="/admin" />}
                    nativeButton={false}
                    variant="outline"
                    size="sm"
                >
                    ← Back to admin
                </Button>

                <header className="mt-8">
                    <Badge
                        variant="outline"
                        className="border-[#FF593F]/30 bg-[#FF593F]/10 text-[#FF593F]"
                    >
                        Administration
                    </Badge>

                    <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                        Business approvals
                    </h1>

                    <p className="mt-3 text-[#17233B]/65">
                        Review businesses waiting to join Promotello.
                    </p>
                </header>

                <Card className="mt-8 border-[#17233B]/10">
                    <CardContent className="p-6">
                        <form
                            onSubmit={(event: FormEvent<HTMLFormElement>) => {
                                event.preventDefault();
                                setPage(1);
                                loadBusinesses(search, 1);
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
                        <AlertTitle>No businesses need review</AlertTitle>

                        <AlertDescription>
                            No pending businesses matched your search.
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
                                        className="border-[#17233B]/10 shadow-sm"
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

                                                <Badge className="w-fit bg-amber-100 text-amber-800 hover:bg-amber-100">
                                                    Pending
                                                </Badge>
                                            </div>
                                        </CardHeader>

                                        <CardContent>
                                            {business.description && (
                                                <p className="leading-7 text-[#17233B]/65">
                                                    {business.description}
                                                </p>
                                            )}

                                            <div className="mt-5 space-y-2 text-sm text-[#17233B]/60">
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
                                        loadBusinesses(search, nextPage);
                                    }}
                                >
                                    Previous
                                </Button>
                            ) : (
                                <span />
                            )}

                            <span className="text-sm text-[#17233B]/55">
                                Page {page} of {totalPages}
                            </span>

                            {page < totalPages ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        const nextPage = page + 1;
                                        setPage(nextPage);
                                        loadBusinesses(search, nextPage);
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
        </main>
    );
}