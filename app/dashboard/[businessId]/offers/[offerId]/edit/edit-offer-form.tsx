"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
};

const inputClassName =
    "mt-2 w-full rounded-xl border border-[#17233B]/15 bg-white px-4 py-3 text-sm text-[#17233B] outline-none transition placeholder:text-[#17233B]/40 focus:border-[#FF593F] focus:ring-2 focus:ring-[#FF593F]/20";

export default function EditOfferForm({
    businessId,
    offerId,
}: EditOfferFormProps) {
    const router = useRouter();

    const [offer, setOffer] = useState<Offer | null>(null);
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
                    "title, category, discount, description, availability, expires_at, terms, approval_status",
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

        const formData = new FormData(event.currentTarget);

        setIsSaving(true);
        setErrorMessage("");

        const supabase = createClient();

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
                <Link
                    href={`/dashboard/${businessId}/offers`}
                    className="text-sm font-semibold text-[#FF593F]"
                >
                    ← Back to promotions
                </Link>

                <h1 className="mt-8 text-4xl font-semibold tracking-tight">
                    Edit promotion
                </h1>

                <p className="mt-3 text-[#17233B]/65">
                    Status:{" "}
                    <span className="font-semibold capitalize">
                        {offer.approval_status}
                    </span>
                </p>

                <form
                    onSubmit={handleSubmit}
                    className="mt-10 space-y-6 rounded-3xl bg-white p-6 shadow-sm sm:p-10"
                >
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
                        <button
                            type="submit"
                            disabled={isSaving || isDeleting}
                            className="rounded-xl bg-[#FF593F] px-6 py-3 font-semibold transition hover:bg-[#E94D36] disabled:opacity-60"
                        >
                            {isSaving ? "Saving…" : "Save changes"}
                        </button>

                        <button
                            type="button"
                            disabled={isSaving || isDeleting}
                            onClick={handleDelete}
                            className="rounded-xl bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                        >
                            {isDeleting ? "Deleting…" : "Delete promotion"}
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
}