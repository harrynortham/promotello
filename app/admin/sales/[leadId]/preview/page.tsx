import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { FiArrowLeft } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/utils/supabase/server";
import { BuildPreviewForm } from "../build-preview-form";

type PageProps = { params: Promise<{ leadId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    await connection();

    const { leadId } = await params;
    const supabase = await createClient();

    const { data: lead } = await supabase.from("leads").select("name").eq("id", leadId).maybeSingle();

    return {
        title: lead?.name ? `Build ${lead.name} a page` : "Build the preview",
        robots: { index: false },
    };
}

// Under the lead, because that is what it is built from. It was briefly a
// dialog on the lead itself; cropping two images inside a sheet that was
// already a modal fought the cropper rather than helped it.
async function BuildPreview({ params }: PageProps) {
    await connection();

    const { leadId } = await params;
    const supabase = await createClient();

    const { data: isAdmin } = await supabase.rpc("is_platform_admin");
    if (!isAdmin) redirect("/admin");

    const { data: lead } = await supabase
        .from("leads")
        .select(
            "id, name, description, email, contact_name, address_line_1, address_line_2, postcode, preview_business_id, categories ( name ), cities ( name ), areas ( name )",
        )
        .eq("id", leadId)
        .maybeSingle();

    if (!lead) notFound();

    // Already built: there is nothing to do here, and the lead is where
    // the link and the sending live.
    if (lead.preview_business_id) {
        redirect(`/admin/sales/${leadId}`);
    }

    const one = <T,>(value: T | T[] | null | undefined): T | undefined =>
        Array.isArray(value) ? value[0] : (value ?? undefined);

    const category = one(lead.categories as { name: string } | { name: string }[] | null);
    const city = one(lead.cities as { name: string } | { name: string }[] | null);
    const area = one(lead.areas as { name: string } | { name: string }[] | null);

    // The same list the action checks, named rather than counted. Shown
    // here so nobody fills the form in and is told at the end.
    const missing = [
        !category && "a category",
        !lead.address_line_1 && "a street address",
        !lead.postcode && "a postcode",
        !city && "a town",
        !area && "an area",
    ].filter(Boolean) as string[];

    const taking = [
        lead.name,
        category?.name,
        lead.contact_name ? `for ${lead.contact_name}` : null,
        lead.email,
        [lead.address_line_1, lead.address_line_2, city?.name, lead.postcode].filter(Boolean).join(", ") || null,
    ].filter(Boolean) as string[];

    return (
        <div className="space-y-8">
            <div>
                <Button
                    render={<Link href={`/admin/sales/${leadId}`} />}
                    nativeButton={false}
                    variant="ghost"
                    size="sm"
                >
                    <FiArrowLeft aria-hidden="true" />
                    {lead.name}
                </Button>

                <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                    Build {lead.name} a page
                </h1>

                <p className="mt-3 max-w-2xl text-[#17233B]/65">
                    Everything else comes from the lead. These are the parts it can&rsquo;t know.
                </p>
            </div>

            <Card className="border-[#17233B]/10">
                <CardContent className="p-6 sm:p-8">
                    {missing.length > 0 ? (
                        <div className="space-y-4 text-sm">
                            <p className="leading-6 text-[#17233B]/70">
                                The lead still needs <strong>{missing.join(", ")}</strong> before a
                                page can be built from it.
                            </p>

                            <Button
                                render={<Link href={`/admin/sales/${leadId}`} />}
                                nativeButton={false}
                                size="sm"
                            >
                                Go and add it
                            </Button>
                        </div>
                    ) : (
                        <BuildPreviewForm leadId={lead.id} taking={taking} description={lead.description} />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default function BuildPreviewPage(props: PageProps) {
    return (
        <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
            <BuildPreview {...props} />
        </Suspense>
    );
}
