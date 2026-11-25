"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert";
import { BusinessCard } from "@/components/business-card";
import { SOCIAL_NETWORKS, socialHandle, socialUrl } from "@/lib/social-links";
import { CategorySelect, OTHER_CATEGORY } from "@/components/category-select";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { FiExternalLink, FiUpload } from "react-icons/fi";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BusinessProfileLoading } from "@/components/dashboard-skeletons";
import { Textarea } from "@/components/ui/textarea";
import { FieldError, invalidProps } from "@/components/field-error";
import { LocationFields } from "@/components/location-fields";
import { storedImage } from "@/lib/images";
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
import { getCategoryGroups } from "@/lib/categories";
import type { ListingBusiness } from "@/lib/listings";
import { uploadedCover } from "@/lib/business-images";
import { createClient } from "@/utils/supabase/client";

type EditBusinessFormProps = {
    businessId: string;
    cities: CityOption[];
};

type Business = {
    name: string;
    slug: string | null;
    category: string;
    category_id: string | null;
    description: string | null;
    website_url: string | null;
    menu_url: string | null;
    booking_url: string | null;
    phone: string | null;
    contact_email: string | null;
    logo_url: string | null;
    cover_image_url: string | null;
    instagram_url: string | null;
    facebook_url: string | null;
    tiktok_url: string | null;
    x_url: string | null;
    youtube_url: string | null;
    linkedin_url: string | null;
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
    // Asked for only when nothing on the list fits, and then required:
    // their words stand in for a category until we have one
    // (20261231090000_a_business_we_have_no_category_for.sql).
    otherCategory: z.string().max(100, "Keep it under 100 characters."),
    description: optionalText("The description", 5000),
    // Their address on Promotello, and the one thing on this form that
    // somebody else might already have taken.
    handle: z
        .string()
        .trim()
        .toLowerCase()
        .refine(
            (value) => !value || /^[a-z0-9]([a-z0-9-]{1,28}[a-z0-9])$/.test(value),
            "3 to 30 characters: letters, numbers and hyphens, starting and ending with a letter or number.",
        ),
    website: optionalUrl,
    // The three a bio needs that a website does not answer: somebody
    // arriving from Instagram wants the menu, a table or the phone.
    menuUrl: optionalUrl,
    bookingUrl: optionalUrl,
    phone: z
        .string()
        .trim()
        .refine(
            (value) => !value || /^[0-9+()\s-]{7,20}$/.test(value),
            "Use digits, spaces and brackets, like 0117 496 0123.",
        ),
    contactEmail: optionalEmail,
    googleReviewUrl: z
        .string()
        .trim()
        .refine((value) => !value || reviewLink.test(value), "Paste the review link from your Google Business Profile."),
    // A handle or a pasted link, either way round. socialUrl says which
    // it is and whether it belongs to this network — a Facebook link in
    // the Instagram box is a mistake worth catching rather than turning
    // into a handle called "facebook.com".
    ...Object.fromEntries(
        SOCIAL_NETWORKS.map((network) => [
            network.key,
            z
                .string()
                .trim()
                .refine(
                    (value) => !("invalid" in socialUrl(network.key, value)),
                    `Enter your ${network.label} handle, like ${network.placeholder}, or paste the link.`,
                ),
        ]),
    ),
};

const locationFieldsShape = {
    locationName: optionalText("The location name", 120),
    addressLine1: requiredText("The street address", { min: 2, max: 200 }),
    addressLine2: optionalText("Address line 2", 200),
    ...locationShape,
};

// A business the list had nothing for has to be able to edit its page
// without being made to pick the nearest wrong category, so this form
// offers the same way out as the one it signed up through.
function saidItThemselves(
    values: { category: string; otherCategory: string },
    ctx: z.RefinementCtx,
) {
    if (values.category === OTHER_CATEGORY && values.otherCategory.trim().length < 2) {
        ctx.addIssue({
            code: "custom",
            path: ["otherCategory"],
            message: "Tell us in a few words what you do.",
        });
    }
}

function withLocation(cities: CityOption[]) {
    return z
        .object({ ...businessShape, ...locationFieldsShape })
        .superRefine(postcodeInCity(cities))
        .superRefine(saidItThemselves);
}

