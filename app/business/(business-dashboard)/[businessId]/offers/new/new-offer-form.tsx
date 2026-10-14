"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";

type NewOfferFormProps = {
    businessId: string;
};

const inputClassName =
    "mt-2 w-full rounded-xl border border-[#17233B]/15 bg-white px-4 py-3 text-sm text-[#17233B] outline-none transition placeholder:text-[#17233B]/40 focus:border-[#FF593F] focus:ring-2 focus:ring-[#FF593F]/20";

function createSlug(title: string) {
    const baseSlug = title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    return `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;
}

export default function NewOfferForm({
    businessId,
}: NewOfferFormProps) {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [createdOffer, setCreatedOffer] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const form = event.currentTarget;
        const formData = new FormData(form);

        setIsSubmitting(true);
        setErrorMessage("");

        const supabase = createClient();

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            setIsSubmitting(false);
            setErrorMessage("Please sign in before creating a promotion.");
            return;
        }

        const title = String(formData.get("title") ?? "");

        const maxRedemptionsValue = String(
            formData.get("maxRedemptions") ?? "",
        ).trim();

        const maxRedemptions = maxRedemptionsValue
            ? Number(maxRedemptionsValue)
            : null;

        if (
            maxRedemptions !== null &&
            (!Number.isInteger(maxRedemptions) || maxRedemptions <= 0)
        ) {
            setIsSubmitting(false);
            setErrorMessage(
                "The maximum redemptions must be a whole number greater than zero.",
            );
            return;
        }

        let imageUrl: string | null = null;

        if (imageFile) {
            const allowedTypes = [
                "image/jpeg",
                "image/png",
                "image/webp",
            ];

            if (!allowedTypes.includes(imageFile.type)) {
                setIsSubmitting(false);
                setErrorMessage("Please upload a JPG, PNG, or WebP image.");
                return;
            }

            if (imageFile.size > 5 * 1024 * 1024) {
                setIsSubmitting(false);
                setErrorMessage("The image must be smaller than 5MB.");
                return;
            }

            const fileExtension = imageFile.name.split(".").pop() ?? "jpg";
            const filePath = `${businessId}/offer-${crypto.randomUUID()}.${fileExtension}`;

            const { error: uploadError } = await supabase.storage
                .from("offer-images")
                .upload(filePath, imageFile, {
                    upsert: false,
                    contentType: imageFile.type,
                });

            if (uploadError) {
                setIsSubmitting(false);
                setErrorMessage(uploadError.message);
                return;
            }

            const { data: publicUrlData } = supabase.storage
                .from("offer-images")
                .getPublicUrl(filePath);

            imageUrl = publicUrlData.publicUrl;
        }

        const { error } = await supabase.from("offers").insert({
            business_id: businessId,
            created_by: user.id,
            slug: createSlug(title),
            category: formData.get("category"),
            discount: formData.get("discount"),
            title,
            description: formData.get("description"),
            availability: formData.get("availability") || "Available now",
            expires_at: formData.get("expiresAt"),
            terms: formData.get("terms"),
            max_redemptions: maxRedemptions,
            redemption_count: 0,
            image_url: imageUrl,
            approval_status: "pending",
        });

        setIsSubmitting(false);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        form.reset();
        setImageFile(null);
        setCreatedOffer(true);
    }

    if (createdOffer) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#FFF8F0] px-6 py-12">
                <section className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm sm:p-10">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FF593F]/15 text-2xl">
                        ✓
                    </div>

                    <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                        Promotion submitted
                    </p>

                    <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                        Your promotion is pending approval
                    </h1>

                    <p className="mt-4 leading-7 text-[#17233B]/65">
                        Once approved, it will become visible to customers.
                    </p>

                    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                        <Button
                            render={<Link href="/business/dashboard" />}
                            nativeButton={false}
                            variant="outline"
                        >
                            Back to dashboard
                        </Button>

                        <Button
                            type="button"
                            variant="default"
                            onClick={() => setCreatedOffer(false)}
                        >
                            Create another
                        </Button>
                    </div>
                </section>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-10 text-[#17233B] sm:py-16">
            <div className="mx-auto max-w-2xl">
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
                        New promotion
                    </p>

                    <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                        Create a promotion
                    </h1>

                    <p className="mt-4 leading-7 text-[#17233B]/65">
                        Submit a promotion for review. Approved promotions will appear
                        publicly on Promotello.
                    </p>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="mt-10 space-y-6 rounded-3xl bg-white p-6 shadow-sm sm:p-10"
                >
                    <label className="block text-sm font-medium">
                        Promotion image
                        <input
                            name="image"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(event) =>
                                setImageFile(event.target.files?.[0] ?? null)
                            }
                            className="mt-2 block w-full rounded-xl border border-[#17233B]/15 bg-white px-4 py-3 text-sm"
                        />

                        <span className="mt-2 block text-xs text-[#17233B]/50">
                            Optional. Use a JPG, PNG, or WebP image under 5MB.
                        </span>
                    </label>

                    <label className="block text-sm font-medium">
                        Promotion title <span className="text-[#FF593F]">*</span>
                        <input
                            name="title"
                            required
                            minLength={2}
                            maxLength={160}
                            className={inputClassName}
                            placeholder="20% off your next coffee"
                        />
                    </label>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <label className="block text-sm font-medium">
                            Category <span className="text-[#FF593F]">*</span>
                            <input
                                name="category"
                                required
                                minLength={2}
                                maxLength={100}
                                className={inputClassName}
                                placeholder="Food & drink"
                            />
                        </label>

                        <label className="block text-sm font-medium">
                            Discount <span className="text-[#FF593F]">*</span>
                            <input
                                name="discount"
                                required
                                maxLength={100}
                                className={inputClassName}
                                placeholder="20% off"
                            />
                        </label>
                    </div>

                    <label className="block text-sm font-medium">
                        Description <span className="text-[#FF593F]">*</span>
                        <textarea
                            name="description"
                            required
                            minLength={2}
                            maxLength={5000}
                            rows={4}
                            className={inputClassName}
                            placeholder="Describe what customers will receive."
                        />
                    </label>

                    <label className="block text-sm font-medium">
                        Availability
                        <input
                            name="availability"
                            maxLength={160}
                            className={inputClassName}
                            placeholder="Available this weekend"
                        />
                    </label>

                    <label className="block text-sm font-medium">
                        Expiry date <span className="text-[#FF593F]">*</span>
                        <input
                            name="expiresAt"
                            type="date"
                            required
                            className={inputClassName}
                        />
                    </label>

                    <div>
                        <label className="block text-sm font-medium">
                            Maximum redemptions
                            <input
                                name="maxRedemptions"
                                type="number"
                                min="1"
                                step="1"
                                className={inputClassName}
                                placeholder="Leave empty for unlimited"
                            />
                        </label>

                        <p className="mt-2 text-xs leading-5 text-[#17233B]/55">
                            Set a limit to create scarcity or control your campaign budget.
                            Leave this empty to allow unlimited redemptions.
                        </p>
                    </div>

                    <label className="block text-sm font-medium">
                        Terms and conditions <span className="text-[#FF593F]">*</span>
                        <textarea
                            name="terms"
                            required
                            minLength={2}
                            maxLength={5000}
                            rows={4}
                            className={inputClassName}
                            placeholder="Valid once per customer. Cannot be combined with other offers."
                        />
                    </label>

                    {errorMessage && (
                        <p
                            role="alert"
                            className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
                        >
                            {errorMessage}
                        </p>
                    )}

                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        variant="default"
                        size="lg"
                        className="w-full"
                    >
                        {isSubmitting ? "Submitting promotion…" : "Submit promotion"}
                    </Button>
                </form>
            </div>
        </main>
    );
}