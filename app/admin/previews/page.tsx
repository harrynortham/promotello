import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { FiChevronRight, FiPlus } from "react-icons/fi";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/utils/supabase/server";
import { awaitingSend, claimedState, formatDate, previewColumns, previewPath, statusLabels, type PreviewRow } from "./preview-shared";

type PageProps = { searchParams: Promise<{ page?: string }> };

const pageSize = 25;

async function PreviewsContent({ searchParams }: PageProps) {
    await connection();

    const params = await searchParams;
    const requested = Number(params.page ?? "1");
    const page = Number.isInteger(requested) && requested > 0 ? requested : 1;

    const from = (page - 1) * pageSize;
    const supabase = await createClient();

    const [{ data: rows, count }, { data: claimedRows, count: claimedCount }] = await Promise.all([
        supabase
            .from("business_previews")
            .select(previewColumns, { count: "exact" })
            .is("claimed_at", null)
            .order("created_at", { ascending: false })
            .range(from, from + pageSize - 1),
        supabase
            .from("business_previews")
            .select(previewColumns, { count: "exact" })
            .not("claimed_at", "is", null)
            .order("claimed_at", { ascending: false })
            .limit(pageSize),
    ]);

    const previews = (rows ?? []) as unknown as PreviewRow[];
    const claimed = (claimedRows ?? []) as unknown as PreviewRow[];
    const unsent = claimed.filter(awaitingSend).length;
    const total = count ?? 0;
    const claimedTotal = claimedCount ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return (
        <div className="space-y-8">
            <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Previews</h1>
                    <p className="mt-3 max-w-2xl text-[#17233B]/65">
                        Build a business&apos;s listing before they sign up, then send them a private link to
                        see their page, loyalty card and poster, and claim it. Previews stay hidden from
                        customers. After a claim, approve the business as usual.
                    </p>
                </div>

                <Button
                    render={<Link href="/admin/previews/new" />}
                    nativeButton={false}
                    size="lg"
                    className="shrink-0"
                >
                    <FiPlus aria-hidden="true" />
                    New preview
                </Button>
            </header>

            <Card className="border-[#17233B]/10">
                <CardHeader>
                    <CardTitle className="text-lg">
                        {total === 1 ? "1 preview to send" : `${total} previews to send`}
                    </CardTitle>
                    <p className="text-sm text-[#17233B]/70">
                        Built and not claimed yet. Claimed ones move to the list below.
                    </p>
                </CardHeader>
                <CardContent>
                    {previews.length === 0 ? (
                        <p className="text-sm text-[#17233B]/70">
                            Nothing waiting to go out.{" "}
                            <Link
                                href="/admin/previews/new"
                                className="font-medium text-[#FF593F] underline underline-offset-4"
                            >
                                Build the first one
                            </Link>
                            .
                        </p>
                    ) : (
                        <ul className="divide-y divide-[#17233B]/5">
                            {previews.map((preview) => (
                                <li key={preview.business_id}>
                                    <Link
                                        href={previewPath(preview.business_id)}
                                        className="flex items-center gap-4 py-4 transition-colors hover:bg-[#FFF8F0]"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium">
                                                {preview.businesses?.name}
                                                {preview.contact_name && (
                                                    <span className="font-normal text-[#17233B]/70">
                                                        {" "}
                                                        · for {preview.contact_name}
                                                    </span>
                                                )}
                                            </p>

                                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#17233B]/70">
                                                <span>Built {formatDate(preview.created_at)}</span>

                                                <Badge variant={preview.status === "to_send" ? "default" : "outline"}>
                                                    {statusLabels[preview.status] ?? preview.status}
                                                </Badge>

                                                {preview.view_count > 0 ? (
                                                    <Badge className="bg-[#FF593F]/10 text-[#B93A26]">
                                                        Opened {preview.view_count}×
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline">Not opened</Badge>
                                                )}
                                            </div>
                                        </div>

                                        <FiChevronRight aria-hidden="true" className="size-5 shrink-0 text-[#17233B]/40" />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}

                    {totalPages > 1 && (
                        <nav className="mt-6 flex items-center justify-between border-t border-[#17233B]/5 pt-5">
                            {page > 1 ? (
                                <Button
                                    render={<Link href={`/admin/previews?page=${page - 1}`} />}
                                    nativeButton={false}
                                    variant="outline"
                                    size="sm"
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
                                    render={<Link href={`/admin/previews?page=${page + 1}`} />}
                                    nativeButton={false}
                                    variant="outline"
                                    size="sm"
                                >
                                    Next
                                </Button>
                            ) : (
                                <span />
                            )}
                        </nav>
                    )}
                </CardContent>
            </Card>

            {claimedTotal > 0 && (
                <Card className="border-[#17233B]/10">
                    <CardHeader>
                        <CardTitle className="flex flex-wrap items-center gap-3 text-lg">
                            {claimedTotal === 1 ? "1 claimed" : `${claimedTotal} claimed`}

                            {/* Claimed and never sent: invisible to customers,
                                and waiting on them rather than on us. */}
                            {unsent > 0 && (
                                <Badge variant="outline" className="border-[#FF593F]/40 bg-[#FF593F]/5 font-normal text-[#FF593F]">
                                    {unsent === 1 ? "1 not sent" : `${unsent} not sent`}
                                </Badge>
                            )}
                        </CardTitle>
                        <p className="text-sm text-[#17233B]/70">
                            Outreach is done with these. What&apos;s left is whether they went live.
                        </p>
                    </CardHeader>

                    <CardContent>
                        <ul className="divide-y divide-[#17233B]/5">
                            {claimed.map((preview) => {
                                const state = claimedState(preview);

                                return (
                                    <li key={preview.business_id}>
                                        <Link
                                            href={previewPath(preview.business_id)}
                                            className="flex items-center gap-4 py-4 transition-colors hover:bg-[#FFF8F0]"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className={`font-medium ${state.tone === "gone" ? "text-[#17233B]/55" : ""}`}>
                                                    {preview.businesses?.name}
                                                    {preview.contact_name && (
                                                        <span className="font-normal text-[#17233B]/70">
                                                            {" "}
                                                            · for {preview.contact_name}
                                                        </span>
                                                    )}
                                                </p>

                                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#17233B]/70">
                                                    <span>Claimed {formatDate(preview.claimed_at!)}</span>

                                                    <Badge
                                                        variant="outline"
                                                        className={
                                                            state.tone === "live"
                                                                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                                                : state.tone === "them"
                                                                    ? "border-[#FF593F]/40 text-[#FF593F]"
                                                                    : state.tone === "us"
                                                                        ? "border-amber-300 bg-amber-50 text-amber-800"
                                                                        : "text-[#17233B]/55"
                                                        }
                                                    >
                                                        {state.label}
                                                    </Badge>
                                                </div>
                                            </div>

                                            <FiChevronRight aria-hidden="true" className="size-5 shrink-0 text-[#17233B]/40" />
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>

                        {claimedTotal > claimed.length && (
                            <p className="mt-5 border-t border-[#17233B]/5 pt-5 text-sm text-[#17233B]/70">
                                Showing the {claimed.length} most recent.
                            </p>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export default function AdminPreviewsPage(props: PageProps) {
    return (
        <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
            <PreviewsContent {...props} />
        </Suspense>
    );
}
