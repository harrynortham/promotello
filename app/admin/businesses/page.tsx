"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

    async function loadBusinesses(
        requestedSearch = "",
        requestedPage = 1,
    ) {
        setIsLoading(true);

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
            const searchValue = requestedSearch.trim();

            query = query.or(
                `name.ilike.%${searchValue}%,category.ilike.%${searchValue}%`,
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

        await loadBusinesses(search, page);
        setActiveBusinessId("");
    }

    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-10 text-[#17233B] sm:py-16">
            <div className="mx-auto max-w-5xl">
                <Link
                    href="/admin"
                    className="text-sm font-semibold text-[#FF593F]"
                >
                    ← Back to admin
                </Link>

                <header className="mt-8">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                        Administration
                    </p>

                    <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                        Business approvals
                    </h1>

                    <p className="mt-3 text-[#17233B]/65">
                        Review businesses waiting to join Promotello.
                    </p>
                </header>

                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        setPage(1);
                        loadBusinesses(search, 1);
                    }}
                    className="mt-8 flex flex-col gap-3 sm:flex-row"
                >
                    <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search by business name or category"
                        className="flex-1 rounded-xl border border-[#17233B]/15 bg-white px-4 py-3 text-sm outline-none focus:border-[#FF593F]"
                    />

                    <button
                        type="submit"
                        className="rounded-xl bg-[#FF593F] px-5 py-3 text-sm font-semibold transition hover:bg-[#E94D36]"
                    >
                        Search
                    </button>
                </form>

                {errorMessage && (
                    <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
                        {errorMessage}
                    </div>
                )}

                {isLoading ? (
                    <div className="mt-10 h-48 animate-pulse rounded-3xl bg-white" />
                ) : businesses.length === 0 ? (
                    <section className="mt-10 rounded-3xl bg-white p-10 text-center shadow-sm">
                        <h2 className="text-2xl font-semibold">
                            No businesses need review
                        </h2>

                        <p className="mt-3 text-[#17233B]/65">
                            No pending businesses matched your search.
                        </p>
                    </section>
                ) : (
                    <>
                        <section className="mt-10 space-y-6">
                            {businesses.map((business) => {
                                const location = business.business_locations?.[0];

                                return (
                                    <article
                                        key={business.id}
                                        className="rounded-3xl bg-white p-6 shadow-sm sm:p-8"
                                    >
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-[#FF593F]">
                                                    {business.category}
                                                </p>

                                                <h2 className="mt-1 text-2xl font-semibold">
                                                    {business.name}
                                                </h2>
                                            </div>

                                            <span className="w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                                                Pending
                                            </span>
                                        </div>

                                        {business.description && (
                                            <p className="mt-5 leading-7 text-[#17233B]/65">
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

                                            {location && (
                                                <p>
                                                    Location: {location.address_line_1},{" "}
                                                    {location.city}
                                                    {location.region ? `, ${location.region}` : ""}
                                                    {location.postal_code
                                                        ? `, ${location.postal_code}`
                                                        : ""}
                                                    {location.country_code
                                                        ? `, ${location.country_code}`
                                                        : ""}
                                                </p>
                                            )}
                                        </div>

                                        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                                            <button
                                                type="button"
                                                disabled={activeBusinessId === business.id}
                                                onClick={() =>
                                                    reviewBusiness(business.id, "approved")
                                                }
                                                className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                Approve business
                                            </button>

                                            <button
                                                type="button"
                                                disabled={activeBusinessId === business.id}
                                                onClick={() =>
                                                    reviewBusiness(business.id, "rejected")
                                                }
                                                className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                Reject business
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}
                        </section>

                        <nav className="mt-8 flex items-center justify-between">
                            {page > 1 ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const nextPage = page - 1;
                                        setPage(nextPage);
                                        loadBusinesses(search, nextPage);
                                    }}
                                    className="rounded-xl border border-[#17233B]/15 px-4 py-2 text-sm font-semibold hover:bg-[#17233B]/5"
                                >
                                    Previous
                                </button>
                            ) : (
                                <span />
                            )}

                            <span className="text-sm text-[#17233B]/55">
                                Page {page} of {totalPages}
                            </span>

                            {page < totalPages ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const nextPage = page + 1;
                                        setPage(nextPage);
                                        loadBusinesses(search, nextPage);
                                    }}
                                    className="rounded-xl border border-[#17233B]/15 px-4 py-2 text-sm font-semibold hover:bg-[#17233B]/5"
                                >
                                    Next
                                </button>
                            ) : (
                                <span />
                            )}
                        </nav>
                    </>
                )}
            </div>
        </main>
    );
}