// A business without a location (rare) has no location fields to check.
const withoutLocation = z
    .object({
        ...businessShape,
        locationName: z.string(),
        addressLine1: z.string(),
        addressLine2: z.string(),
        city: z.string(),
        region: z.string(),
        postalCode: z.string(),
    })
    .superRefine(saidItThemselves);

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
        handle: string | null;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        // Only the latest load counts (development runs effects twice).
        let current = true;

        async function loadBusiness() {
            const supabase = createClient();

            const [
                { data: businessData, error: businessError },
                locationResult,
                hoursResult,
                handleResult,
            ] =
                await Promise.all([
                    supabase
                        .from("businesses")
                        .select(
                            "name, slug, category, category_id, description, website_url, menu_url, booking_url, phone, contact_email, logo_url, cover_image_url, google_review_url, instagram_url, facebook_url, tiktok_url, x_url, youtube_url, linkedin_url",
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

                    supabase
                        .from("business_handles")
                        .select("handle")
                        .eq("business_id", businessId)
                        .eq("is_current", true)
                        .maybeSingle(),
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

            setLoaded({
                business: businessData,
                location: locationResult.data,
                hours: (hoursResult.data ?? []) as HoursRow[],
                handle: handleResult.data?.handle ?? null,
            });
            setIsLoading(false);
        }

        loadBusiness();

        return () => {
            current = false;
        };
    }, [businessId]);

    // The same shape the page showed while it waited: one wait, not two.
    if (isLoading) {
        return <BusinessProfileLoading />;
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
    handle,
}: {
    businessId: string;
    cities: CityOption[];
    business: Business;
    location: Location | null;
    hours: HoursRow[];
    // Their address on Promotello, the one that goes in a bio.
    handle: string | null;
}) {
    const router = useRouter();

    const business = initialBusiness;
    const [saved, setSaved] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [categoryNames, setCategoryNames] = useState<Map<string, string>>(new Map());

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
            // No category, but words of their own: the select shows
            // "Something else" with those words beside it, rather than
            // an empty box that will not save.
            category: business.category_id ?? (business.category ? OTHER_CATEGORY : ""),
            otherCategory: business.category_id ? "" : (business.category ?? ""),
            description: business.description ?? "",
            handle: handle ?? "",
            website: business.website_url ?? "",
            menuUrl: business.menu_url ?? "",
            bookingUrl: business.booking_url ?? "",
            phone: business.phone ?? "",
            contactEmail: business.contact_email ?? "",
            googleReviewUrl: business.google_review_url ?? "",
            // Shown as the handle, which is what they typed and what
            // they recognise.
            ...Object.fromEntries(
                SOCIAL_NETWORKS.map((network) => [
                    network.key,
                    socialHandle(network.key, business[network.column]),
                ]),
            ),
            locationName: location?.name ?? "",
            addressLine1: location?.address_line_1 ?? "",
            addressLine2: location?.address_line_2 ?? "",
            city: location?.city ?? "",
            region: location?.region ?? "",
            postalCode: location?.postal_code ?? "",
        },
    });

    // The category field holds an id; the preview card shows its name.
    useEffect(() => {
        getCategoryGroups(createClient())
            .then((groups) =>
                setCategoryNames(
                    new Map(
                        groups.flatMap((group) => [
                            [group.id, group.name] as const,
                            ...group.subcategories.map((sub) => [sub.id, sub.name] as const),
                        ]),
                    ),
                ),
            )
            .catch(() => undefined);
    }, []);

    const draft = useWatch({ control });

    const preview: ListingBusiness = {
        id: businessId,
        slug: business.slug ?? "",
        name: draft.businessName?.trim() || business.name,
        description: draft.description?.trim() || null,
        logoUrl: business.logo_url,
        categoryId: draft.category === OTHER_CATEGORY ? null : (draft.category ?? null),
        categoryName:
            draft.category === OTHER_CATEGORY
                ? draft.otherCategory?.trim() || ""
                : (categoryNames.get(draft.category ?? "") ?? business.category ?? ""),
        area: draft.region?.trim() || draft.city?.trim() || null,
        areaId: null,
        city: draft.city?.trim() || null,
        cityId: null,
        createdAt: new Date().toISOString(),
        offerCount: 0,
        coverImageUrl: business.cover_image_url,
        isSample: false,
        topOffer: null,
    };

    const errorsByTab = {
        profile: [
            "businessName",
            "category",
            "description",
            "website",
            "handle",
            "menuUrl",
            "bookingUrl",
            "phone",
            "contactEmail",
            "googleReviewUrl",
            ...SOCIAL_NETWORKS.map((network) => network.key),
        ],
        location: ["locationName", "addressLine1", "addressLine2", "city", "region", "postalCode"],
    } as const;

    function tabHasError(tab: keyof typeof errorsByTab) {
        return errorsByTab[tab].some((field) => field in errors);
    }

    async function onSubmit(values: Output) {
        setSaved(false);
        setErrorMessage("");

        const supabase = createClient();

        const { error: businessError } = await supabase
            .from("businesses")
            .update({
                name: values.businessName,
                // Their own words are kept as they are: the category
                // text only follows a category once there is one
                // (apply_category_choice()).
                ...(values.category === OTHER_CATEGORY
                    ? { category_id: null, category: values.otherCategory.trim() }
                    : { category_id: values.category }),
                description: values.description || null,
                website_url: values.website || null,
                menu_url: values.menuUrl || null,
                booking_url: values.bookingUrl || null,
                phone: values.phone || null,
                contact_email: values.contactEmail || null,
                google_review_url: values.googleReviewUrl || null,
                // Stored as the full url, whichever way it was typed.
                ...Object.fromEntries(
                    SOCIAL_NETWORKS.map((network) => {
                        const entered = socialUrl(
                            network.key,
                            values[network.key as keyof Output] as string,
                        );

                        return [network.column, "url" in entered ? entered.url : null];
                    }),
                ),
            })
            .eq("id", businessId);

        if (businessError) {
            setErrorMessage(businessError.message);
            return;
        }

        // Last, and separately: it is the one field that can fail
        // because of somebody else, and a taken handle must not take
        // the rest of the save down with it. The old handle keeps
        // working either way (20270313090000).
        if (values.handle && values.handle !== handle) {
            const { error: handleError } = await supabase.rpc("set_business_handle", {
                requested_business_id: businessId,
                requested_handle: values.handle,
            });

            if (handleError) {
                setError("handle", {
                    message: /taken|reserved/i.test(handleError.message)
                        ? handleError.message
                        : "That link could not be changed. Try another.",
                });
                setErrorMessage("Everything else was saved.");
                return;
            }
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
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                            Business settings
                        </p>

                        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                            Business profile
                        </h1>

                        <p className="mt-3 max-w-2xl text-[#17233B]/65">
                            This is where customers land from the directory, your
                            offers and your posters. What you put here is what they
                            read while they decide whether to come in &mdash; the
                            card beside it is how you look to them.
                        </p>
                    </div>

                    {business.slug && (
                        <div className="shrink-0">
                            <Button
                                render={
                                    <Link
                                        href={`/businesses/${business.slug}`}
                                        target="_blank"
                                        rel="noreferrer"
                                    />
                                }
                                nativeButton={false}
                                variant="outline"
                                size="lg"
                            >
                                <FiExternalLink aria-hidden="true" />
                                View profile page
                            </Button>
                        </div>
                    )}
                </div>

                <div className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
                    <Card className="border-[#17233B]/10">
                        <CardContent className="p-6 sm:p-8">
                            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-8">
                                <Tabs defaultValue="profile">
                                    <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-full bg-[#17233B]/5 p-1">
                                        <TabsTrigger value="profile" className="flex-none rounded-full px-4 py-2 data-active:bg-white data-active:shadow-sm">
                                            Profile
                                            {tabHasError("profile") && (
                                                <span aria-hidden="true" className="size-1.5 rounded-full bg-destructive" />
                                            )}
                                        </TabsTrigger>

                                        <TabsTrigger value="photos" className="flex-none rounded-full px-4 py-2 data-active:bg-white data-active:shadow-sm">
                                            Photos
                                        </TabsTrigger>

                                        {location && (
                                            <TabsTrigger value="location" className="flex-none rounded-full px-4 py-2 data-active:bg-white data-active:shadow-sm">
                                                Location
                                                {tabHasError("location") && (
                                                    <span aria-hidden="true" className="size-1.5 rounded-full bg-destructive" />
                                                )}
                                            </TabsTrigger>
                                        )}

                                        <TabsTrigger value="hours" className="flex-none rounded-full px-4 py-2 data-active:bg-white data-active:shadow-sm">
                                            Hours
                                        </TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="photos" keepMounted className="mt-6 space-y-6">
                                        <p className="text-sm leading-6 text-[#17233B]/70">
                                            Your logo and cover photo are cropped and
                                            saved on their own pages, so save any other
                                            changes here first.
                                        </p>

                                {/* The logo has its own page, with cropping, and saves on its own. */}
                                <div className="flex items-center gap-4">
                                    {storedImage(business.logo_url) ? (
                                        <Image
                                            src={storedImage(business.logo_url)!}
                                            alt={`${business.name} logo`}
                                            width={64}
                                            height={64}
                                            className="size-16 rounded-xl border border-[#17233B]/10 object-cover"
                                        />
                                    ) : (
                                        <span className="flex size-16 shrink-0 items-center justify-center rounded-xl border border-dashed border-[#17233B]/20 bg-[#FFF8F0] text-2xl font-semibold text-[#17233B]/40">
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
                                        {storedImage(business.cover_image_url) && (
                                            <Image
                                                src={storedImage(business.cover_image_url)!}
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
                                            {uploadedCover(business.cover_image_url)
                                                ? "Change cover photo"
                                                : "Add cover photo"}
                                        </Button>
                                        <p className="text-xs text-[#17233B]/65">
                                            The big photo at the top of your page. Without one, your newest offer photo is used.
                                        </p>
                                    </div>
                                </div>

                                    </TabsContent>

                                    <TabsContent value="profile" keepMounted className="mt-6 space-y-5">
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
                                        allowOther
                                        defaultValue={
                                            business.category_id ??
                                            (business.category ? OTHER_CATEGORY : null)
                                        }
                                        registration={register("category")}
                                        invalid={invalidProps("category-error", errors.category)}
                                    />
                                    <FieldError id="category-error" message={errors.category?.message} />

                                    {draft.category === OTHER_CATEGORY && (
                                        <div className="space-y-2 pt-2">
                                            <Label htmlFor="otherCategory">
                                                Tell us in a few words what you do
                                            </Label>

                                            <Input
                                                id="otherCategory"
                                                placeholder="e.g. tattoo studio, car garage, nursery"
                                                {...register("otherCategory")}
                                                {...invalidProps(
                                                    "otherCategory-error",
                                                    errors.otherCategory,
                                                )}
                                            />
                                            <FieldError
                                                id="otherCategory-error"
                                                message={errors.otherCategory?.message}
                                            />

                                            <p className="text-sm text-[#17233B]/65">
                                                Your page says this until we add a category for
                                                you.
                                            </p>
                                        </div>
                                    )}
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

                                {/* The one link a business can put in
                                    an Instagram bio, where only one is
                                    allowed. Shown before the website,
                                    because this is the one we are
                                    asking them to use. */}
                                <div className="space-y-2">
                                    <Label htmlFor="handle">Your link</Label>

                                    <div className="flex items-stretch">
                                        <span className="inline-flex items-center rounded-l-lg border border-r-0 border-input bg-muted/40 px-3 text-sm text-[#17233B]/70">
                                            promotello.com/@
                                        </span>
                                        <Input
                                            id="handle"
                                            className="rounded-l-none"
                                            autoCapitalize="none"
                                            spellCheck={false}
                                            placeholder="yourshop"
                                            {...register("handle")}
                                            {...invalidProps("handle-error", errors.handle)}
                                        />
                                    </div>
                                    <FieldError id="handle-error" message={errors.handle?.message} />

                                    <p className="text-xs leading-5 text-[#17233B]/70">
                                        Put it in your Instagram bio: your offers, your card, the
                                        menu and the way to you, on one page.{" "}
                                        {handle && (
                                            <a
                                                href={`/@${handle}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="underline underline-offset-4 hover:text-[#FF593F]"
                                            >
                                                See yours
                                            </a>
                                        )}
                                        {handle ? " " : ""}
                                        Change it whenever you like — the old one keeps working.
                                    </p>
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

                                {/* On the link-in-bio page these are
                                    buttons. Empty simply draws no
                                    button, so nothing has to be filled
                                    in for the page to work. */}
                                <div className="space-y-2">
                                    <Label htmlFor="menuUrl">Menu link</Label>

                                    <Input
                                        id="menuUrl"
                                        type="url"
                                        placeholder="https://example.com/menu"
                                        {...register("menuUrl")}
                                        {...invalidProps("menuUrl-error", errors.menuUrl)}
                                    />
                                    <FieldError id="menuUrl-error" message={errors.menuUrl?.message} />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="bookingUrl">Booking link</Label>

                                    <Input
                                        id="bookingUrl"
                                        type="url"
                                        placeholder="https://example.com/book"
                                        {...register("bookingUrl")}
                                        {...invalidProps("bookingUrl-error", errors.bookingUrl)}
                                    />
                                    <FieldError id="bookingUrl-error" message={errors.bookingUrl?.message} />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone number</Label>

                                    <Input
                                        id="phone"
                                        type="tel"
                                        placeholder="0117 496 0123"
                                        {...register("phone")}
                                        {...invalidProps("phone-error", errors.phone)}
                                    />
                                    <FieldError id="phone-error" message={errors.phone?.message} />
                                    <p className="text-xs leading-5 text-[#17233B]/70">
                                        A Call button on your link-in-bio page. Never put in an email.
                                    </p>
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

                                {/* Most of these places put more into
                                    their Instagram than into any
                                    website, and somebody who has just
                                    found them wants to see the room
                                    before they go. */}
                                <div className="space-y-3 border-t border-[#17233B]/10 pt-6">
                                    <div>
                                        <h3 className="font-medium text-[#17233B]">Social media</h3>
                                        <p className="mt-1 text-xs leading-5 text-[#17233B]/70">
                                            Shown on your page so customers can see what
                                            you&apos;re up to. Your handle is enough — or paste
                                            the link.
                                        </p>
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {SOCIAL_NETWORKS.map((network) => (
                                            <div key={network.key} className="space-y-2">
                                                <Label htmlFor={network.key}>{network.label}</Label>

                                                <Input
                                                    id={network.key}
                                                    placeholder={network.placeholder}
                                                    maxLength={200}
                                                    {...register(network.key as keyof Output)}
                                                    {...invalidProps(
                                                        `${network.key}-error`,
                                                        errors[network.key as keyof typeof errors],
                                                    )}
                                                />

                                                <FieldError
                                                    id={`${network.key}-error`}
                                                    message={
                                                        errors[network.key as keyof typeof errors]
                                                            ?.message as string | undefined
                                                    }
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                    </TabsContent>

                                    {location && (
                                        <TabsContent value="location" keepMounted className="mt-6 space-y-5">
                                            <p className="text-sm leading-6 text-[#17233B]/70">
                                                This location appears on your public business profile.
                                            </p>

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
                                        </TabsContent>
                                    )}

                                    {/* Hours have their own page and save on their own. */}
                                    <TabsContent value="hours" keepMounted className="mt-6 space-y-5">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm leading-6 text-[#17233B]/65">
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
                                    </TabsContent>
                                </Tabs>

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

                    <aside className="lg:sticky lg:top-24">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#17233B]/65">
                            How customers see you
                        </p>

                        {/* Not a link: it's the card from the directory. */}
                        <div className="pointer-events-none mt-3">
                            <BusinessCard business={preview} />
                        </div>

                        <p className="mt-3 text-xs leading-5 text-[#17233B]/65">
                            Your card in the Promotello directory. It updates as
                            you type; the logo and cover photo save on their own
                            pages.
                        </p>
                    </aside>
                </div>
            </div>
        </div>
    );
}