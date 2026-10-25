import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { FiExternalLink } from "react-icons/fi";

import { CategorySelect } from "@/components/category-select";
import { CopyButton } from "@/components/copy-button";
import { LocationFields } from "@/components/location-fields";
import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { getCityOptions } from "@/lib/locations";
import { absoluteUrl } from "@/lib/site";
import { createClient } from "@/utils/supabase/server";
import { createPreview, deletePreview } from "./actions";

type PageProps = { searchParams: Promise<{ created?: string; error?: string }> };

type PreviewRow = {
    business_id: string;
    token: string;
    contact_name: string | null;
    created_at: string;
    view_count: number;
    last_viewed_at: string | null;
    claimed_at: string | null;
    businesses: { name: string; approval_status: string } | null;
};

function formatDate(value: string) {
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" }).format(new Date(value));
}

// A message to send with the link, by email or a DM.
function outreachMessage(preview: PreviewRow, sender: string) {
    const name = preview.businesses?.name ?? "your business";
    const url = absoluteUrl(`/business/preview/${preview.token}`);

    return [
        `Hi ${preview.contact_name || "there"},`,
        "",
        `I run Promotello, a loyalty card and offers app for independent businesses in Bristol. I've set up a preview of ${name} so you can see how it would look: your page, a digital loyalty card and a QR poster for your window.`,
        "",
        url,
        "",
        "It's free to claim, and the Pro plan is free for 30 days. If it's not for you, just ignore this.",
        "",
        sender,
    ].join("\n");
}

function Status({ preview }: { preview: PreviewRow }) {
    if (preview.claimed_at) {
        return <Badge className="bg-emerald-100 text-emerald-800">Claimed {formatDate(preview.claimed_at)}</Badge>;
    }

    if (preview.view_count > 0 && preview.last_viewed_at) {
        return (
            <Badge className="bg-[#FF593F]/10 text-[#B93A26]">
                Viewed {preview.view_count}× · last {formatDate(preview.last_viewed_at)}
            </Badge>
        );
    }

    return <Badge variant="outline">Not opened yet</Badge>;
}

async function PreviewsContent({ searchParams }: PageProps) {
    await connection();

    const { created, error } = await searchParams;
    const supabase = await createClient();

    const [{ data: rows }, cities, { data: userData }] = await Promise.all([
        supabase
            .from("business_previews")
            .select("business_id, token, contact_name, created_at, view_count, last_viewed_at, claimed_at, businesses ( name, approval_status )")
            .order("created_at", { ascending: false }),
        getCityOptions({ includeNotLive: true }),
        supabase.auth.getUser(),
    ]);

    const previews = (rows ?? []) as unknown as PreviewRow[];
    const sender = userData.user?.user_metadata?.full_name || "The Promotello team";
    const justCreated = previews.find((preview) => preview.business_id === created);

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

            {error && (
                <Alert variant="destructive">
                    <AlertTitle>Not created</AlertTitle>
                    <AlertDescription>{error === "sample" ? "Add a sample offer and loyalty reward." : error}</AlertDescription>
                </Alert>
            )}

            {justCreated && (
                <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
                    <AlertTitle>Preview ready for {justCreated.businesses?.name}</AlertTitle>
                    <AlertDescription>
                        <p>
                            Add a logo and description from the business&apos;s dashboard to make it look its best, then
                            send the link.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <CopyButton text={absoluteUrl(`/business/preview/${justCreated.token}`)} label="Copy link" />
                            <CopyButton text={outreachMessage(justCreated, sender)} label="Copy message" />
                            <Button render={<Link href={`/business/${justCreated.business_id}/edit`} />} nativeButton={false} variant="outline" size="sm">
                                Add logo and details
                            </Button>
                        </div>
                    </AlertDescription>
                </Alert>
            )}

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
                                <li key={preview.business_id} className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="min-w-0">
                                        <p className="font-medium">
                                            {preview.businesses?.name}
                                            {preview.contact_name && (
                                                <span className="font-normal text-[#17233B]/70"> · for {preview.contact_name}</span>
                                            )}
                                        </p>
                                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#17233B]/70">
                                            <span>Created {formatDate(preview.created_at)}</span>
                                            <Status preview={preview} />
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <CopyButton text={absoluteUrl(`/business/preview/${preview.token}`)} label="Link" />
                                        <CopyButton text={outreachMessage(preview, sender)} label="Message" />
                                        <Button
                                            render={<a href={`/business/preview/${preview.token}`} target="_blank" rel="noopener noreferrer" />}
                                            nativeButton={false}
                                            variant="outline"
                                            size="sm"
                                        >
                                            <FiExternalLink aria-hidden="true" />
                                            Open
                                        </Button>
                                        {!preview.claimed_at && (
                                            <>
                                                <Button render={<Link href={`/business/${preview.business_id}/edit`} />} nativeButton={false} variant="outline" size="sm">
                                                    Edit
                                                </Button>
                                                <form action={deletePreview}>
                                                    <input type="hidden" name="businessId" value={preview.business_id} />
                                                    <SubmitButton variant="outline" pendingLabel="Deleting…" className="h-8 text-red-700">
                                                        Delete
                                                    </SubmitButton>
                                                </form>
                                            </>
                                        )}
                                    </div>
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
                    <form action={createPreview} className="grid gap-5 lg:grid-cols-2">
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="businessName">Business name</Label>
                                <Input id="businessName" name="businessName" required minLength={2} maxLength={120} placeholder="e.g. Little Loaf" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category">Category</Label>
                                <CategorySelect id="category" name="category" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description (optional)</Label>
                                <Input id="description" name="description" maxLength={300} placeholder="A neighbourhood bakery on Gloucester Road" />
                            </div>
                            <div className="grid gap-5 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="website">Website (optional)</Label>
                                    <Input id="website" name="website" type="url" placeholder="https://" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contactName">Owner&apos;s first name (optional)</Label>
                                    <Input id="contactName" name="contactName" maxLength={80} placeholder="Sam" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="addressLine1">Street address</Label>
                                <Input id="addressLine1" name="addressLine1" required minLength={2} maxLength={200} placeholder="e.g. 21 Gloucester Road" />
                            </div>
                            <LocationFields cities={cities} />
                            <div className="grid gap-5 sm:grid-cols-[1fr_1fr_6rem]">
                                <div className="space-y-2">
                                    <Label htmlFor="sampleOffer">Sample offer</Label>
                                    <Input id="sampleOffer" name="sampleOffer" required minLength={3} maxLength={80} placeholder="Free pastry with any coffee" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="sampleReward">Loyalty reward</Label>
                                    <Input id="sampleReward" name="sampleReward" required minLength={3} maxLength={60} placeholder="a free coffee" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="sampleStamps">Stamps</Label>
                                    <Input id="sampleStamps" name="sampleStamps" type="number" min={3} max={20} defaultValue={9} />
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-2">
                            <SubmitButton pendingLabel="Creating…">Create preview</SubmitButton>
                        </div>
                    </form>
                </CardContent>
            </Card>
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
