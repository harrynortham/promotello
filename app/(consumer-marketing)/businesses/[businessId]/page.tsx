import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";

import { OfferCard } from "@/components/offer-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/utils/supabase/server";

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
            <div className="mx-auto max-w-6xl">
                <Skeleton className="h-9 w-36" />

                <div className="mt-6 overflow-hidden rounded-3xl bg-white">
                    <Skeleton className="h-72 w-full" />

                    <div className="space-y-4 p-8">
                        <Skeleton className="h-24 w-24 rounded-2xl" />
                        <Skeleton className="h-8 w-72" />
                        <Skeleton className="h-5 w-96 max-w-full" />
                    </div>
                </div>

                <div className="mt-10 grid gap-6 lg:grid-cols-3">
                    <Skeleton className="h-72 rounded-3xl lg:col-span-2" />
                    <Skeleton className="h-72 rounded-3xl" />
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

    const today = new Date().toISOString().slice(0, 10);

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
        .gte("expires_at", today)
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
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-10 text-[#17233B] sm:px-10">
            <div className="mx-auto max-w-6xl">
                <Button
                    render={<Link href="/businesses" />}
                    nativeButton={false}
                    variant="outline"
                    size="sm"
                >
                    ← Back to businesses
                </Button>

                <section className="relative mt-6 overflow-hidden rounded-3xl bg-[#17233B] text-white shadow-sm">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#17233B] via-[#17233B] to-[#293b60]" />

                    <div className="relative px-6 py-10 sm:px-10 sm:py-14">
                        <div className="flex flex-col gap-8 sm:flex-row sm:items-end">
                            {business.logo_url ? (
                                <Image
                                    src={business.logo_url}
                                    alt={`${business.name} logo`}
                                    width={128}
                                    height={128}
                                    className="h-32 w-32 rounded-3xl bg-white object-contain p-3 shadow-lg"
                                />
                            ) : (
                                <div className="flex h-32 w-32 items-center justify-center rounded-3xl bg-[#FF593F] text-5xl font-semibold text-[#17233B] shadow-lg">
                                    {business.name.charAt(0).toUpperCase()}
                                </div>
                            )}

                            <div>
                                <div className="flex flex-wrap gap-2">
                                    {business.category && (
                                        <Badge className="bg-[#FF593F] text-[#17233B] hover:bg-[#FF593F]">
                                            {business.category}
                                        </Badge>
                                    )}

                                    <Badge
                                        variant="outline"
                                        className="border-white/30 text-white"
                                    >
                                        {offers?.length ?? 0} active{" "}
                                        {offers?.length === 1
                                            ? "promotion"
                                            : "promotions"}
                                    </Badge>
                                </div>

                                <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
                                    {business.name}
                                </h1>

                                {location?.city && (
                                    <p className="mt-3 text-white/70">
                                        {location.city}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                <div className="mt-8 grid gap-6 lg:grid-cols-3">
                    <Card className="rounded-3xl border-[#17233B]/10 lg:col-span-2">
                        <CardHeader>
                            <CardTitle>About {business.name}</CardTitle>
                        </CardHeader>

                        <CardContent>
                            <p className="leading-7 text-[#17233B]/70">
                                {business.description ||
                                    "Discover local promotions and experiences from this business."}
                            </p>

                            {(business.website_url ||
                                business.contact_email) && (
                                    <>
                                        <Separator className="my-6" />

                                        <div className="flex flex-wrap gap-3">
                                            {business.website_url && (
                                                <Button
                                                    render={
                                                        <a
                                                            href={
                                                                business.website_url
                                                            }
                                                            target="_blank"
                                                            rel="noreferrer"
                                                        />
                                                    }
                                                    nativeButton={false}
                                                    variant="outline"
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
                                                    variant="outline"
                                                >
                                                    Contact business
                                                </Button>
                                            )}
                                        </div>
                                    </>
                                )}
                        </CardContent>
                    </Card>

                    <Card className="rounded-3xl border-[#17233B]/10">
                        <CardHeader>
                            <CardTitle>Visit this business</CardTitle>
                        </CardHeader>

                        <CardContent>
                            {location ? (
                                <>
                                    <p className="text-sm leading-6 text-[#17233B]/70">
                                        {location.name && (
                                            <>
                                                <span className="font-semibold text-[#17233B]">
                                                    {location.name}
                                                </span>
                                                <br />
                                            </>
                                        )}

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
                                            className="mt-5 w-full"
                                        >
                                            Get directions
                                        </Button>
                                    )}
                                </>
                            ) : (
                                <p className="text-sm text-[#17233B]/60">
                                    Location details are not available yet.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {mapUrl && (
                    <Card className="mt-6 overflow-hidden rounded-3xl border-[#17233B]/10">
                        <CardHeader>
                            <CardTitle>Location</CardTitle>

                            <CardDescription>
                                Find {business.name} on the map.
                            </CardDescription>
                        </CardHeader>

                        <CardContent>
                            <div className="overflow-hidden rounded-2xl border border-[#17233B]/10">
                                <iframe
                                    title={`Map showing ${business.name}`}
                                    src={mapUrl}
                                    className="h-80 w-full border-0"
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                    allowFullScreen
                                />
                            </div>
                        </CardContent>
                    </Card>
                )}

                {hours.length > 0 && (
                    <Card className="mt-6 rounded-3xl border-[#17233B]/10">
                        <CardHeader>
                            <CardTitle>Opening hours</CardTitle>
                        </CardHeader>

                        <CardContent>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {hours.map((day) => (
                                    <div
                                        key={day.day_of_week}
                                        className="flex items-center justify-between rounded-2xl bg-[#FFF8F0] px-4 py-3 text-sm"
                                    >
                                        <span className="font-medium">
                                            {dayNames[day.day_of_week]}
                                        </span>

                                        <span className="text-[#17233B]/65">
                                            {day.is_closed
                                                ? "Closed"
                                                : `${formatTime(
                                                    day.opens_at,
                                                )} – ${formatTime(
                                                    day.closes_at,
                                                )}`}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                <section className="mt-12">
                    <div className="mb-6">
                        <Badge
                            variant="outline"
                            className="border-[#FF593F]/30 bg-[#FF593F]/10 text-[#FF593F]"
                        >
                            Available now
                        </Badge>

                        <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                            Promotions from {business.name}
                        </h2>

                        <p className="mt-2 text-[#17233B]/65">
                            Discover the latest ways to save at this local
                            business.
                        </p>
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
                            <AlertTitle>No active promotions</AlertTitle>

                            <AlertDescription>
                                This business has no active promotions at the
                                moment. Check back soon for new deals.
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