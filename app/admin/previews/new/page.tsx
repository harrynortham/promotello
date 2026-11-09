import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { FiArrowLeft } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getCityOptions } from "@/lib/locations";
import { CreatePreviewForm } from "../create-preview-form";

// A page of its own, because building a preview is a sitting rather than
// something to do at the bottom of a list.

async function NewPreviewContent() {
    await connection();

    const cities = await getCityOptions({ includeNotLive: true });

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
                    <CreatePreviewForm cities={cities} />
                </CardContent>
            </Card>
        </div>
    );
}

export default function NewPreviewPage() {
    return (
        <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
            <NewPreviewContent />
        </Suspense>
    );
}
