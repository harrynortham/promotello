import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { FiChevronRight } from "react-icons/fi";

import { CategorySelect } from "@/components/category-select";
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
import { createClient } from "@/utils/supabase/server";
import { createPreview } from "./actions";
import { formatDate, previewColumns, previewPath, statusLabels, type PreviewRow } from "./preview-shared";

type PageProps = { searchParams: Promise<{ created?: string; error?: string }> };

async function PreviewsContent({ searchParams }: PageProps) {
    await connection();

    const { created, error } = await searchParams;
    const supabase = await createClient();

    const [{ data: rows }, cities] = await Promise.all([
        supabase
            .from("business_previews")
            .select(previewColumns)
            .order("created_at", { ascending: false }),
        getCityOptions({ includeNotLive: true }),
    ]);

    const previews = (rows ?? []) as unknown as PreviewRow[];
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
                            Open it to add their logo and a cover photo, copy the message and send it.
                        </p>

                        <Button
                            render={<Link href={previewPath(justCreated.business_id)} />}
                            nativeButton={false}
                            size="sm"
                            className="mt-3"
                        >
                            Open {justCreated.businesses?.name}
                            <FiChevronRight aria-hidden="true" />
                        </Button>
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
                                <div className="space-y-2">
                                    <Label htmlFor="contactEmail">Where you&apos;ll write (optional)</Label>
                                    <Input
                                        id="contactEmail"
                                        name="contactEmail"
                                        type="email"
                                        maxLength={160}
                                        placeholder="hello@theirshop.com"
                                    />
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
