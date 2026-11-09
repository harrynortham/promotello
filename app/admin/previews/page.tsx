import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { FiChevronRight } from "react-icons/fi";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getCityOptions } from "@/lib/locations";
import { createClient } from "@/utils/supabase/server";
import { CreatePreviewForm } from "./create-preview-form";
import { formatDate, previewColumns, previewPath, statusLabels, type PreviewRow } from "./preview-shared";

async function PreviewsContent() {
    await connection();

    const supabase = await createClient();

    const [{ data: rows }, cities] = await Promise.all([
        supabase
            .from("business_previews")
            .select(previewColumns)
            .order("created_at", { ascending: false }),
        getCityOptions({ includeNotLive: true }),
    ]);

    const previews = (rows ?? []) as unknown as PreviewRow[];

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Previews</h1>
                <p className="mt-3 max-w-2xl text-[#17233B]/65">
                    Build a business&apos;s listing before they sign up, then send them a private link to see
                    their page, loyalty card and poster, and claim it. Previews stay hidden from customers.
                    After a claim, approve the business as usual.
                </p>
            </header>

            <Card className="border-[#17233B]/10">
                <CardHeader>
                    <CardTitle className="text-lg">Your previews</CardTitle>
                </CardHeader>
                <CardContent>
                    {previews.length === 0 ? (
                        <p className="text-sm text-[#17233B]/70">No previews yet. Create one below.</p>
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

                                                {preview.claimed_at ? (
                                                    <Badge className="bg-emerald-100 text-emerald-800">
                                                        Claimed {formatDate(preview.claimed_at)}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant={preview.status === "to_send" ? "default" : "outline"}>
                                                        {statusLabels[preview.status] ?? preview.status}
                                                    </Badge>
                                                )}

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
                </CardContent>
            </Card>

            <Card className="border-[#17233B]/10">
                <CardHeader>
                    <CardTitle className="text-lg">New preview</CardTitle>
                    <p className="text-sm text-[#17233B]/70">
                        Use their real address so the poster and page are right. You&apos;ll be the owner until they claim it.
                    </p>
                </CardHeader>
                <CardContent>
                    <CreatePreviewForm cities={cities} />
                </CardContent>
            </Card>
        </div>
    );
}

export default function AdminPreviewsPage() {
    return (
        <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
            <PreviewsContent />
        </Suspense>
    );
}
