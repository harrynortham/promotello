"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Image from "next/image";

import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/utils/supabase/client";

type EditBusinessFormProps = {
    businessId: string;
};

type Business = {
    name: string;
    category: string;
    description: string | null;
    website_url: string | null;
    contact_email: string | null;
    logo_url: string | null;
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

export default function EditBusinessForm({
    businessId,
}: EditBusinessFormProps) {
    const router = useRouter();

    const [business, setBusiness] = useState<Business | null>(null);
    const [location, setLocation] = useState<Location | null>(null);
    const [hours, setHours] = useState<DayHours[]>(
        createDefaultHours(),
    );
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        async function loadBusiness() {
            const supabase = createClient();

            const [{ data: businessData, error: businessError }, locationResult, hoursResult] =
                await Promise.all([
                    supabase
                        .from("businesses")
                        .select(
                            "name, category, description, website_url, contact_email, logo_url",
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

            setBusiness(businessData);
            setLocation(locationResult.data);

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

            setHours(loadedHours);
            setIsLoading(false);
        }

        loadBusiness();
    }, [businessId]);

    function updateHours(
        dayIndex: number,
        field: keyof DayHours,
        value: boolean | string,
    ) {
        setHours((current) =>
            current.map((day, index) =>
                index === dayIndex
                    ? {
                        ...day,
                        [field]: value,
                    }
                    : day,
            ),
        );
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const form = event.currentTarget;
        const formData = new FormData(form);

        setIsSaving(true);
        setSaved(false);
        setErrorMessage("");

        const supabase = createClient();

        let logoUrl = business?.logo_url ?? null;

        if (logoFile) {
            const allowedTypes = [
                "image/png",
                "image/jpeg",
                "image/webp",
            ];

            if (!allowedTypes.includes(logoFile.type)) {
                setErrorMessage("Please upload a PNG, JPG or WebP image.");
                setIsSaving(false);
                return;
            }

            if (logoFile.size > 5 * 1024 * 1024) {
                setErrorMessage("The logo must be smaller than 5MB.");
                setIsSaving(false);
                return;
            }

            const fileExtension = logoFile.name.split(".").pop() ?? "jpg";
            const filePath = `${businessId}/logo-${Date.now()}.${fileExtension}`;

            const { error: uploadError } = await supabase.storage
                .from("business-logos")
                .upload(filePath, logoFile, {
                    upsert: true,
                    contentType: logoFile.type,
                });

            if (uploadError) {
                setErrorMessage(uploadError.message);
                setIsSaving(false);
                return;
            }

            const { data: publicUrlData } = supabase.storage
                .from("business-logos")
                .getPublicUrl(filePath);

            logoUrl = publicUrlData.publicUrl;
        }

        const { error: businessError } = await supabase
            .from("businesses")
            .update({
                name: formData.get("businessName"),
                category: formData.get("category"),
                description: formData.get("description") || null,
                website_url: formData.get("website") || null,
                contact_email: formData.get("contactEmail") || null,
                logo_url: logoUrl,
            })
            .eq("id", businessId);

        if (businessError) {
            setErrorMessage(businessError.message);
            setIsSaving(false);
            return;
        }

        if (location) {
            const { error: locationError } = await supabase
                .from("business_locations")
                .update({
                    name: formData.get("locationName"),
                    address_line_1: formData.get("addressLine1"),
                    address_line_2: formData.get("addressLine2") || null,
                    city: formData.get("city"),
                    region: formData.get("region") || null,
                    postal_code: formData.get("postalCode") || null,
                    country_code: String(
                        formData.get("countryCode") || "GB",
                    ).toUpperCase(),
                })
                .eq("id", location.id)
                .eq("business_id", businessId);

            if (locationError) {
                setErrorMessage(locationError.message);
                setIsSaving(false);
                return;
            }
        }

        const hoursRows = hours.map((day, dayOfWeek) => ({
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
            setIsSaving(false);
            return;
        }

        setBusiness((current) =>
            current
                ? {
                    ...current,
                    logo_url: logoUrl,
                }
                : current,
        );

        setLogoFile(null);
        setIsSaving(false);
        setSaved(true);
        router.refresh();
    }

    if (isLoading) {
        return (
            <main className="min-h-screen bg-[#FFF8F0] px-6 py-16">
                <div className="mx-auto max-w-2xl">
                    <div className="h-96 animate-pulse rounded-xl bg-white" />
                </div>
            </main>
        );
    }

    if (!business) {
        return (
            <main className="min-h-screen bg-[#FFF8F0] px-6 py-16">
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
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-10 text-[#17233B] sm:py-16">
            <div className="mx-auto max-w-3xl">
                <Button
                    render={<Link href="/business/dashboard" />}
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
                        <form onSubmit={handleSubmit} className="space-y-10">
                            <section className="space-y-5">
                                <div>
                                    <h2 className="text-xl font-semibold">
                                        Business details
                                    </h2>

                                    <p className="mt-1 text-sm text-[#17233B]/60">
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

                                    <p className="text-xs text-[#17233B]/50">
                                        Use a PNG, JPG or WebP image under 5MB.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="businessName">Business name</Label>

                                    <Input
                                        id="businessName"
                                        name="businessName"
                                        required
                                        defaultValue={business.name}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="category">Category</Label>

                                    <Input
                                        id="category"
                                        name="category"
                                        required
                                        defaultValue={business.category}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>

                                    <Textarea
                                        id="description"
                                        name="description"
                                        rows={5}
                                        defaultValue={business.description ?? ""}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="website">Website</Label>

                                    <Input
                                        id="website"
                                        name="website"
                                        type="url"
                                        defaultValue={business.website_url ?? ""}
                                        placeholder="https://example.com"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="contactEmail">Contact email</Label>

                                    <Input
                                        id="contactEmail"
                                        name="contactEmail"
                                        type="email"
                                        defaultValue={business.contact_email ?? ""}
                                    />
                                </div>
                            </section>

                            <Separator />

                            {location && (
                                <section className="space-y-5">
                                    <div>
                                        <h2 className="text-xl font-semibold">
                                            Main location
                                        </h2>

                                        <p className="mt-1 text-sm text-[#17233B]/60">
                                            This location appears on your public business profile.
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="locationName">Location name</Label>

                                        <Input
                                            id="locationName"
                                            name="locationName"
                                            defaultValue={location.name}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="addressLine1">
                                            Address line 1
                                        </Label>

                                        <Input
                                            id="addressLine1"
                                            name="addressLine1"
                                            required
                                            defaultValue={location.address_line_1}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="addressLine2">
                                            Address line 2
                                        </Label>

                                        <Input
                                            id="addressLine2"
                                            name="addressLine2"
                                            defaultValue={location.address_line_2 ?? ""}
                                        />
                                    </div>

                                    <div className="grid gap-5 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="city">City</Label>

                                            <Input
                                                id="city"
                                                name="city"
                                                required
                                                defaultValue={location.city}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="region">Region</Label>

                                            <Input
                                                id="region"
                                                name="region"
                                                defaultValue={location.region ?? ""}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-5 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="postalCode">Postcode</Label>

                                            <Input
                                                id="postalCode"
                                                name="postalCode"
                                                defaultValue={location.postal_code ?? ""}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="countryCode">
                                                Country code
                                            </Label>

                                            <Input
                                                id="countryCode"
                                                name="countryCode"
                                                maxLength={2}
                                                defaultValue={location.country_code}
                                            />
                                        </div>
                                    </div>
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
                                        <Card
                                            key={day}
                                            className="border-[#17233B]/10 shadow-none"
                                        >
                                            <CardContent className="p-4">
                                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <Checkbox
                                                            id={`open-${index}`}
                                                            checked={!hours[index].isClosed}
                                                            onCheckedChange={(checked) =>
                                                                updateHours(
                                                                    index,
                                                                    "isClosed",
                                                                    checked !== true,
                                                                )
                                                            }
                                                        />

                                                        <Label htmlFor={`open-${index}`}>
                                                            {day}
                                                        </Label>
                                                    </div>

                                                    {hours[index].isClosed ? (
                                                        <span className="text-sm text-[#17233B]/55">
                                                            Closed
                                                        </span>
                                                    ) : (
                                                        <div className="flex items-center gap-3">
                                                            <Input
                                                                type="time"
                                                                value={hours[index].opensAt}
                                                                onChange={(event) =>
                                                                    updateHours(
                                                                        index,
                                                                        "opensAt",
                                                                        event.target.value,
                                                                    )
                                                                }
                                                                className="w-auto"
                                                            />

                                                            <span className="text-sm text-[#17233B]/50">
                                                                to
                                                            </span>

                                                            <Input
                                                                type="time"
                                                                value={hours[index].closesAt}
                                                                onChange={(event) =>
                                                                    updateHours(
                                                                        index,
                                                                        "closesAt",
                                                                        event.target.value,
                                                                    )
                                                                }
                                                                className="w-auto"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
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
        </main>
    );
}