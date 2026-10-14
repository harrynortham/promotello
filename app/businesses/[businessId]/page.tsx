import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { OfferCard } from "@/components/offer-card";
import { createClient } from "@/utils/supabase/server";
import { Skeleton } from "@/components/ui/skeleton";

type BusinessPageProps = {
    params: Promise<{
        businessId: string;
    }>;
};

const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
];

function formatTime(time: string | null) {
    if (!time) {
        return "";
    }

    const [hours, minutes] = time.split(":").map(Number);
    const date = new Date(2000, 0, 1, hours, minutes);

    return date.toLocaleTimeString("en-GB", {
        hour: "numeric",
        minute: "2-digit",
    });
}

function LoadingState() {
    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-10">
            <div className="mx-auto max-w-5xl">
                <Skeleton className="h-9 w-36 rounded-md" />

                <div className="mt-6 overflow-hidden rounded-xl border border-[#17233B]/10 bg-white p-7 md:p-10">
                    <Skeleton className="h-24 w-24 rounded-xl" />
                    <Skeleton className="mt-6 h-5 w-32 rounded-md" />
                    <Skeleton className="mt-3 h-12 w-72 rounded-md" />
                    <Skeleton className="mt-5 h-20 w-full max-w-2xl rounded-md" />

                    <Separator className="my-8" />

                    <div className="grid gap-8 md:grid-cols-2">
                        <div className="space-y-3">
                            <Skeleton className="h-4 w-24 rounded-md" />
                            <Skeleton className="h-20 w-64 rounded-md" />
                            <Skeleton className="h-9 w-36 rounded-md" />
                        </div>

                        <div className="space-y-3">
                            <Skeleton className="h-4 w-24 rounded-md" />
                            <Skeleton className="h-9 w-40 rounded-md" />
                            <Skeleton className="h-9 w-40 rounded-md" />
                        </div>
                    </div>

                    <Skeleton className="mt-8 h-72 w-full rounded-xl" />
                </div>

                <div className="mt-10">
                    <Skeleton className="h-5 w-32 rounded-md" />
                    <Skeleton className="mt-3 h-10 w-72 rounded-md" />

                    <div className="mt-6 grid gap-6 md:grid-cols-2">
                        <Skeleton className="h-80 w-full rounded-xl" />
                        <Skeleton className="h-80 w-full rounded-xl" />
                    </div>
                </div>
            </div>
        </main>
    );
}

