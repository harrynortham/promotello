import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FiArrowLeft } from "react-icons/fi";

import { CategorySelect } from "@/components/category-select";
import { LocationFields } from "@/components/location-fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { SubmitButton } from "@/components/submit-button";
import { getCityOptions } from "@/lib/locations";
import { createClient } from "@/utils/supabase/server";
import { addLead } from "../actions";

export const metadata: Metadata = { title: "Add a lead", robots: { index: false } };

// Written down by hand. There was an importer here that asked Google
// what was trading on a street, and the half of it worth having — the
// address — was the half the terms would not let us keep. What it saved
// was a name and a website, and the address was typed afterwards
// anyway, so this types the name too and leaves nothing to explain.
//
// Only the name is required. Everything else can arrive later: the
// crawler reads their site for an email and an address, and the
// Companies House check decides whether they may be emailed at all.

async function AddLeadContent({ error }: { error?: string }) {
    await connection();

    const supabase = await createClient();
    const { data: isAdmin } = await supabase.rpc("is_platform_admin");
    if (!isAdmin) redirect("/admin");

    const cities = await getCityOptions({ includeNotLive: true });

    return (
        <div className="space-y-8">
            <div>
                <Button render={<Link href="/admin/sales" />} nativeButton={false} variant="ghost" size="sm">
                    <FiArrowLeft aria-hidden="true" />
                    The pipeline
                </Button>

                <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Add a lead</h1>

                <p className="mt-3 max-w-2xl text-[#17233B]/65">
                    Only the name is needed. Give it a website and the crawler can find their
                    email and the address they publish; the rest can wait.
                </p>
            </div>

            {error && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                    {error === "no_name"
                        ? "Give the business a name."
                        : error === "duplicate"
                            ? "That business is already on the list."
                            : error}
                </p>
            )}

            <Card className="border-[#17233B]/10">
                <CardContent className="p-6 sm:p-8">
                    <form action={addLead} className="space-y-8">
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="name">Business name</Label>
                                <Input id="name" name="name" required maxLength={120} placeholder="e.g. Little Loaf" />
                            </div>

                            <div className="grid gap-5 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="website">Website</Label>
                                    <Input id="website" name="website" type="url" placeholder="https://" />
                                    <p className="text-xs text-[#17233B]/60">
                                        What the crawler reads for an email and an address.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="categoryId">Category</Label>
                                    <CategorySelect id="categoryId" name="categoryId" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-5 border-t border-[#17233B]/10 pt-6">
                            <h2 className="font-semibold">Where they are</h2>

                            <div className="space-y-2">
                                <Label htmlFor="addressLine1">Street address</Label>
                                <Input
                                    id="addressLine1"
                                    name="addressLine1"
                                    maxLength={200}
                                    placeholder="e.g. 214 Gloucester Road"
                                />
                            </div>

                            <LocationFields cities={cities} waitlist={false} />

                            <p className="text-xs text-[#17233B]/60">
                                The postcode fixes where they are — it is looked up for the
                                coordinates and the ward, and it goes on the envelope.
                            </p>
                        </div>

                        <div className="space-y-5 border-t border-[#17233B]/10 pt-6">
                            <h2 className="font-semibold">How to reach them</h2>
                            <p className="text-sm leading-6 text-[#17233B]/65">
                                All optional. Leave the email out and the crawler looks for one.
                            </p>

                            <div className="space-y-2">
                                <Label htmlFor="contactName">Who to write to</Label>
                                <Input id="contactName" name="contactName" maxLength={80} placeholder="Sam" />
                                <p className="text-xs text-[#17233B]/60">
                                    Their first name is the first line of the email. Left blank it
                                    says &ldquo;Hi there&rdquo;.
                                </p>
                            </div>

                            <div className="grid gap-5 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" name="email" type="email" maxLength={160} placeholder="hello@theirshop.com" />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone</Label>
                                    <Input id="phone" name="phone" maxLength={40} placeholder="0117 123 4567" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="instagramHandle">Instagram</Label>
                                <Input
                                    id="instagramHandle"
                                    name="instagramHandle"
                                    maxLength={120}
                                    placeholder="@theirshop or a profile link"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3 border-t border-[#17233B]/10 pt-6">
                            {/* Disabled while it saves. Without it there was
                                no sign anything was happening, so it was
                                pressed twice and the business went in twice
                                (20270207090000, which stops the race this
                                cannot). */}
                            <SubmitButton pendingLabel="Adding…">Add to the pipeline</SubmitButton>
                            <Button render={<Link href="/admin/sales" />} nativeButton={false} variant="ghost">
                                Cancel
                            </Button>
                        </div>

                        <p className="text-xs leading-5 text-[#17233B]/60">
                            Nothing is sent to anybody by adding them. A lead can only be
                            emailed once Companies House says it is a limited company.
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

export default async function AddLeadPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string }>;
}) {
    const { error } = await searchParams;

    return (
        <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
            <AddLeadContent error={error} />
        </Suspense>
    );
}
