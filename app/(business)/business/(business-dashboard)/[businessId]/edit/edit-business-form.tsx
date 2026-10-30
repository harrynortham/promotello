"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert";
import { CategorySelect } from "@/components/category-select";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { FiUpload } from "react-icons/fi";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { FieldError, invalidProps } from "@/components/field-error";
import { LocationFields } from "@/components/location-fields";
import { WEEK, formatHour, type HoursRow } from "@/lib/business-hours";
import type { CityOption } from "@/lib/locations";
import {
    locationShape,
    optionalEmail,
    optionalText,
    optionalUrl,
    postcodeInCity,
    requiredText,
} from "@/lib/validation";
import { createClient } from "@/utils/supabase/client";

type EditBusinessFormProps = {
    businessId: string;
    cities: CityOption[];
};

type Business = {
    name: string;
    category: string;
    category_id: string | null;
    description: string | null;
    website_url: string | null;
    contact_email: string | null;
    logo_url: string | null;
    cover_image_url: string | null;
    google_review_url: string | null;
};

type Location = {
    id: string;
    name: string;
    address_line_1: string;
    address_line_2: string | null;
    city: string;
    region: string | null;
    postal_code: string | null;
    country_code: string;
};

const reviewLink = /^https:\/\/(g\.page|maps\.app\.goo\.gl|(www\.|search\.)?google\.[a-z.]+)\//;

const businessShape = {
    businessName: requiredText("The business name", { min: 2, max: 160 }),
    category: z.string().min(1, "Choose a category."),
    description: optionalText("The description", 5000),
    website: optionalUrl,
    contactEmail: optionalEmail,
    googleReviewUrl: z
        .string()
        .trim()
        .refine((value) => !value || reviewLink.test(value), "Paste the review link from your Google Business Profile."),
};

const locationFieldsShape = {
    locationName: optionalText("The location name", 120),
    addressLine1: requiredText("The street address", { min: 2, max: 200 }),
    addressLine2: optionalText("Address line 2", 200),
    ...locationShape,
};

function withLocation(cities: CityOption[]) {
    return z.object({ ...businessShape, ...locationFieldsShape }).superRefine(postcodeInCity(cities));
}

// A business without a location (rare) has no location fields to check.
const withoutLocation = z.object({
    ...businessShape,
    locationName: z.string(),
    addressLine1: z.string(),
    addressLine2: z.string(),
    city: z.string(),
    region: z.string(),
    postalCode: z.string(),
});

type Values = z.input<ReturnType<typeof withLocation>>;
type Output = z.output<ReturnType<typeof withLocation>>;

