import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { FiArrowLeft } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getCityOptions } from "@/lib/locations";
import { createClient } from "@/utils/supabase/server";
import { CreatePreviewForm, type PreviewDefaults } from "../create-preview-form";

// A page of its own, because building a preview is a sitting rather than
// something to do at the bottom of a list.

// Everything the lead already knows, in the names this form uses. The
// address is the point of it — it is the slowest part to type and the
// easiest to get wrong from a page open in another tab — but the name,
// the category, the site and the email are all sitting there too.
async function defaultsFromLead(leadId: string): Promise<PreviewDefaults | undefined> {
    const supabase = await createClient();

    const { data: lead } = await supabase
        .from("leads")
        .select(
            "id, name, website, email, instagram_handle, address_line_1, postcode, cities ( name ), areas ( name ), categories ( id, parent_id )",
        )
        .eq("id", leadId)
        .maybeSingle();

    if (!lead) return undefined;

    const one = <T,>(value: T | T[] | null | undefined): T | undefined =>
        Array.isArray(value) ? value[0] : (value ?? undefined);

    const category = one(
        lead.categories as { id: string; parent_id: string | null } | { id: string; parent_id: string | null }[] | null,
    );

    return {
        leadId: lead.id,
        businessName: lead.name,
        // Ids, not slugs: the select's options are ids, and a value that
        // matches none of them does not leave it empty — the browser
        // picks the first real option, so a lead filed under one
        // category arrived at the form showing another.
        //
        // Only a sub-category is an option. A top-level group is not, so
        // it is left unset and the placeholder stands, which asks for a
        // choice rather than inventing one.
        category: category?.parent_id ? category.id : undefined,
        website: lead.website,
        contactEmail: lead.email,
        instagramHandle: lead.instagram_handle,
        addressLine1: lead.address_line_1,
        city: one(lead.cities as { name: string } | { name: string }[] | null)?.name,
        area: one(lead.areas as { name: string } | { name: string }[] | null)?.name,
        postalCode: lead.postcode,
    };
}

async function NewPreviewContent({ leadId }: { leadId?: string }) {
    await connection();

    const cities = await getCityOptions({ includeNotLive: true });
    const defaults = leadId ? await defaultsFromLead(leadId) : undefined;

    return (
        <div className="space-y-8">
            <div>
                <Button render={<Link href="/admin/previews" />} nativeButton={false} variant="ghost" size="sm">
                    <FiArrowLeft aria-hidden="true" />
                    All previews
                </Button>

                <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">New preview</h1>

                <p className="mt-3 max-w-2xl text-[#17233B]/65">
                    Use their real address so the poster and the page are right. You&apos;ll be the owner
                    until they claim it, and they can change everything afterwards.
                </p>
            </div>

            <Card className="border-[#17233B]/10">
                <CardContent className="p-6 sm:p-8">
                    <CreatePreviewForm cities={cities} defaults={defaults} />
                </CardContent>
            </Card>
        </div>
    );
}

export default async function NewPreviewPage({
    searchParams,
}: {
    searchParams: Promise<{ lead?: string }>;
}) {
    const { lead } = await searchParams;

    return (
        <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
            <NewPreviewContent leadId={lead} />
        </Suspense>
    );
}
