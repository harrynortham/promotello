"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";

import { OfferImageField } from "@/components/offer-image-field";
import { OfferCard } from "@/components/offer-card";
import { OffersHowItWorks } from "../how-it-works";
import {
    OfferFields,
    draftHeadline,
    imageProblem,
    offerRow,
    offerSchema,
    uploadOfferImage,
    type OfferInput,
    type OfferValues,
} from "@/components/offer-fields";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getCategoryGroups } from "@/lib/categories";
import { availabilityLine, availabilityParts } from "@/lib/schedule";
import { createClient } from "@/utils/supabase/client";
import { announceNewOffer } from "./actions";

type NewOfferFormProps = {
    businessId: string;
    businessName: string;
    businessLogoUrl: string | null;
    defaultCategoryId: string | null;
    canSchedule: boolean;
};

const schema = offerSchema();

export default function NewOfferForm({
    businessId,
    businessName,
    businessLogoUrl,
    defaultCategoryId,
    canSchedule,
}: NewOfferFormProps) {
    const [imageFile, setImageFile] = useState<File | null>(null);
    // The cropped image, shown in the preview before it's uploaded.
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const [categoryNames, setCategoryNames] = useState<Map<string, string>>(new Map());
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const created = searchParams.get("created");
    const createdOffer = created === "live" || created === "pending" ? created : null;
    const [errorMessage, setErrorMessage] = useState("");

    const {
        register,
        handleSubmit,
        reset,
        setError,
        clearErrors,
        control,
        setValue,
        getValues,
        formState: { errors, isSubmitting },
    } = useForm<OfferInput, unknown, OfferValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            title: "",
            category: defaultCategoryId ?? "",
            // No type is chosen for them: the picker opens on "Choose a
            // type", so nothing is promised by accident.
            kind: "",
            kindValue: "",
            kindQuantity: "",
            kindItem: "",
            discount: "",
            description: "",
            // Open on the answer most offers have: any time, everyone.
            when: "any",
            availableDays: [],
            availableFrom: "",
            availableUntil: "",
            audience: "everyone",
            enforceSchedule: false,
            expiresAt: "",
            maxRedemptions: "",
            terms: "",
        },
    });

    // The category's name for the preview; the field itself stores its id.
    useEffect(() => {
        getCategoryGroups(createClient())
            .then((groups) =>
                setCategoryNames(
                    new Map(
                        groups.flatMap((group) => [
                            [group.id, group.name] as const,
                            ...group.subcategories.map(
                                (sub) => [sub.id, sub.name] as const,
                            ),
                        ]),
                    ),
                ),
            )
            .catch(() => undefined);
    }, []);

    const draft = useWatch({ control });

    // Placeholders keep the card readable before the fields are filled in.
    const preview = {
        discount: draftHeadline(draft) || "Your offer",
        title: draft.title?.trim() || "Your offer title",
        description:
            draft.description?.trim() ||
            "Your description shows here, so customers know what they get.",
        availability: availabilityLine(availabilityParts(draft)),
        expiresAt: draft.expiresAt || undefined,
        category: draft.category ? categoryNames.get(draft.category) : undefined,
    };

    async function onSubmit(values: OfferValues) {
        setErrorMessage("");

        if (!imageFile) {
            setError("root.image", {
                message: "Add a photo. Offers with one are what people stop at in the listings.",
            });
            return;
        }

        const problem = imageProblem(imageFile);
        if (problem) {
            setError("root.image", { message: problem });
            return;
        }

        const supabase = createClient();

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            setErrorMessage("Please sign in before creating an offer.");
            return;
        }

        let imageUrl: string | null = null;

        if (imageFile) {
            const upload = await uploadOfferImage(supabase, businessId, imageFile);

            if ("error" in upload) {
                setErrorMessage(upload.error ?? "The image couldn't be uploaded.");
                return;
            }

            imageUrl = upload.url;
        }

        // The database sets the slug from the business name and title.
        const { data: inserted, error } = await supabase.from("offers").insert({
            ...offerRow(values),
            business_id: businessId,
            created_by: user.id,
            slug: crypto.randomUUID(),
            redemption_count: 0,
            image_url: imageUrl,
            approval_status: "pending",
        }).select("id").single();

        if (error || !inserted) {
            setErrorMessage(error?.message ?? "We couldn't create the offer.");
            return;
        }

        // Pro businesses' offers go live at once; this also emails followers.
        const { live } = await announceNewOffer(inserted.id).catch(() => ({ live: false }));

        reset();
        setImageFile(null);
        setImagePreviewUrl(null);
        router.replace(`${pathname}?created=${live ? "live" : "pending"}`, { scroll: false });
    }

    if (createdOffer) {
        return (
            <div className="flex items-center justify-center">
                <Card className="w-full max-w-lg border-[#17233B]/10 text-center">
                    <CardContent className="p-8 sm:p-10">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FF593F]/15 text-2xl text-[#FF593F]">
                            ✓
                        </div>

                        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                            {createdOffer === "live" ? "Offer live" : "Offer submitted"}
                        </p>

                        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#17233B]">
                            {createdOffer === "live"
                                ? "Your offer is live"
                                : "Your offer is pending approval"}
                        </h1>

                        <p className="mt-4 leading-7 text-[#17233B]/65">
                            {createdOffer === "live"
                                ? "Customers can see and claim it now, and your followers are getting an email about it."
                                : "Our team reads every offer before customers see it, usually the same day."}
                        </p>

                        {/* What to do next. Creating an offer used to end
                            here, with nothing to say that a poster is how
                            people in the street find it. */}
                        <ol className="mt-7 space-y-3 text-left text-sm leading-6 text-[#17233B]/75">
                            {(createdOffer === "live"
                                ? [
                                    "It's on your page and in the Promotello directory now.",
                                    "Anyone following you is getting an email about it.",
                                    "Put it on a QR poster for your window or your till, so people passing can scan it.",
                                ]
                                : [
                                    "We read it, usually the same day.",
                                    "You get an email the moment it's live, and your followers hear about it then.",
                                    "Once it's approved you can put it on a QR poster, so people in your window or at the till can scan it.",
                                ]
                            ).map((step, index) => (
                                <li key={step} className="flex gap-3">
                                    <span
                                        aria-hidden="true"
                                        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#FFF4E8] text-xs font-semibold text-[#FF593F]"
                                    >
                                        {index + 1}
                                    </span>
                                    {step}
                                </li>
                            ))}
                        </ol>

                        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                            <Button
                                size="lg"
                                render={<Link href={`/business/${businessId}/offers`} />}
                                nativeButton={false}
                                variant="outline"
                            >
                                {createdOffer === "live" ? "View your offers" : "View pending"}
                            </Button>

                            <Button
                                size="lg"
                                type="button"
                                variant="default"
                                onClick={() => router.replace(pathname, { scroll: false })}
                            >
                                Create another
                            </Button>
                        </div>

                        <p className="mt-6 text-sm text-[#17233B]/65">
                            <Link
                                href={`/business/${businessId}/qr`}
                                className="font-medium text-[#17233B] underline underline-offset-4 hover:text-[#FF593F]"
                            >
                                See your QR posters
                            </Link>{" "}
                            {createdOffer === "live"
                                ? "to put this offer in the window."
                                : "— this offer joins them once it's approved."}
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="text-[#17233B]">
            <div>
                <BackButton href={`/business/${businessId}/offers`} />

                <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                            New offer
                        </p>

                        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                            Create an offer
                        </h1>

                        <p className="mt-4 max-w-2xl leading-7 text-[#17233B]/65">
                            Our team reads every offer before customers see it,
                            usually the same day. You will get an email when
                            yours is approved. A few kinds of offer we
                            can&apos;t publish:{" "}
                            <Link
                                href="/legal/restricted-businesses#offer-rules"
                                className="font-medium text-[#17233B] underline underline-offset-4"
                            >
                                see which
                            </Link>
                            .
                        </p>
                    </div>

                    <div className="shrink-0">
                        <OffersHowItWorks />
                    </div>
                </div>

                <div className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <Card className="order-2 border-[#17233B]/10 lg:order-1">
                    <CardHeader>
                        <CardTitle>Offer details</CardTitle>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-7">
                            <OfferImageField
                                disabled={isSubmitting}
                                error={errors.root?.image?.message}
                                onChange={(file, previewUrl) => {
                                    setImageFile(file);
                                    setImagePreviewUrl(previewUrl);
                                    if (file) clearErrors("root.image");
                                }}
                            />

                            <Separator />

                            <OfferFields
                                register={register}
                                errors={errors}
                                control={control}
                                setValue={setValue}
                                getValues={getValues}
                                businessId={businessId}
                                canSchedule={canSchedule}
                                defaultCategoryId={defaultCategoryId}
                            />

                            {errorMessage && (
                                <Alert variant="destructive">
                                    <AlertTitle>Unable to create offer</AlertTitle>

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
                                    ? "Submitting offer…"
                                    : "Submit offer"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <aside className="order-1 lg:order-2 lg:sticky lg:top-8">
                    <div className="rounded-xl border border-[#17233B]/10 bg-[#FFF8F0] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#17233B]/65">
                            Preview
                        </p>

                        {/* Not a link: it's the real card customers see. */}
                        <div className="mt-3 pointer-events-none">
                            <OfferCard
                                slug=""
                                discount={preview.discount}
                                title={preview.title}
                                description={preview.description}
                                availability={preview.availability}
                                expiresAt={preview.expiresAt}
                                category={preview.category}
                                business={businessName}
                                businessLogoUrl={businessLogoUrl}
                                imageUrl={imagePreviewUrl}
                                rawImage
                            />
                        </div>

                        <p className="mt-3 text-xs leading-5 text-[#17233B]/65">
                            How your offer will look to customers as they
                            browse. It updates as you type.
                        </p>
                    </div>
                </aside>
                </div>
            </div>
        </div>
    );
}