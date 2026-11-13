import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { FiArrowLeft, FiExternalLink } from "react-icons/fi";

import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { nativeSelectClassName } from "@/components/category-select";
import { getCategoryGroups } from "@/lib/categories";
import { timeAgo } from "@/lib/uk-time";
import { createClient } from "@/utils/supabase/server";

import { putInCategory } from "./actions";

export const metadata = { title: "Businesses without a category" };

// Businesses that told us what they are in their own words, because
// the list had nothing for them
// (20261231090000_a_business_we_have_no_category_for.sql).
//
// Nothing is stuck: their page says what they typed, they are in the
// city listing and the search, and they are approved like anybody
// else. This is where they are given a shelf to sit on — and where we
// find out what the list is missing.

type Waiting = {
    id: string;
    name: string;
    slug: string | null;
    said: string;
    approval_status: string;
    created_at: string;
};

function Loading() {
    return (
        <div className="space-y-4">
            <Skeleton className="h-10 w-80 rounded-lg" />
            <Skeleton className="h-32 rounded-xl" />
        </div>
    );
}

async function WaitingList() {
    await connection();

    const supabase = await createClient();
    const [{ data, error }, groups] = await Promise.all([
        supabase.rpc("businesses_without_a_category"),
        getCategoryGroups(supabase).catch(() => []),
    ]);

    const waiting = (data ?? []) as Waiting[];

    return (
        <div className="text-[#17233B]">
            <Button render={<Link href="/admin/businesses" />} nativeButton={false} variant="ghost" size="sm" className="-ml-2">
                <FiArrowLeft aria-hidden="true" />
                Businesses
            </Button>

            <header className="mt-4">
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    Businesses without a category
                </h1>

                <p className="mt-2 max-w-2xl text-[#17233B]/65">
                    They chose &ldquo;Something else&rdquo; and told us what they do. Their
                    page says that, and they are in the city listing and the search —
                    they are only missing from the category pages. Put them on a shelf,
                    or{" "}
                    <Link href="/admin/categories" className="font-medium text-[#FF593F] hover:underline">
                        add the category they need
                    </Link>{" "}
                    first.
                </p>
            </header>

            {error ? (
                <p className="mt-8 text-[#17233B]/65">That didn&apos;t load. Try again.</p>
            ) : waiting.length === 0 ? (
                <p className="mt-8 rounded-xl border border-dashed border-[#17233B]/20 bg-white px-6 py-12 text-center text-[#17233B]/65">
                    Every business is in a category. Nobody has had to describe themselves.
                </p>
            ) : (
                <div className="mt-8 space-y-4">
                    {waiting.map((business) => (
                        <Card key={business.id} className="border-[#17233B]/10">
                            <CardContent>
                                <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                                    <div className="min-w-0">
                                        <h2 className="text-lg font-semibold">{business.name}</h2>

                                        <p className="mt-1 text-sm text-[#17233B]/65">
                                            Said they are{" "}
                                            <span className="font-semibold text-[#17233B]">
                                                &ldquo;{business.said}&rdquo;
                                            </span>{" "}
                                            · {business.approval_status} · joined{" "}
                                            {timeAgo(business.created_at)}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <Button
                                            render={
                                                <Link href={`/admin/businesses/${business.id}`} />
                                            }
                                            nativeButton={false}
                                            variant="outline"
                                            size="sm"
                                        >
                                            Open
                                            <FiExternalLink aria-hidden="true" />
                                        </Button>
                                    </div>
                                </div>

                                <form action={putInCategory} className="mt-4 flex flex-wrap items-end gap-3">
                                    <input type="hidden" name="businessId" value={business.id} />

                                    <div className="min-w-0 flex-1">
                                        <label
                                            htmlFor={`category-${business.id}`}
                                            className="text-sm font-medium"
                                        >
                                            Put them in
                                        </label>

                                        <select
                                            id={`category-${business.id}`}
                                            name="categoryId"
                                            required
                                            defaultValue=""
                                            className={`${nativeSelectClassName} mt-1`}
                                        >
                                            <option value="" disabled>
                                                Choose a category
                                            </option>

                                            {groups.map((group) => (
                                                <optgroup key={group.id} label={group.name}>
                                                    {group.subcategories.map((sub) => (
                                                        <option key={sub.id} value={sub.id}>
                                                            {sub.name}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            ))}
                                        </select>
                                    </div>

                                    <SubmitButton pendingLabel="Saving…">Save</SubmitButton>
                                </form>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function BusinessesWithoutCategoryPage() {
    return (
        <Suspense fallback={<Loading />}>
            <WaitingList />
        </Suspense>
    );
}
