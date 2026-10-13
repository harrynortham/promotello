"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";

type EditOfferFormProps = {
    businessId: string;
    offerId: string;
};

type Offer = {
    title: string;
    category: string;
    discount: string;
    description: string;
    availability: string;
    expires_at: string;
    terms: string;
    approval_status: string;
    max_redemptions: number | null;
    redemption_count: number;
    image_url: string | null;
};

const inputClassName =
    "mt-2 w-full rounded-xl border border-[#17233B]/15 bg-white px-4 py-3 text-sm text-[#17233B] outline-none transition placeholder:text-[#17233B]/40 focus:border-[#FF593F] focus:ring-2 focus:ring-[#FF593F]/20";

export default function EditOfferForm({
    businessId,
    offerId,
}: EditOfferFormProps) {
    const router = useRouter();

    const [offer, setOffer] = useState<Offer | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [removeImage, setRemoveImage] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        async function loadOffer() {
            const supabase = createClient();

            const { data, error } = await supabase
                .from("offers")
                .select(
                    `
            title,
            category,
            discount,
            description,
            availability,
            expires_at,
            terms,
            approval_status,
            max_redemptions,
            redemption_count,
            image_url
          `,
                )
                .eq("id", offerId)
                .eq("business_id", businessId)
                .single();

            if (error || !data) {
                setErrorMessage("We couldn't load this promotion.");
            } else {
                setOffer(data);
            }

            setIsLoading(false);
        }

        loadOffer();
    }, [businessId, offerId]);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!offer) {
            return;
        }

        const formData = new FormData(event.currentTarget);
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
            setErrorMessage(
                "The maximum redemptions must be a whole number greater than zero.",
            );
            return;
        }

        if (
            maxRedemptions !== null &&
            maxRedemptions < offer.redemption_count
        ) {
            setErrorMessage(
                `The limit cannot be lower than the ${offer.redemption_count} redemptions already claimed.`,
            );
            return;
        }

        setIsSaving(true);
        setErrorMessage("");

        const supabase = createClient();

        let imageUrl = removeImage ? null : offer.image_url;

        if (imageFile) {
            const allowedTypes = [
                "image/jpeg",
                "image/png",
                "image/webp",
            ];

            if (!allowedTypes.includes(imageFile.type)) {
                setErrorMessage("Please upload a JPG, PNG, or WebP image.");
                setIsSaving(false);
                return;
            }

            if (imageFile.size > 5 * 1024 * 1024) {
                setErrorMessage("The image must be smaller than 5MB.");
                setIsSaving(false);
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
                setErrorMessage(uploadError.message);
                setIsSaving(false);
                return;
            }

            const { data: publicUrlData } = supabase.storage
                .from("offer-images")
                .getPublicUrl(filePath);

            imageUrl = publicUrlData.publicUrl;
        }

        const { error } = await supabase
            .from("offers")
            .update({
                title: formData.get("title"),
                category: formData.get("category"),
                discount: formData.get("discount"),
                description: formData.get("description"),
                availability: formData.get("availability") || "Available now",
                expires_at: formData.get("expiresAt"),
                terms: formData.get("terms"),
                max_redemptions: maxRedemptions,
                image_url: imageUrl,
            })
            .eq("id", offerId)
            .eq("business_id", businessId);

        setIsSaving(false);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        router.push(`/dashboard/${businessId}/offers`);
        router.refresh();
    }

    async function handleDelete() {
        const confirmed = window.confirm(
            "Are you sure you want to delete this promotion?",
        );

        if (!confirmed) {
            return;
        }

        setIsDeleting(true);
        setErrorMessage("");

        const supabase = createClient();

        const { error } = await supabase
            .from("offers")
            .delete()
            .eq("id", offerId)
            .eq("business_id", businessId);

        if (error) {
            setErrorMessage(error.message);
            setIsDeleting(false);
            return;
        }

        router.push(`/dashboard/${businessId}/offers`);
        router.refresh();
    }

    if (isLoading) {
        return (
            <main className="min-h-screen bg-[#FFF8F0] px-6 py-16">
                <div className="mx-auto max-w-2xl">
                    <div className="h-10 animate-pulse rounded bg-white" />
                </div>
            </main>
        );
    }

    if (!offer) {
        return (
            <main className="min-h-screen bg-[#FFF8F0] px-6 py-16">
                <div className="mx-auto max-w-2xl rounded-3xl bg-white p-8">
                    <p className="text-red-700">
                        {errorMessage || "Promotion not found."}
                    </p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-10 text-[#17233B] sm:py-16">
            <div className="mx-auto max-w-2xl">
                <Button
                    render={
                        <Link href={`/dashboard/${businessId}/offers`} />
                    }
                    nativeButton={false}
                    variant="outline"
                    size="sm"
                >
                    ← Back to promotions
                </Button>

                <h1 className="mt-8 text-4xl font-semibold tracking-tight">
                    Edit promotion
                </h1>

                <p className="mt-3 text-[#17233B]/65">
                    Status:{" "}
                    <span className="font-semibold capitalize">
                        {offer.approval_status}
                    </span>
                </p>

                <div className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
                    <p className="text-sm text-[#17233B]/60">
                        Current redemption usage
                    </p>

                    <p className="mt-1 text-2xl font-semibold">
                        {offer.redemption_count} claimed
                    </p>

                    <p className="mt-1 text-sm text-[#17233B]/55">
                        {offer.max_redemptions === null
                            ? "Unlimited total redemptions"
                            : `${offer.max_redemptions} total redemptions allowed`}
                    </p>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="mt-6 space-y-6 rounded-3xl bg-white p-6 shadow-sm sm:p-10"
                >
                    {offer.image_url && !removeImage && (
                        <div>
                            <p className="text-sm font-medium">
                                Current promotion image
                            </p>

                            <img
                                src={offer.image_url}
                                alt={offer.title}
                                className="mt-3 h-52 w-full rounded-2xl object-cover"
                            />
                        </div>
                    )}

                    <label className="block text-sm font-medium">
                        Replace promotion image
                        <input
                            name="image"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(event) => {
                                setImageFile(event.target.files?.[0] ?? null);
                                setRemoveImage(false);
                            }}
                            className="mt-2 block w-full rounded-xl border border-[#17233B]/15 bg-white px-4 py-3 text-sm"
                        />

                        <span className="mt-2 block text-xs text-[#17233B]/50">
                            Use a JPG, PNG, or WebP image under 5MB.
                        </span>
                    </label>

                    {offer.image_url && (
                        <label className="flex items-center gap-3 text-sm font-medium">
                            <input
                                type="checkbox"
                                checked={removeImage}
                                onChange={(event) => {
                                    setRemoveImage(event.target.checked);

                                    if (event.target.checked) {
                                        setImageFile(null);
                                    }
                                }}
                                className="h-4 w-4 accent-[#FF593F]"
                            />
                            Remove current image
                        </label>
                    )}

                    <label className="block text-sm font-medium">
                        Promotion title
                        <input
                            name="title"
                            required
                            minLength={2}
                            maxLength={160}
                            defaultValue={offer.title}
                            className={inputClassName}
                        />
                    </label>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <label className="block text-sm font-medium">
                            Category
                            <input
                                name="category"
                                required
                                defaultValue={offer.category}
                                className={inputClassName}
                            />
                        </label>

                        <label className="block text-sm font-medium">
                            Discount
                            <input
                                name="discount"
                                required
                                defaultValue={offer.discount}
                                className={inputClassName}
                            />
                        </label>
                    </div>

                    <label className="block text-sm font-medium">
                        Description
                        <textarea
                            name="description"
                            required
                            rows={4}
                            defaultValue={offer.description}
                            className={inputClassName}
                        />
                    </label>

                    <label className="block text-sm font-medium">
                        Availability
                        <input
                            name="availability"
                            defaultValue={offer.availability}
                            className={inputClassName}
                        />
                    </label>

                    <label className="block text-sm font-medium">
                        Expiry date
                        <input
                            name="expiresAt"
                            type="date"
                            required
                            defaultValue={offer.expires_at}
                            className={inputClassName}
                        />
                    </label>

                    <div>
                        <label className="block text-sm font-medium">
                            Maximum redemptions
                            <input
                                name="maxRedemptions"
                                type="number"
                                min={offer.redemption_count || 1}
                                step="1"
                                defaultValue={offer.max_redemptions ?? ""}
                                className={inputClassName}
                                placeholder="Leave empty for unlimited"
                            />
                        </label>

                        <p className="mt-2 text-xs leading-5 text-[#17233B]/55">
                            The limit cannot be lower than the number already claimed.
                            Leave empty for unlimited redemptions.
                        </p>
                    </div>

                    <label className="block text-sm font-medium">
                        Terms and conditions
                        <textarea
                            name="terms"
                            required
                            rows={4}
                            defaultValue={offer.terms}
                            className={inputClassName}
                        />
                    </label>

                    {errorMessage && (
                        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                            {errorMessage}
                        </p>
                    )}

                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Button
                            type="submit"
                            disabled={isSaving || isDeleting}
                            variant="default"
                            size="lg"
                        >
                            {isSaving ? "Saving…" : "Save changes"}
                        </Button>

                        <Button
                            type="button"
                            disabled={isSaving || isDeleting}
                            onClick={handleDelete}
                            variant="destructive"
                            size="lg"
                        >
                            {isDeleting ? "Deleting…" : "Delete promotion"}
                        </Button>
                    </div>
                </form>
            </div>
        </main>
    );
}