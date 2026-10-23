"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert";
import { CategorySelect } from "@/components/category-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/utils/supabase/client";

export default function OnboardingPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [businessId, setBusinessId] = useState("");

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const form = event.currentTarget;
        const formData = new FormData(form);

        setIsSubmitting(true);
        setErrorMessage("");
        setBusinessId("");

        const supabase = createClient();

        const { data, error } = await supabase.rpc(
            "create_business_with_owner",
            {
                business_name: formData.get("businessName"),
                business_category: formData.get("category"),
                business_description: formData.get("description") || null,
                business_website_url: formData.get("website") || null,
                business_contact_email:
                    formData.get("contactEmail") || null,
                location_name:
                    formData.get("locationName") || "Main location",
                location_address_line_1: formData.get("addressLine1"),
                location_address_line_2:
                    formData.get("addressLine2") || null,
                location_city: formData.get("city"),
                location_region: formData.get("region") || null,
                location_postal_code:
                    formData.get("postalCode") || null,
                location_country_code:
                    formData.get("countryCode") || "GB",
            },
        );

        setIsSubmitting(false);

        if (error) {
            setErrorMessage(
                error.message.includes("Authentication is required")
                    ? "Please sign in before creating a business."
                    : error.message,
            );

            return;
        }

        setBusinessId(data);
        form.reset();
    }

    if (businessId) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#FFF8F0] px-6 py-12">
                <Card className="w-full max-w-lg border-[#17233B]/10 text-center shadow-sm">
                    <CardContent className="p-8 sm:p-10">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FF593F]/15 text-2xl text-[#FF593F]">
                            ✓
                        </div>

                        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                            Business created
                        </p>

                        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#17233B]">
                            Welcome to Promotello
                        </h1>

                        <p className="mt-3 leading-7 text-[#17233B]/65">
                            Your business is pending approval. You can now continue
                            building your first promotion.
                        </p>

                        <Button
                            render={<Link href="/business/dashboard" />}
                            nativeButton={false}
                            variant="default"
                            size="lg"
                            className="mt-8"
                        >
                            Open business dashboard
                        </Button>
                    </CardContent>
                </Card>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-10 text-[#17233B] sm:py-16">
            <div className="mx-auto max-w-2xl">
                <Button
                    render={<Link href="/" />}
                    nativeButton={false}
                    variant="outline"
                    size="sm"
                >
                    ← Back to Promotello
                </Button>

                <div className="mt-8">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                        Business onboarding
                    </p>

                    <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                        Tell us about your business
                    </h1>

                    <p className="mt-4 max-w-xl leading-7 text-[#17233B]/65">
                        Create your business profile and add its first location. Your
                        profile will be reviewed before it appears publicly.
                    </p>
                </div>

                <Card className="mt-10 border-[#17233B]/10 shadow-sm">
                    <CardHeader>
                        <CardTitle>Business details</CardTitle>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-8">
                            <section className="space-y-5">
                                <div className="space-y-2">
                                    <Label htmlFor="businessName">
                                        Business name
                                    </Label>

                                    <Input
                                        id="businessName"
                                        name="businessName"
                                        required
                                        minLength={2}
                                        maxLength={160}
                                        placeholder="Harbor Coffee"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="category">Category</Label>

                                    <CategorySelect
                                        id="category"
                                        name="category"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description">
                                        Description
                                    </Label>

                                    <Textarea
                                        id="description"
                                        name="description"
                                        maxLength={5000}
                                        rows={5}
                                        placeholder="Tell customers what makes your business special"
                                    />
                                </div>

                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="website">Website</Label>

                                        <Input
                                            id="website"
                                            name="website"
                                            type="url"
                                            placeholder="https://example.com"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="contactEmail">
                                            Contact email
                                        </Label>

                                        <Input
                                            id="contactEmail"
                                            name="contactEmail"
                                            type="email"
                                            placeholder="hello@example.com"
                                        />
                                    </div>
                                </div>
                            </section>

                            <Separator />

                            <section className="space-y-5">
                                <div>
                                    <h2 className="text-xl font-semibold">
                                        First location
                                    </h2>

                                    <p className="mt-1 text-sm text-[#17233B]/60">
                                        Add the main location customers can visit.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="locationName">
                                        Location name
                                    </Label>

                                    <Input
                                        id="locationName"
                                        name="locationName"
                                        placeholder="Main location"
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
                                        minLength={2}
                                        maxLength={200}
                                        placeholder="12 Harbour Street"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="addressLine2">
                                        Address line 2
                                    </Label>

                                    <Input
                                        id="addressLine2"
                                        name="addressLine2"
                                        placeholder="Suite 2"
                                    />
                                </div>

                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="city">City</Label>

                                        <Input
                                            id="city"
                                            name="city"
                                            required
                                            minLength={2}
                                            maxLength={100}
                                            placeholder="Bristol"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="region">Region</Label>

                                        <Input
                                            id="region"
                                            name="region"
                                            placeholder="Somerset"
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="postalCode">Postcode</Label>

                                        <Input
                                            id="postalCode"
                                            name="postalCode"
                                            placeholder="BS1 1AA"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="countryCode">
                                            Country code
                                        </Label>

                                        <Input
                                            id="countryCode"
                                            name="countryCode"
                                            defaultValue="GB"
                                            maxLength={2}
                                        />
                                    </div>
                                </div>
                            </section>

                            {errorMessage && (
                                <Alert variant="destructive">
                                    <AlertTitle>Unable to create business</AlertTitle>

                                    <AlertDescription>
                                        {errorMessage}
                                    </AlertDescription>
                                </Alert>
                            )}

                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                variant="default"
                                size="lg"
                                className="w-full"
                            >
                                {isSubmitting
                                    ? "Creating your business…"
                                    : "Create business"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}