import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { OfferCard } from "@/components/offer-card";
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
            <div className="mx-auto max-w-5xl">
                <div className="h-48 animate-pulse rounded-3xl bg-white" />
                <div className="mt-8 h-64 animate-pulse rounded-3xl bg-white" />
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

                <section className="mt-6 rounded-3xl bg-white p-7 shadow-sm md:p-10">
                    {business.logo_url && (
                        <img
                            src={business.logo_url}
                            alt={`${business.name} logo`}
                            className="mb-6 h-24 w-24 rounded-2xl object-cover"
                        />
                    )}

                    <p className="text-sm font-semibold uppercase tracking-wide text-[#FF593F]">
                        {business.category}
                    </p>

                    <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                        {business.name}
                    </h1>

                    {business.description && (
                        <p className="mt-5 max-w-2xl leading-7 text-[#17233B]/70">
                            {business.description}
                        </p>
                    )}

                    <div className="mt-8 grid gap-8 border-t border-[#17233B]/10 pt-6 md:grid-cols-2">
                        {location && (
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-[#17233B]/50">
                                    Location
                                </p>

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
                            </div>
                        )}

                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-[#17233B]/50">
                                Contact
                            </p>

                            <div className="mt-2 space-y-2 text-sm">
                                {business.website_url && (
                                    <a
                                        href={business.website_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block text-[#FF593F] hover:underline"
                                    >
                                        Visit website
                                    </a>
                                )}

                                {business.contact_email && (
                                    <a
                                        href={`mailto:${business.contact_email}`}
                                        className="block text-[#FF593F] hover:underline"
                                    >
                                        Contact business
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>

                    {hours.length > 0 && (
                        <div className="mt-8 border-t border-[#17233B]/10 pt-8">
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
                        </div>
                    )}

                    {mapUrl && (
                        <div className="mt-8 overflow-hidden rounded-2xl border border-[#17233B]/10">
                            <iframe
                                title={`Map showing ${business.name}`}
                                src={mapUrl}
                                className="h-72 w-full border-0"
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                allowFullScreen
                            />
                        </div>
                    )}
                </section>

                <section className="mt-10">
                    <div className="mb-6">
                        <p className="text-sm font-medium text-[#FF593F]">
                            Available now
                        </p>

                        <h2 className="mt-1 text-3xl font-semibold tracking-tight">
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
                                    expiresAt={offer.expires_at}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
                            <p className="font-medium">
                                This business has no active offers at the moment.
                            </p>

                            <p className="mt-2 text-sm text-[#17233B]/60">
                                Check back soon for new deals.
                            </p>
                        </div>
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