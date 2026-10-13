"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
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

const inputClassName =
    "mt-2 w-full rounded-xl border border-[#17233B]/15 bg-white px-4 py-3 text-sm text-[#17233B] outline-none transition placeholder:text-[#17233B]/40 focus:border-[#FF593F] focus:ring-2 focus:ring-[#FF593F]/20";

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
    const [hours, setHours] = useState<DayHours[]>(createDefaultHours());
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        async function loadBusiness() {
            const supabase = createClient();

            const { data: businessData, error: businessError } = await supabase
                .from("businesses")
                .select(
                    "name, category, description, website_url, contact_email, logo_url",
                )
                .eq("id", businessId)
                .single();

            const { data: locationData, error: locationError } = await supabase
                .from("business_locations")
                .select(
                    "id, name, address_line_1, address_line_2, city, region, postal_code, country_code",
                )
                .eq("business_id", businessId)
                .order("created_at", { ascending: true })
                .limit(1)
                .maybeSingle();

            const { data: hoursData, error: hoursError } = await supabase
                .from("business_hours")
                .select("day_of_week, is_closed, opens_at, closes_at")
                .eq("business_id", businessId)
                .order("day_of_week", { ascending: true });

            if (businessError || locationError || hoursError || !businessData) {
                setErrorMessage("We couldn't load this business.");
            } else {
                setBusiness(businessData);
                setLocation(locationData);

                const loadedHours = createDefaultHours();

                for (const item of (hoursData ?? []) as BusinessHour[]) {
                    if (item.day_of_week >= 0 && item.day_of_week <= 6) {
                        loadedHours[item.day_of_week] = {
                            isClosed: item.is_closed,
                            opensAt: item.opens_at?.slice(0, 5) ?? "09:00",
                            closesAt: item.closes_at?.slice(0, 5) ?? "17:00",
                        };
                    }
                }

                setHours(loadedHours);
            }

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
                    <div className="h-96 animate-pulse rounded-3xl bg-white" />
                </div>
            </main>
        );
    }

    if (!business) {
        return (
            <main className="min-h-screen bg-[#FFF8F0] px-6 py-16">
                <div className="mx-auto max-w-2xl rounded-3xl bg-white p-8">
                    <p className="text-red-700">
                        {errorMessage || "Business not found."}
                    </p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-10 text-[#17233B] sm:py-16">
            <div className="mx-auto max-w-2xl">
                <Button
                    render={<Link href="/dashboard" />}
                    nativeButton={false}
                    variant="outline"
                    size="sm"
                >
                    ← Back to dashboard
                </Button>

                <h1 className="mt-8 text-4xl font-semibold tracking-tight">
                    Edit business
                </h1>

                <p className="mt-3 text-[#17233B]/65">
                    Keep your business information up to date.
                </p>

                <form
                    onSubmit={handleSubmit}
                    className="mt-10 space-y-8 rounded-3xl bg-white p-6 shadow-sm sm:p-10"
                >
                    <fieldset className="space-y-5">
                        <legend className="text-xl font-semibold">
                            Business details
                        </legend>

                        {business.logo_url && (
                            <img
                                src={business.logo_url}
                                alt={`${business.name} logo`}
                                className="h-24 w-24 rounded-2xl object-cover"
                            />
                        )}

                        <label className="block text-sm font-medium">
                            Business logo
                            <input
                                name="logo"
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                onChange={(event) =>
                                    setLogoFile(event.target.files?.[0] ?? null)
                                }
                                className="mt-2 block w-full rounded-xl border border-[#17233B]/15 bg-white px-4 py-3 text-sm"
                            />
                            <span className="mt-2 block text-xs text-[#17233B]/50">
                                Use a PNG, JPG, or WebP image.
                            </span>
                        </label>

                        <label className="block text-sm font-medium">
                            Business name
                            <input
                                name="businessName"
                                required
                                defaultValue={business.name}
                                className={inputClassName}
                            />
                        </label>

                        <label className="block text-sm font-medium">
                            Category
                            <input
                                name="category"
                                required
                                defaultValue={business.category}
                                className={inputClassName}
                            />
                        </label>

                        <label className="block text-sm font-medium">
                            Description
                            <textarea
                                name="description"
                                rows={4}
                                defaultValue={business.description ?? ""}
                                className={inputClassName}
                            />
                        </label>

                        <label className="block text-sm font-medium">
                            Website
                            <input
                                name="website"
                                type="url"
                                defaultValue={business.website_url ?? ""}
                                className={inputClassName}
                                placeholder="https://example.com"
                            />
                        </label>

                        <label className="block text-sm font-medium">
                            Contact email
                            <input
                                name="contactEmail"
                                type="email"
                                defaultValue={business.contact_email ?? ""}
                                className={inputClassName}
                            />
                        </label>
                    </fieldset>

                    {location && (
                        <fieldset className="space-y-5 border-t border-[#17233B]/10 pt-8">
                            <legend className="text-xl font-semibold">
                                Main location
                            </legend>

                            <label className="block text-sm font-medium">
                                Location name
                                <input
                                    name="locationName"
                                    defaultValue={location.name}
                                    className={inputClassName}
                                />
                            </label>

                            <label className="block text-sm font-medium">
                                Address line 1
                                <input
                                    name="addressLine1"
                                    required
                                    defaultValue={location.address_line_1}
                                    className={inputClassName}
                                />
                            </label>

                            <label className="block text-sm font-medium">
                                Address line 2
                                <input
                                    name="addressLine2"
                                    defaultValue={location.address_line_2 ?? ""}
                                    className={inputClassName}
                                />
                            </label>

                            <div className="grid gap-5 sm:grid-cols-2">
                                <label className="block text-sm font-medium">
                                    City
                                    <input
                                        name="city"
                                        required
                                        defaultValue={location.city}
                                        className={inputClassName}
                                    />
                                </label>

                                <label className="block text-sm font-medium">
                                    Region
                                    <input
                                        name="region"
                                        defaultValue={location.region ?? ""}
                                        className={inputClassName}
                                    />
                                </label>
                            </div>

                            <div className="grid gap-5 sm:grid-cols-2">
                                <label className="block text-sm font-medium">
                                    Postcode
                                    <input
                                        name="postalCode"
                                        defaultValue={location.postal_code ?? ""}
                                        className={inputClassName}
                                    />
                                </label>

                                <label className="block text-sm font-medium">
                                    Country code
                                    <input
                                        name="countryCode"
                                        maxLength={2}
                                        defaultValue={location.country_code}
                                        className={inputClassName}
                                    />
                                </label>
                            </div>
                        </fieldset>
                    )}

                    <fieldset className="space-y-5 border-t border-[#17233B]/10 pt-8">
                        <legend className="text-xl font-semibold">
                            Opening hours
                        </legend>

                        <p className="text-sm leading-6 text-[#17233B]/65">
                            Set the hours customers can visit your business.
                        </p>

                        <div className="space-y-4">
                            {days.map((day, index) => (
                                <div
                                    key={day}
                                    className="rounded-2xl border border-[#17233B]/10 p-4"
                                >
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                        <label className="flex items-center gap-3 text-sm font-semibold">
                                            <input
                                                type="checkbox"
                                                checked={!hours[index].isClosed}
                                                onChange={(event) =>
                                                    updateHours(
                                                        index,
                                                        "isClosed",
                                                        !event.target.checked,
                                                    )
                                                }
                                                className="h-4 w-4 rounded border-[#17233B]/30 accent-[#FF593F]"
                                            />
                                            {day}
                                        </label>

                                        {hours[index].isClosed ? (
                                            <span className="text-sm text-[#17233B]/55">
                                                Closed
                                            </span>
                                        ) : (
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="time"
                                                    value={hours[index].opensAt}
                                                    onChange={(event) =>
                                                        updateHours(
                                                            index,
                                                            "opensAt",
                                                            event.target.value,
                                                        )
                                                    }
                                                    className="rounded-lg border border-[#17233B]/15 px-3 py-2 text-sm"
                                                />

                                                <span className="text-sm text-[#17233B]/50">
                                                    to
                                                </span>

                                                <input
                                                    type="time"
                                                    value={hours[index].closesAt}
                                                    onChange={(event) =>
                                                        updateHours(
                                                            index,
                                                            "closesAt",
                                                            event.target.value,
                                                        )
                                                    }
                                                    className="rounded-lg border border-[#17233B]/15 px-3 py-2 text-sm"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </fieldset>

                    {errorMessage && (
                        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                            {errorMessage}
                        </p>
                    )}

                    {saved && (
                        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                            Business details saved successfully.
                        </p>
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
            </div>
        </main>
    );
}