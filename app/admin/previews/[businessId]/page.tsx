import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { FiArrowLeft, FiExternalLink } from "react-icons/fi";

import { BusinessImageDialog } from "@/components/business-image-dialog";
import { CopyButton } from "@/components/copy-button";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { FOUNDING_MEMBER_LIMIT, countFoundingMembers } from "@/lib/billing";
import { absoluteUrl } from "@/lib/site";
import { createClient } from "@/utils/supabase/server";
import { deletePreview, savePreviewNotes, setPreviewStatus } from "../actions";
import {
    formatDate,
    nextStatuses,
    outreachMessage,
    outreachSubject,
    previewColumns,
    statusLabels,
    type PreviewRow,
} from "../preview-shared";

type PageProps = { params: Promise<{ businessId: string }> };

async function PreviewDetail({ params }: PageProps) {
    await connection();

    const { businessId } = await params;
    const supabase = await createClient();

    const [{ data }, foundingTaken] = await Promise.all([
        supabase.from("business_previews").select(previewColumns).eq("business_id", businessId).maybeSingle(),
        countFoundingMembers().catch(() => null),
    ]);

    const preview = data as unknown as PreviewRow | null;

    if (!preview) {
        notFound();
    }

    const name = preview.businesses?.name ?? "This business";
    const location = preview.businesses?.business_locations?.[0];
    const where = location?.cities?.name ?? location?.city ?? null;
    const link = absoluteUrl(`/business/preview/${preview.token}`);
    const placesLeft = foundingTaken === null ? null : Math.max(FOUNDING_MEMBER_LIMIT - foundingTaken, 0);

    return (
        <div className="space-y-8">
            <div>
                <Button render={<Link href="/admin/previews" />} nativeButton={false} variant="ghost" size="sm">
                    <FiArrowLeft aria-hidden="true" />
                    All previews
                </Button>

                <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{name}</h1>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[#17233B]/70">
                    {preview.contact_name && <span>for {preview.contact_name}</span>}
                    {preview.contact_email && <span>· {preview.contact_email}</span>}
                    {where && <span>· {where}</span>}
                    <span>· built {formatDate(preview.created_at)}</span>
                </div>
            </div>

            <Card className="border-[#17233B]/10">
                <CardHeader>
                    <CardTitle className="text-lg">Where this has got to</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="flex flex-wrap items-center gap-2">
                        {preview.claimed_at ? (
                            <Badge className="bg-emerald-100 text-emerald-800">
                                Claimed {formatDate(preview.claimed_at)}
                            </Badge>
                        ) : (
                            <Badge variant={preview.status === "to_send" ? "default" : "outline"}>
                                {statusLabels[preview.status] ?? preview.status}
                                {preview.contacted_at && ` ${formatDate(preview.contacted_at)}`}
                            </Badge>
                        )}

                        {preview.view_count > 0 && preview.last_viewed_at ? (
                            <Badge className="bg-[#FF593F]/10 text-[#B93A26]">
                                Opened {preview.view_count}× · last {formatDate(preview.last_viewed_at)}
                            </Badge>
                        ) : (
                            <Badge variant="outline">Not opened yet</Badge>
                        )}
                    </div>

                    {!preview.claimed_at && (
                        <div className="flex flex-wrap gap-2">
                            {(nextStatuses[preview.status] ?? []).map((option) => (
                                <form key={option.value} action={setPreviewStatus}>
                                    <input type="hidden" name="businessId" value={preview.business_id} />
                                    <input type="hidden" name="status" value={option.value} />
                                    <SubmitButton variant="outline" pendingLabel="Saving…" className="h-9">
                                        {option.label}
                                    </SubmitButton>
                                </form>
                            ))}
                        </div>
                    )}

                    <form action={savePreviewNotes} className="space-y-2">
                        <input type="hidden" name="businessId" value={preview.business_id} />
                        <label htmlFor="notes" className="text-sm font-medium text-[#17233B]">
                            Notes
                        </label>
                        <Textarea
                            id="notes"
                            name="notes"
                            rows={3}
                            maxLength={1000}
                            defaultValue={preview.notes ?? ""}
                            placeholder="Said come back in January…"
                        />
                        <SubmitButton variant="outline" pendingLabel="Saving…" className="h-9">
                            Save notes
                        </SubmitButton>
                    </form>
                </CardContent>
            </Card>

            <Card className="border-[#17233B]/10">
                <CardHeader>
                    <CardTitle className="text-lg">Send it</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-[#17233B]/70">
                        Written for {preview.contact_name || "whoever opens it"}, with the link and the founding
                        price in it. Mark it emailed once it has gone, so it does not go twice.
                    </p>

                    <div className="flex flex-wrap gap-2">
                        <CopyButton text={outreachSubject(preview)} label="Copy subject" />
                        <CopyButton text={outreachMessage(preview, placesLeft)} label="Copy message" />
                        <CopyButton text={link} label="Copy link" />
                        <Button
                            render={
                                <a href={`/business/preview/${preview.token}`} target="_blank" rel="noopener noreferrer" />
                            }
                            nativeButton={false}
                            variant="outline"
                            size="sm"
                        >
                            <FiExternalLink aria-hidden="true" />
                            Open the preview
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-[#17233B]/10">
                <CardHeader>
                    <CardTitle className="text-lg">How it looks</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    <p className="text-sm text-[#17233B]/70">
                        Their own logo and a photo of the place make the preview look like them rather than a template.
                    </p>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <BusinessImageDialog
                            kind="logo"
                            businessId={preview.business_id}
                            businessName={name}
                            imageUrl={preview.businesses?.logo_url ?? null}
                        />
                        <BusinessImageDialog
                            kind="cover"
                            businessId={preview.business_id}
                            businessName={name}
                            imageUrl={preview.businesses?.cover_image_url ?? null}
                        />
                    </div>

                    <Button
                        render={<Link href={`/business/${preview.business_id}/edit`} />}
                        nativeButton={false}
                        variant="outline"
                        size="sm"
                    >
                        Edit the business details
                    </Button>
                </CardContent>
            </Card>

            {!preview.claimed_at && (
                <Card className="border-red-200">
                    <CardHeader>
                        <CardTitle className="text-lg">Delete this preview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-[#17233B]/70">
                            Removes the preview and the business built for it. Only possible until someone claims it.
                        </p>

                        <form action={deletePreview}>
                            <input type="hidden" name="businessId" value={preview.business_id} />
                            <SubmitButton variant="outline" pendingLabel="Deleting…" className="h-9 text-red-700">
                                Delete preview
                            </SubmitButton>
                        </form>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export default function AdminPreviewPage(props: PageProps) {
    return (
        <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
            <PreviewDetail {...props} />
        </Suspense>
    );
}
