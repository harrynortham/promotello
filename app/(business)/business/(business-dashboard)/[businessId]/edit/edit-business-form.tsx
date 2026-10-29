"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert";
import { CategorySelect } from "@/components/category-select";
import { Button } from "@/components/ui/button";
import Image from "next/image";

import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { FieldError, invalidProps } from "@/components/field-error";
import { LocationFields } from "@/components/location-fields";
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

type BusinessHour = {
    day_of_week: number;
    is_closed: boolean;
    opens_at: string | null;
    closes_at: string | null;
};

type DayHours = {
    isClosed: boolean;
    opensAt: string;
    closesAt: string;
};

const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
];

function createDefaultHours(): DayHours[] {
    return days.map(() => ({
        isClosed: false,
        opensAt: "09:00",
        closesAt: "17:00",
    }));
}

const reviewLink = /^https:\/\/(g\.page|maps\.app\.goo\.gl|(www\.|search\.)?google\.[a-z.]+)\//;

const hoursSchema = z
    .object({ isClosed: z.boolean(), opensAt: z.string(), closesAt: z.string() })
    // Overnight hours (6pm to 2am) are fine; the same time twice isn't.
    .refine((day) => day.isClosed || (day.opensAt && day.closesAt && day.opensAt !== day.closesAt), {
        message: "Choose different opening and closing times.",
        path: ["closesAt"],
    });

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
    hours: z.array(hoursSchema).length(7),
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
        hours: DayHours[];
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
                            "name, category, category_id, description, website_url, contact_email, logo_url, google_review_url",
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

            const loadedHours = createDefaultHours();

            for (const item of (hoursResult.data ?? []) as BusinessHour[]) {
                if (item.day_of_week >= 0 && item.day_of_week <= 6) {
                    loadedHours[item.day_of_week] = {
                        isClosed: item.is_closed,
                        opensAt: item.opens_at?.slice(0, 5) ?? "09:00",
                        closesAt: item.closes_at?.slice(0, 5) ?? "17:00",
                    };
                }
            }

            setLoaded({ business: businessData, location: locationResult.data, hours: loadedHours });
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
                <div className="mx-auto max-w-2xl">
                    <div className="h-96 animate-pulse rounded-xl bg-white" />
                </div>
            </div>
        );
    }

    if (!loaded) {
        return (
            <div>
                <Card className="mx-auto max-w-2xl border-red-200">
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

async function uploadLogo(supabase: ReturnType<typeof createClient>, businessId: string, file: File) {
    const extension = file.name.split(".").pop() ?? "jpg";
    const path = `${businessId}/logo-${Date.now()}.${extension}`;

    const { error } = await supabase.storage
        .from("business-logos")
        .upload(path, file, { upsert: true, contentType: file.type });

    if (error) return { error: error.message };

    return { url: supabase.storage.from("business-logos").getPublicUrl(path).data.publicUrl };
}

function HoursRow({
    index,
    day,
    control,
    register,
    error,
}: {
    index: number;
    day: string;
    control: ReturnType<typeof useForm<Values, unknown, Output>>["control"];
    register: ReturnType<typeof useForm<Values, unknown, Output>>["register"];
    error?: string;
}) {
    const isClosed = useWatch({ control, name: `hours.${index}.isClosed` });

    return (
        <Card className="border-[#17233B]/10 shadow-none">
            <CardContent className="p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <Controller
                            control={control}
                            name={`hours.${index}.isClosed`}
                            render={({ field }) => (
                                <Checkbox
                                    id={`open-${index}`}
                                    checked={!field.value}
                                    onCheckedChange={(checked) => field.onChange(checked !== true)}
                                />
                            )}
                        />

                        <Label htmlFor={`open-${index}`}>{day}</Label>
                    </div>

                    {isClosed ? (
                        <span className="text-sm text-[#17233B]/70">Closed</span>
                    ) : (
                        <div className="flex items-center gap-3">
                            <Input
                                type="time"
                                aria-label={`${day} opens`}
                                className="w-auto"
                                {...register(`hours.${index}.opensAt`)}
                            />

                            <span className="text-sm text-[#17233B]/65">to</span>

                            <Input
                                type="time"
                                aria-label={`${day} closes`}
                                className="w-auto"
                                {...register(`hours.${index}.closesAt`)}
                                {...invalidProps(`hours-${index}-error`, error ? { message: error } : undefined)}
                            />
                        </div>
                    )}
                </div>
                <FieldError id={`hours-${index}-error`} message={error} />
            </CardContent>
        </Card>
    );
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
    hours: DayHours[];
}) {
    const router = useRouter();

    const [business, setBusiness] = useState(initialBusiness);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [saved, setSaved] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const {
        register,
        handleSubmit,
        control,
        setError,
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
            hours,
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

        let logoUrl = business.logo_url;

        if (logoFile) {
            const allowedTypes = ["image/png", "image/jpeg", "image/webp"];

            if (!allowedTypes.includes(logoFile.type)) {
                setError("root.logo", { message: "Please upload a PNG, JPG or WebP image." });
                return;
            }

            if (logoFile.size > 5 * 1024 * 1024) {
                setError("root.logo", { message: "The logo must be smaller than 5MB." });
                return;
            }

            const upload = await uploadLogo(supabase, businessId, logoFile);

            if ("error" in upload) {
                setErrorMessage(upload.error ?? "The logo couldn't be uploaded.");
                return;
            }

            logoUrl = upload.url;
        }

        const { error: businessError } = await supabase
            .from("businesses")
            .update({
                name: values.businessName,
                category_id: values.category,
                description: values.description || null,
                website_url: values.website || null,
                contact_email: values.contactEmail || null,
                google_review_url: values.googleReviewUrl || null,
                logo_url: logoUrl,
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

        const hoursRows = values.hours.map((day, dayOfWeek) => ({
            business_id: businessId,
            day_of_week: dayOfWeek,
            is_closed: day.isClosed,
            opens_at: day.isClosed ? null : day.opensAt,
            closes_at: day.isClosed ? null : day.closesAt,
        }));

        const { error: hoursError } = await supabase
            .from("business_hours")
            .upsert(hoursRows, {
                onConflict: "business_id,day_of_week",
            });

        if (hoursError) {
            setErrorMessage(hoursError.message);
            return;
        }

        setBusiness((current) => ({ ...current, logo_url: logoUrl }));
        setLogoFile(null);
        setSaved(true);
        router.refresh();
    }

    return (
        <div className="text-[#17233B]">
            <div className="mx-auto max-w-3xl">
                <Button
                    render={<Link href={`/business/${businessId}`} />}
                    nativeButton={false}
                    variant="outline"
                    size="sm"
                >
                    ← Back to dashboard
                </Button>

                <div className="mt-8">
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

                                {business.logo_url && (
                                    <Image
                                        src={business.logo_url}
                                        alt={`${business.name} logo`}
                                        width={96}
                                        height={96}
                                        className="h-24 w-24 rounded-xl object-cover"
                                    />
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="logo">Business logo</Label>

                                    <Input
                                        id="logo"
                                        name="logo"
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        onChange={(event) =>
                                            setLogoFile(event.target.files?.[0] ?? null)
                                        }
                                    />

                                    <FieldError id="logo-error" message={errors.root?.logo?.message} />
                                    <p className="text-xs text-[#17233B]/65">
                                        Use a PNG, JPG or WebP image under 5MB.
                                    </p>
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

                            <section className="space-y-5">
                                <div>
                                    <h2 className="text-xl font-semibold">
                                        Opening hours
                                    </h2>

                                    <p className="mt-1 text-sm leading-6 text-[#17233B]/65">
                                        Set the hours customers can visit your business.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    {days.map((day, index) => (
                                        <HoursRow
                                            key={day}
                                            index={index}
                                            day={day}
                                            control={control}
                                            register={register}
                                            error={errors.hours?.[index]?.closesAt?.message}
                                        />
                                    ))}
                                </div>
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