export default function EditBusinessForm({
    businessId,
    cities,
}: EditBusinessFormProps) {
    const [loaded, setLoaded] = useState<{
        business: Business;
        location: Location | null;
        hours: HoursRow[];
    } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        // Only the latest load counts (development runs effects twice).
        let current = true;

        async function loadBusiness() {
            const supabase = createClient();

            const [{ data: businessData, error: businessError }, locationResult, hoursResult] =
                await Promise.all([
                    supabase
                        .from("businesses")
                        .select(
                            "name, category, category_id, description, website_url, contact_email, logo_url, cover_image_url, google_review_url",
                        )
                        .eq("id", businessId)
                        .single(),

                    supabase
                        .from("business_locations")
                        .select(
                            "id, name, address_line_1, address_line_2, city, region, postal_code, country_code",
                        )
                        .eq("business_id", businessId)
                        .order("created_at", { ascending: true })
                        .limit(1)
                        .maybeSingle(),

                    supabase
                        .from("business_hours")
                        .select("day_of_week, is_closed, opens_at, closes_at")
                        .eq("business_id", businessId)
                        .order("day_of_week", { ascending: true }),
                ]);

            if (!current) return;

            if (
                businessError ||
                locationResult.error ||
                hoursResult.error ||
                !businessData
            ) {
                setErrorMessage("We couldn't load this business.");
                setIsLoading(false);
                return;
            }

            setLoaded({ business: businessData, location: locationResult.data, hours: (hoursResult.data ?? []) as HoursRow[] });
            setIsLoading(false);
        }

        loadBusiness();

        return () => {
            current = false;
        };
    }, [businessId]);

    if (isLoading) {
        return (
            <div>
                <div>
                    <div className="h-96 animate-pulse rounded-xl bg-white" />
                </div>
            </div>
        );
    }

    if (!loaded) {
        return (
            <div>
                <Card className="border-red-200">
                    <CardContent className="p-8">
                        <Alert variant="destructive">
                            <AlertTitle>Business unavailable</AlertTitle>

                            <AlertDescription>
                                {errorMessage || "Business not found."}
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return <BusinessForm businessId={businessId} cities={cities} {...loaded} />;
}

function BusinessForm({
    businessId,
    cities,
    business: initialBusiness,
    location,
    hours,
}: {
    businessId: string;
    cities: CityOption[];
    business: Business;
    location: Location | null;
    hours: HoursRow[];
}) {
    const router = useRouter();

    const business = initialBusiness;
    const [saved, setSaved] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting: isSaving },
    } = useForm<Values, unknown, Output>({
        resolver: location ? zodResolver(withLocation(cities)) : zodResolver(withoutLocation),
        defaultValues: {
            businessName: business.name,
            category: business.category_id ?? "",
            description: business.description ?? "",
            website: business.website_url ?? "",
            contactEmail: business.contact_email ?? "",
            googleReviewUrl: business.google_review_url ?? "",
            locationName: location?.name ?? "",
            addressLine1: location?.address_line_1 ?? "",
            addressLine2: location?.address_line_2 ?? "",
            city: location?.city ?? "",
            region: location?.region ?? "",
            postalCode: location?.postal_code ?? "",
        },
    });

    async function onSubmit(values: Output) {
        setSaved(false);
        setErrorMessage("");

        const supabase = createClient();

        const { error: businessError } = await supabase
            .from("businesses")
            .update({
                name: values.businessName,
                category_id: values.category,
                description: values.description || null,
                website_url: values.website || null,
                contact_email: values.contactEmail || null,
                google_review_url: values.googleReviewUrl || null,
            })
            .eq("id", businessId);

        if (businessError) {
            setErrorMessage(businessError.message);
            return;
        }

        if (location) {
            const { error: locationError } = await supabase
                .from("business_locations")
                .update({
                    name: values.locationName || location.name,
                    address_line_1: values.addressLine1,
                    address_line_2: values.addressLine2 || null,
                    city: values.city,
                    region: values.region,
                    postal_code: values.postalCode,
                    country_code: "GB",
                })
                .eq("id", location.id)
                .eq("business_id", businessId);

            if (locationError) {
                setErrorMessage(locationError.message);
                return;
            }
        }

        setSaved(true);
        router.refresh();
    }

    return (
        <div className="text-[#17233B]">
            <div>
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                        Business settings
                    </p>

                    <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                        Edit business
                    </h1>

                    <p className="mt-3 text-[#17233B]/65">
                        Keep your business information up to date.
                    </p>
                </div>

                <Card className="mt-10 border-[#17233B]/10">
                    <CardContent className="p-6 sm:p-10">
                        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-10">
                            <section className="space-y-5">
                                <div>
                                    <h2 className="text-xl font-semibold">
                                        Business details
                                    </h2>

                                    <p className="mt-1 text-sm text-[#17233B]/70">
                                        Information customers will see on your business profile.
                                    </p>
                                </div>

                                {/* The logo has its own page, with cropping, and saves on its own. */}
                                <div className="flex items-center gap-4">
                                    {business.logo_url ? (
                                        <Image
                                            src={business.logo_url}
                                            alt={`${business.name} logo`}
                                            width={64}
                                            height={64}
                                            className="size-16 rounded-2xl border border-[#17233B]/10 object-cover"
                                        />
                                    ) : (
                                        <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl border border-dashed border-[#17233B]/20 bg-[#FFF8F0] text-2xl font-semibold text-[#17233B]/40">
                                            {business.name.charAt(0).toUpperCase()}
                                        </span>
                                    )}

                                    <div className="min-w-0 space-y-1.5">
                                        <p className="text-sm font-medium">Business logo</p>
                                        <Button
                                            render={<Link href={`/business/${businessId}/logo?from=edit`} />}
                                            nativeButton={false}
                                            variant="outline"
                                            size="sm"
                                        >
                                            <FiUpload aria-hidden="true" />
                                            {business.logo_url ? "Change logo" : "Add logo"}
                                        </Button>
                                        <p className="text-xs text-[#17233B]/65">
                                            Saved on its own page, so save any other changes here first.
                                        </p>
                                    </div>
                                </div>

                                {/* So is the cover photo. */}
                                <div className="flex items-center gap-4">
                                    <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-xl border border-dashed border-[#17233B]/20 bg-[#FFF8F0]">
                                        {business.cover_image_url && (
                                            <Image
                                                src={business.cover_image_url}
                                                alt={`${business.name} cover photo`}
                                                fill
                                                sizes="112px"
                                                className="object-cover"
                                            />
                                        )}
                                    </div>

                                    <div className="min-w-0 space-y-1.5">
                                        <p className="text-sm font-medium">Cover photo</p>
                                        <Button
                                            render={<Link href={`/business/${businessId}/cover?from=edit`} />}
                                            nativeButton={false}
                                            variant="outline"
                                            size="sm"
                                        >
                                            <FiUpload aria-hidden="true" />
                                            {business.cover_image_url ? "Change cover photo" : "Add cover photo"}
                                        </Button>
                                        <p className="text-xs text-[#17233B]/65">
                                            The big photo at the top of your page. Without one, your newest offer photo is used.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="businessName">Business name</Label>

                                    <Input
                                        id="businessName"
                                        maxLength={160}
                                        {...register("businessName")}
                                        {...invalidProps("businessName-error", errors.businessName)}
                                    />
                                    <FieldError id="businessName-error" message={errors.businessName?.message} />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="category">Category</Label>

                                    <CategorySelect
                                        id="category"
                                        name="category"
                                        defaultValue={business.category_id}
                                        registration={register("category")}
                                        invalid={invalidProps("category-error", errors.category)}
                                    />
                                    <FieldError id="category-error" message={errors.category?.message} />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>

                                    <Textarea
                                        id="description"
                                        rows={5}
                                        maxLength={5000}
                                        {...register("description")}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="website">Website</Label>

                                    <Input
                                        id="website"
                                        type="url"
                                        placeholder="https://example.com"
                                        {...register("website")}
                                        {...invalidProps("website-error", errors.website)}
                                    />
                                    <FieldError id="website-error" message={errors.website?.message} />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="contactEmail">Contact email</Label>

                                    <Input
                                        id="contactEmail"
                                        type="email"
                                        {...register("contactEmail")}
                                        {...invalidProps("contactEmail-error", errors.contactEmail)}
                                    />
                                    <FieldError id="contactEmail-error" message={errors.contactEmail?.message} />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="googleReviewUrl">Google review link</Label>

                                    <Input
                                        id="googleReviewUrl"
                                        type="url"
                                        placeholder="https://g.page/r/…/review"
                                        {...register("googleReviewUrl")}
                                        {...invalidProps("googleReviewUrl-error", errors.googleReviewUrl)}
                                    />
                                    <FieldError id="googleReviewUrl-error" message={errors.googleReviewUrl?.message} />

                                    <p className="text-xs leading-5 text-[#17233B]/70">
                                        In Google Business Profile, choose &ldquo;Ask for
                                        reviews&rdquo; and copy the link. On Pro, customers who
                                        recently visited are asked to leave you a review.
                                    </p>
                                </div>
                            </section>

                            <Separator />

                            {location && (
                                <section className="space-y-5">
                                    <div>
                                        <h2 className="text-xl font-semibold">
                                            Main location
                                        </h2>

                                        <p className="mt-1 text-sm text-[#17233B]/70">
                                            This location appears on your public business profile.
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="locationName">Location name</Label>

                                        <Input id="locationName" maxLength={120} {...register("locationName")} />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="addressLine1">
                                            Address line 1
                                        </Label>

                                        <Input
                                            id="addressLine1"
                                            maxLength={200}
                                            {...register("addressLine1")}
                                            {...invalidProps("addressLine1-error", errors.addressLine1)}
                                        />
                                        <FieldError id="addressLine1-error" message={errors.addressLine1?.message} />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="addressLine2">
                                            Address line 2
                                        </Label>

                                        <Input id="addressLine2" maxLength={200} {...register("addressLine2")} />
                                    </div>

                                    <LocationFields
                                        cities={cities}
                                        defaults={{ city: location.city, area: location.region, postalCode: location.postal_code }}
                                        fields={{ city: register("city"), region: register("region"), postalCode: register("postalCode") }}
                                        errors={errors}
                                    />
                                </section>
                            )}

                            <Separator />

                            {/* Hours have their own page and save on their own. */}
                            <section className="space-y-5">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <h2 className="text-xl font-semibold">
                                            Opening hours
                                        </h2>

                                        <p className="mt-1 text-sm leading-6 text-[#17233B]/65">
                                            Saved on their own page, so save any other changes here first.
                                        </p>
                                    </div>

                                    <Button
                                        render={<Link href={`/business/${businessId}/hours?from=edit`} />}
                                        nativeButton={false}
                                        variant="outline"
                                        size="sm"
                                    >
                                        {hours.length ? "Change hours" : "Set hours"}
                                    </Button>
                                </div>

                                {hours.length ? (
                                    <dl className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-[8rem_1fr]">
                                        {WEEK.map(({ dayOfWeek, name }) => {
                                            const day = hours.find((row) => row.day_of_week === dayOfWeek);
                                            return (
                                                <div key={dayOfWeek} className="contents">
                                                    <dt className="font-medium">{name}</dt>
                                                    <dd className="text-[#17233B]/70">
                                                        {!day
                                                            ? "Not set"
                                                            : day.is_closed || !day.opens_at || !day.closes_at
                                                                ? "Closed"
                                                                : `${formatHour(day.opens_at)} to ${formatHour(day.closes_at)}`}
                                                    </dd>
                                                </div>
                                            );
                                        })}
                                    </dl>
                                ) : (
                                    <p className="rounded-xl bg-[#FFF8F0] px-4 py-3 text-sm text-[#17233B]/70">
                                        Not set yet.
                                    </p>
                                )}
                            </section>

                            {errorMessage && (
                                <Alert variant="destructive">
                                    <AlertTitle>Unable to save changes</AlertTitle>

                                    <AlertDescription>
                                        {errorMessage}
                                    </AlertDescription>
                                </Alert>
                            )}

                            {saved && (
                                <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
                                    <AlertTitle>Changes saved</AlertTitle>

                                    <AlertDescription>
                                        Business details saved successfully.
                                    </AlertDescription>
                                </Alert>
                            )}

                            <Button
                                type="submit"
                                disabled={isSaving}
                                variant="default"
                                size="lg"
                                className="w-full"
                            >
                                {isSaving ? "Saving changes…" : "Save changes"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}