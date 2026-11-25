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
import { FiArrowRight } from "react-icons/fi";

import { announceNewOffer } from "./actions";
import { OfferStarters } from "@/components/offer-starters";
import { DEFAULT_TERMS, templatesFor, type OfferTemplate } from "@/lib/offer-templates";

type NewOfferFormProps = {
    businessId: string;
    businessName: string;
    businessLogoUrl: string | null;
    defaultCategoryId: string | null;
    // The offer line from their preview email, when they came in by
    // "Use this offer" on the dashboard.
    suggestedTitle?: string | null;
    // How many people follow this business. Nought for anybody who has
    // just signed up, which is most people seeing this screen.
    followers: number;
    // The business's top-level category, for picking offers to start
    // from. Null shows the ones that suit any trade.
    categorySlug?: string | null;
    // Set only on Free, and only once the plan's one poster is spent:
    // which poster it is and what it currently opens. Telling somebody
    // here to put this offer on a poster would be telling them to do
    // something their plan refuses.
    spentPoster: { codeId: string; pointsAt: string | null } | null;
    canSchedule: boolean;
};

const schema = offerSchema();

export default function NewOfferForm({
    businessId,
    businessName,
    businessLogoUrl,
    defaultCategoryId,
    suggestedTitle = null,
    followers,
    categorySlug = null,
    spentPoster,
    canSchedule,
}: NewOfferFormProps) {
    const [imageFile, setImageFile] = useState<File | null>(null);
    // The cropped image, shown in the preview before it's uploaded.
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const [categoryNames, setCategoryNames] = useState<Map<string, string>>(new Map());
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Every offer waits for a person, on every plan: 20261107090000
    // dropped the auto-approve trigger, because "Plans now buy more
    // offers and more reach, not a way past review." So there is no
    // "live" branch to write here — it was unreachable from this form
    // for a year, and two of us edited it believing it was on screen.
    const createdOffer = searchParams.get("created") === "pending";

    // The Free plan includes one poster. Once it is spent, "put it on a
    // poster" is advice they cannot take, so the step says what they have
    // and what another would cost.
    //
    // Not "point it at this offer instead": a poster's printed words are
    // written when it is made and can never be changed, so re-aiming a
    // live one leaves a sheet in the window selling one offer and a code
    // opening another. The customer holding the phone is the one who
    // pays for that. A poster whose offer has simply ended is a different
    // thing and already lands well — the business page says "That offer
    // has ended" and points at what is on.
    const posterStep = spentPoster
        ? `The Free plan includes one poster, and yours ${spentPoster.pointsAt ? `points at ${spentPoster.pointsAt}` : "is already up"}. Pro gives you one for every spot, so each offer can have its own.`
        : "A poster that opens your page works today, and shows this offer the moment it is live.";

    // The plans at the limit, where a second poster is the thing they
    // cannot have. Otherwise the designer — aimed at the business page,
    // not at this offer, because a code pointed at an offer still being
    // checked resolves to "That offer has ended" until it is approved.
    // The page poster has no such gap: it shows whatever is on.
    const posterHref = spentPoster
        ? `/business/${businessId}/billing`
        : `/business/${businessId}/qr/new`;
    const [errorMessage, setErrorMessage] = useState("");

    // Offers to start from, chosen for their trade. Worked out once:
    // the list cannot change while the form is open.
    const [starters] = useState(() => templatesFor(categorySlug));
    const [startedFrom, setStartedFrom] = useState<OfferTemplate | null>(null);

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
            // The line from their preview email, where they came in by
            // "Use this offer". Everything else is theirs to write: an
            // offer's type is what it promises, and we don't guess that.
            title: suggestedTitle ?? "",
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

        // Tells the business it is waiting, and nothing else: every offer
        // waits for a person (20261107090000). The comment here used to
        // say "Pro businesses' offers go live at once", which stopped
        // being true when that migration dropped the auto-approve
        // trigger, and announceNewOffer has said so plainly ever since.
        await announceNewOffer(inserted.id).catch(() => undefined);

        reset();
        setImageFile(null);
        setImagePreviewUrl(null);
        router.replace(`${pathname}?created=pending`, { scroll: false });
    }

    // Pressing a starter fills every field the form asks for, including
    // the ones a business forgets: an end date, and when it can be used.
    // Nothing is saved — this is a draft to argue with.
    function useStarter(template: OfferTemplate) {
        const ends = new Date();
        // Three months, which is long enough to be worth printing and
        // short enough that a stale offer falls off the directory by
        // itself.
        ends.setMonth(ends.getMonth() + 3);

        setValue("title", template.title, { shouldValidate: true });
        setValue("kind", template.kind, { shouldValidate: true });
        setValue("kindValue", template.value ? String(template.value) : "");
        setValue("kindQuantity", template.quantity ? String(template.quantity) : "");
        setValue("kindItem", template.item ?? "");
        setValue("description", template.description, { shouldValidate: true });
        setValue("terms", template.terms ?? DEFAULT_TERMS, { shouldValidate: true });
        setValue("expiresAt", ends.toISOString().slice(0, 10), { shouldValidate: true });

        // "Certain days and times" only where the timing is the offer.
        const when = template.days?.length ? (template.from ? "times" : "days") : "any";

        setValue("when", when);
        setValue("availableDays", template.days ?? []);
        setValue("availableFrom", template.from ?? "");
        setValue("availableUntil", template.until ?? "");

        setStartedFrom(template);
        clearErrors();
    }

    function clearStarter() {
        reset();
        setStartedFrom(null);
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
                            Offer submitted
                        </p>

                        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#17233B]">
                            Your offer is with us
                        </h1>

                        <p className="mt-4 leading-7 text-[#17233B]/65">
                            We check every offer before customers see it, usually the
                            same day
                            {followers > 0
                                ? ", and your followers hear about it the moment it's live."
                                : ", and you get an email the moment it's live."}
                        </p>

                        {/* The waiting is two lines of reassurance, not a
                            numbered list of things to do: the only step on
                            that list they could act on was the poster, and
                            it sat third behind two rows of "wait". */}
                        <div className="mt-7 rounded-xl bg-[#FFF8F0] p-5 text-left">
                            <p className="text-sm font-semibold text-[#17233B]">
                                {spentPoster ? "About your poster" : "While you wait: put a poster up"}
                            </p>

                            <p className="mt-1.5 text-sm leading-6 text-[#17233B]/75">
                                {posterStep}
                            </p>

                            <Button
                                size="lg"
                                render={<Link href={posterHref} />}
                                nativeButton={false}
                                className="mt-4 w-full sm:w-auto"
                            >
                                {spentPoster ? "See the plans" : "Make a poster"}
                                <FiArrowRight aria-hidden="true" />
                            </Button>
                        </div>

                        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                            <Button
                                size="lg"
                                render={<Link href={`/business/${businessId}/offers`} />}
                                nativeButton={false}
                                variant="outline"
                            >
                                View pending
                            </Button>

                            <Button
                                size="lg"
                                type="button"
                                variant="outline"
                                onClick={() => router.replace(pathname, { scroll: false })}
                            >
                                Create another
                            </Button>
                        </div>

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
                            Our team checks every offer before customers see it,
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
                            <OfferStarters
                                templates={starters}
                                chosen={startedFrom}
                                onPick={useStarter}
                                onClear={clearStarter}
                            />

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

                <aside className="order-1 lg:order-2 lg:sticky lg:top-24">
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