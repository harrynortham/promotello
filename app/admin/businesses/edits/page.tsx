import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { FiArrowLeft, FiExternalLink } from "react-icons/fi";

import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    editFieldLabels,
    editSummary,
    groupByBusiness,
    isImageField,
    shorten,
    type BusinessEdit,
    type BusinessEditField,
} from "@/lib/business-edits";
import { timeAgo } from "@/lib/uk-time";
import { createClient } from "@/utils/supabase/server";

import { markEditsSeen } from "./actions";

export const metadata = { title: "Edited since approval" };

// What businesses changed on their own page after we approved it.
//
// Nothing here is waiting for permission: the edit is already live
// (20261230090000_an_edit_leaves_a_trace.sql). This is the reading of
// it afterwards — a name, a description or a picture that is not the
// one a person said yes to.

type Row = {
    id: string;
    business_id: string;
    field: BusinessEditField;
    was: string | null;
    became: string | null;
    edited_at: string;
    reviewed_at: string | null;
    businesses: { name: string; slug: string | null } | { name: string; slug: string | null }[] | null;
};

type PageProps = { searchParams: Promise<{ seen?: string }> };

function Loading() {
    return (
        <div className="space-y-4">
            <Skeleton className="h-10 w-72 rounded-lg" />
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
        </div>
    );
}

function Side({ label, value, field }: { label: string; value: string | null; field: BusinessEditField }) {
    return (
        <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#17233B]/50">{label}</p>

            {isImageField(field) ? (
                value ? (
                    <a
                        href={value}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex items-center gap-1.5 break-all text-sm font-medium text-[#FF593F] hover:underline"
                    >
                        Open the image
                        <FiExternalLink aria-hidden="true" className="size-3.5" />
                    </a>
                ) : (
                    <p className="mt-1 text-sm text-[#17233B]/65">None</p>
                )
            ) : (
                <p className="mt-1 text-sm leading-6 text-[#17233B]/80">{shorten(value, 400)}</p>
            )}
        </div>
    );
}

async function Edits({ searchParams }: PageProps) {
    await connection();

    const { seen } = await searchParams;
    const showSeen = seen === "1";
    const supabase = await createClient();

    let query = supabase
        .from("business_edits")
        .select("id, business_id, field, was, became, edited_at, reviewed_at, businesses ( name, slug )")
        .order("edited_at", { ascending: false })
        .limit(200);

    if (!showSeen) {
        query = query.is("reviewed_at", null);
    }

    const { data, error } = await query;
    const rows = (data ?? []) as Row[];

    const edits: (BusinessEdit & { businessName: string; businessSlug: string | null })[] = rows.map((row) => {
        const business = Array.isArray(row.businesses) ? row.businesses[0] : row.businesses;

        return {
            id: row.id,
            businessId: row.business_id,
            field: row.field,
            was: row.was,
            became: row.became,
            editedAt: row.edited_at,
            reviewedAt: row.reviewed_at,
            businessName: business?.name ?? "A business",
            businessSlug: business?.slug ?? null,
        };
    });

    const grouped = groupByBusiness(edits);

    return (
        <div className="text-[#17233B]">
            <Button render={<Link href="/admin/businesses" />} nativeButton={false} variant="ghost" size="sm" className="-ml-2">
                <FiArrowLeft aria-hidden="true" />
                Businesses
            </Button>

            <header className="mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Edited since approval</h1>
                    <p className="mt-2 max-w-2xl text-[#17233B]/65">
                        What a business changed on its own page after we said yes to it. Each
                        one is already live — this is reading it, not approving it.
                    </p>
                </div>

                <Button
                    render={<Link href={showSeen ? "/admin/businesses/edits" : "/admin/businesses/edits?seen=1"} />}
                    nativeButton={false}
                    variant="outline"
                    size="sm"
                >
                    {showSeen ? "Only the ones to read" : "Include the ones we've read"}
                </Button>
            </header>

            {error ? (
                <p className="mt-8 text-[#17233B]/65">That didn&apos;t load. Try again.</p>
            ) : grouped.length === 0 ? (
                <p className="mt-8 rounded-xl border border-dashed border-[#17233B]/20 bg-white px-6 py-12 text-center text-[#17233B]/65">
                    {showSeen
                        ? "No business has changed its page since it was approved."
                        : "Nothing to read. Every edit since approval has been looked at."}
                </p>
            ) : (
                <div className="mt-8 space-y-5">
                    {grouped.map((business) => {
                        const first = business.edits[0];
                        const unread = business.edits.filter((edit) => edit.reviewedAt === null);

                        return (
                            <Card key={business.businessId} className="border-[#17233B]/10">
                                <CardContent>
                                    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                                        <div>
                                            <h2 className="text-lg font-semibold">{first.businessName}</h2>
                                            <p className="mt-1 text-sm text-[#17233B]/65">
                                                Changed {editSummary(business.edits.map((edit) => edit.field))} ·{" "}
                                                {timeAgo(business.latest)}
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2">
                                            {first.businessSlug && (
                                                <Button
                                                    render={<Link href={`/businesses/${first.businessSlug}`} target="_blank" />}
                                                    nativeButton={false}
                                                    variant="outline"
                                                    size="sm"
                                                >
                                                    See the page
                                                    <FiExternalLink aria-hidden="true" />
                                                </Button>
                                            )}

                                            {unread.length > 0 && (
                                                <form action={markEditsSeen}>
                                                    <input type="hidden" name="businessId" value={business.businessId} />
                                                    <SubmitButton size="sm" pendingLabel="Marking…">
                                                        Mark as read
                                                    </SubmitButton>
                                                </form>
                                            )}
                                        </div>
                                    </div>

                                    <ul className="mt-5 space-y-4">
                                        {business.edits.map((edit) => (
                                            <li key={edit.id} className="rounded-xl border border-[#17233B]/10 p-4">
                                                <p className="text-sm font-semibold">
                                                    {editFieldLabels[edit.field]}
                                                    <span className="ml-2 font-normal text-[#17233B]/55">
                                                        {timeAgo(edit.editedAt)}
                                                        {edit.reviewedAt && " · read"}
                                                    </span>
                                                </p>

                                                <div className="mt-3 flex flex-col gap-4 sm:flex-row">
                                                    <Side label="Approved" value={edit.was} field={edit.field} />
                                                    <Side label="Now live" value={edit.became} field={edit.field} />
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default function BusinessEditsPage(props: PageProps) {
    return (
        <Suspense fallback={<Loading />}>
            <Edits {...props} />
        </Suspense>
    );
}
