import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FiArrowLeft } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getCityOptions } from "@/lib/locations";
import { AddLeadForm } from "./add-lead-form";
import { createClient } from "@/utils/supabase/server";

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
                    <AddLeadForm cities={cities} />
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