async function BusinessContent({ params }: BusinessPageProps) {
    await connection();

    const { businessId } = await params;
    const supabase = await createClient();

    const { data: business } = await supabase
        .from("businesses")
        .select(
            `
        id,
        name,
        logo_url,
        category,
        description,
        website_url,
        contact_email,
        approval_status,
        business_locations (
          name,
          address_line_1,
          city,
          region,
          postal_code
        ),
        business_hours (
          day_of_week,
          is_closed,
          opens_at,
          closes_at
        )
      `,
        )
        .eq("id", businessId)
        .eq("approval_status", "approved")
        .single();

    if (!business) {
        notFound();
    }

    const { data: offers } = await supabase
        .from("offers")
        .select(
            `
        id,
        slug,
        category,
        discount,
        title,
        description,
        availability,
        expires_at,
        terms,
        image_url,
        business_id
      `,
        )
        .eq("business_id", businessId)
        .eq("approval_status", "approved")
        .order("created_at", { ascending: false });

    const location = Array.isArray(business.business_locations)
        ? business.business_locations[0]
        : business.business_locations;

    const hours = Array.isArray(business.business_hours)
        ? [...business.business_hours].sort(
            (a, b) => a.day_of_week - b.day_of_week,
        )
        : [];

    const fullAddress = location
        ? [
            location.address_line_1,
            location.city,
            location.region,
            location.postal_code,
        ]
            .filter(Boolean)
            .join(", ")
        : "";

    const directionsUrl = fullAddress
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            fullAddress,
        )}`
        : null;

    const mapUrl = fullAddress
        ? `https://www.google.com/maps?q=${encodeURIComponent(
            fullAddress,
        )}&output=embed`
        : null;

    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-10 text-[#17233B] md:py-16">
            <div className="mx-auto max-w-5xl">
                <Button
                    render={<Link href="/#offers" />}
                    nativeButton={false}
                    variant="outline"
                    size="sm"
                >
                    ← Back to deals
                </Button>

                <Card className="mt-6 border-[#17233B]/10 shadow-sm">
                    <CardHeader>
                        {business.logo_url && (
                            <img
                                src={business.logo_url}
                                alt={`${business.name} logo`}
                                className="mb-5 h-24 w-24 rounded-xl object-cover"
                            />
                        )}

                        <Badge
                            variant="outline"
                            className="w-fit border-[#FF593F]/30 bg-[#FF593F]/10 text-[#FF593F]"
                        >
                            {business.category}
                        </Badge>

                        <CardTitle className="mt-3 text-4xl tracking-tight">
                            {business.name}
                        </CardTitle>

                        {business.description && (
                            <p className="max-w-2xl leading-7 text-[#17233B]/70">
                                {business.description}
                            </p>
                        )}
                    </CardHeader>

                    <CardContent>
                        <Separator />

                        <div className="mt-8 grid gap-8 md:grid-cols-2">
                            {location && (
                                <section>
                                    <h2 className="text-xs font-semibold uppercase tracking-wide text-[#17233B]/50">
                                        Location
                                    </h2>

                                    <p className="mt-2 text-sm leading-6 text-[#17233B]/70">
                                        {location.name}
                                        <br />
                                        {fullAddress}
                                    </p>

                                    {directionsUrl && (
                                        <Button
                                            render={
                                                <a
                                                    href={directionsUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                />
                                            }
                                            nativeButton={false}
                                            variant="outline"
                                            size="sm"
                                            className="mt-4"
                                        >
                                            Get directions
                                        </Button>
                                    )}
                                </section>
                            )}

                            <section>
                                <h2 className="text-xs font-semibold uppercase tracking-wide text-[#17233B]/50">
                                    Contact
                                </h2>

                                <div className="mt-2 flex flex-wrap gap-2">
                                    {business.website_url && (
                                        <Button
                                            render={
                                                <a
                                                    href={business.website_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                />
                                            }
                                            nativeButton={false}
                                            variant="link"
                                            size="sm"
                                            className="h-auto p-0 text-[#FF593F]"
                                        >
                                            Visit website
                                        </Button>
                                    )}

                                    {business.contact_email && (
                                        <Button
                                            render={
                                                <a
                                                    href={`mailto:${business.contact_email}`}
                                                />
                                            }
                                            nativeButton={false}
                                            variant="link"
                                            size="sm"
                                            className="h-auto p-0 text-[#FF593F]"
                                        >
                                            Contact business
                                        </Button>
                                    )}
                                </div>
                            </section>
                        </div>

                        {hours.length > 0 && (
                            <>
                                <Separator className="my-8" />

                                <section>
                                    <h2 className="text-xl font-semibold">
                                        Opening hours
                                    </h2>

                                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                        {hours.map((day) => (
                                            <div
                                                key={day.day_of_week}
                                                className="flex items-center justify-between rounded-xl bg-[#FFF8F0] px-4 py-3 text-sm"
                                            >
                                                <span className="font-medium">
                                                    {dayNames[day.day_of_week]}
                                                </span>

                                                <span className="text-[#17233B]/65">
                                                    {day.is_closed
                                                        ? "Closed"
                                                        : `${formatTime(day.opens_at)} – ${formatTime(
                                                            day.closes_at,
                                                        )}`}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </>
                        )}

                        {mapUrl && (
                            <>
                                <Separator className="my-8" />

                                <div className="overflow-hidden rounded-xl border border-[#17233B]/10">
                                    <iframe
                                        title={`Map showing ${business.name}`}
                                        src={mapUrl}
                                        className="h-72 w-full border-0"
                                        loading="lazy"
                                        referrerPolicy="no-referrer-when-downgrade"
                                        allowFullScreen
                                    />
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                <section className="mt-10">
                    <div className="mb-6">
                        <Badge
                            variant="outline"
                            className="border-[#FF593F]/30 bg-[#FF593F]/10 text-[#FF593F]"
                        >
                            Available now
                        </Badge>

                        <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                            Offers from {business.name}
                        </h2>
                    </div>

                    {offers && offers.length > 0 ? (
                        <div className="grid gap-6 md:grid-cols-2">
                            {offers.map((offer) => (
                                <OfferCard
                                    key={offer.id}
                                    slug={offer.slug}
                                    discount={offer.discount}
                                    title={offer.title}
                                    description={offer.description}
                                    availability={offer.availability}
                                    business={business.name}
                                    businessId={business.id}
                                    businessLogoUrl={business.logo_url}
                                    imageUrl={offer.image_url}
                                    expiresAt={offer.expires_at}
                                />
                            ))}
                        </div>
                    ) : (
                        <Alert className="border-[#17233B]/10 bg-white">
                            <AlertTitle>No active offers</AlertTitle>

                            <AlertDescription>
                                This business has no active offers at the moment. Check back
                                soon for new deals.
                            </AlertDescription>
                        </Alert>
                    )}
                </section>
            </div>
        </main>
    );
}

export default function BusinessPage({ params }: BusinessPageProps) {
    return (
        <Suspense fallback={<LoadingState />}>
            <BusinessContent params={params} />
        </Suspense>
    );
}