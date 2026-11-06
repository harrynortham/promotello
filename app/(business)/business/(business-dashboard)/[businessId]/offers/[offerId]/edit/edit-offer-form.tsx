"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { OfferImageField } from "@/components/offer-image-field";
import {
    OfferFields,
    imageProblem,
    offerRow,
    offerSchema,
    uploadOfferImage,
    type OfferInput,
    type OfferValues,
} from "@/components/offer-fields";
import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { scheduleFromForm } from "@/components/offer-schedule-fields";
import { scheduleFrom } from "@/lib/schedule";
import { createClient } from "@/utils/supabase/client";
import { offerEditWaitingForReview } from "../../actions";

type EditOfferFormProps = {
    businessId: string;
    offerId: string;
    canSchedule: boolean;
};

// The four fields a person has to read before they reach customers.
type WaitingEdit = {
    id: string;
    title: string;
    description: string;
    discount: string;
    terms: string;
    submitted_at: string;
};

type Offer = {
    title: string;
    category: string;
    category_id: string | null;
    discount: string;
    description: string;
    availability: string;
    expires_at: string;
    terms: string;
    approval_status: string;
    max_redemptions: number | null;
    redemption_count: number;
    image_url: string | null;
    schedule_days: number[] | null;
    schedule_start: string | null;
    schedule_end: string | null;
};

// Editing may keep an expiry date that has already passed.
const schema = offerSchema({ allowPastExpiry: true });

export default function EditOfferForm({
    businessId,
    offerId,
    canSchedule,
}: EditOfferFormProps) {
    const router = useRouter();

    const [offer, setOffer] = useState<Offer | null>(null);
    // A change already sent for review. The offer below it is still the
    // one customers see; this is what it would become.
    const [waitingEdit, setWaitingEdit] = useState<WaitingEdit | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [removeImage, setRemoveImage] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const {
        register,
        handleSubmit,
        reset,
        setError,
        clearErrors,
        formState: { errors, isSubmitting: isSaving },
    } = useForm<OfferInput, unknown, OfferValues>({ resolver: zodResolver(schema) });

    useEffect(() => {
        // Only the latest load fills the form (development runs effects
        // twice, and a late first load would undo what's been typed).
        let current = true;

        async function loadOffer() {
            const supabase = createClient();

            const [{ data, error }, { data: pending }] = await Promise.all([
                supabase
                    .from("offers")
                .select(
                    `
            title,
            category,
            category_id,
            discount,
            description,
            availability,
            expires_at,
            terms,
            approval_status,
            max_redemptions,
            redemption_count,
            image_url,
            schedule_days,
            schedule_start,
            schedule_end
          `,
                )
                    .eq("id", offerId)
                    .eq("business_id", businessId)
                    .single(),
                supabase
                    .from("offer_edits")
                    .select("id, title, description, discount, terms, submitted_at")
                    .eq("offer_id", offerId)
                    .is("decided_at", null)
                    .maybeSingle(),
            ]);

            if (!current) return;

            if (error || !data) {
                setErrorMessage("We couldn't load this offer.");
            } else {
                const loaded = data as Offer;
                const sent = (pending ?? null) as WaitingEdit | null;

                setOffer(loaded);
                setWaitingEdit(sent);

                // The form shows what they last wrote, even while it is
                // waiting, so a second save revises it rather than
                // starting from the published words again.
                reset({
                    title: sent?.title ?? loaded.title,
                    category: loaded.category_id ?? "",
                    discount: sent?.discount ?? loaded.discount,
                    description: sent?.description ?? loaded.description,
                    availability: loaded.availability,
                    expiresAt: loaded.expires_at,
                    maxRedemptions: loaded.max_redemptions === null ? "" : String(loaded.max_redemptions),
                    terms: sent?.terms ?? loaded.terms,
                });
            }

            setIsLoading(false);
        }

        loadOffer();

        return () => {
            current = false;
        };
    }, [businessId, offerId, reset]);

    async function onSubmit(values: OfferValues, event?: React.BaseSyntheticEvent) {
        if (!offer) return;

        setErrorMessage("");

        if (values.maxRedemptions !== null && values.maxRedemptions < offer.redemption_count) {
            setError("maxRedemptions", {
                message: `The limit can't be lower than the ${offer.redemption_count} already claimed.`,
            });
            return;
        }

        // An offer keeps its picture: taking the last one away would put
        // a flat tile back in the listings.
        if (!imageFile && (removeImage || !offer.image_url)) {
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

        const schedule = scheduleFromForm(new FormData(event?.target as HTMLFormElement));
        const supabase = createClient();
        let imageUrl = removeImage ? null : offer.image_url;

        if (imageFile) {
            const upload = await uploadOfferImage(supabase, businessId, imageFile);

            if ("error" in upload) {
                setErrorMessage(upload.error ?? "The image couldn't be uploaded.");
                return;
            }

            imageUrl = upload.url;
        }

        const row = offerRow(values, schedule);

        // What the offer promises: read by a person before customers see
        // it. On a live offer those four fields are sent as a change and
        // the published words stay up meanwhile; everything else saves
        // straight away.
        const { title, discount, description, terms, ...rest } = row;
        const isLive = offer.approval_status === "approved";
        const rewritten =
            title !== offer.title ||
            discount !== offer.discount ||
            description !== offer.description ||
            terms !== offer.terms;
        const asChange = isLive && rewritten;

        const { error } = await supabase
            .from("offers")
            .update(asChange ? { ...rest, image_url: imageUrl } : { ...row, image_url: imageUrl })
            .eq("id", offerId)
            .eq("business_id", businessId);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        if (asChange) {
            const { error: editError } = await supabase.rpc("submit_offer_edit", {
                requested_offer_id: offerId,
                new_title: title,
                new_description: description,
                new_discount: discount,
                new_terms: terms,
            });

            if (editError) {
                setErrorMessage(editError.message);
                return;
            }

            await offerEditWaitingForReview(offerId).catch(() => undefined);
        }

        router.push(`/business/${businessId}/offers`);
        router.refresh();
    }

    async function handleDelete() {
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
            setIsDeleteDialogOpen(false);
            return;
        }

        router.push(`/business/${businessId}/offers`);
        router.refresh();
    }

    if (isLoading) {
        return (
            <div>
                <div>
                    <div className="h-10 animate-pulse rounded-lg bg-white" />
                    <div className="mt-6 h-96 animate-pulse rounded-xl bg-white" />
                </div>
            </div>
        );
    }

    if (!offer) {
        return (
            <div>
                <Card className="border-red-200">
                    <CardContent className="p-8">
                        <Alert variant="destructive">
                            <AlertTitle>Offer unavailable</AlertTitle>
                            <AlertDescription>
                                {errorMessage || "Offer not found."}
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="text-[#17233B]">
            <div>
                <BackButton href={`/business/${businessId}/offers`} />

                <div className="mt-8">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                        Offer management
                    </p>

                    <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                        Edit offer
                    </h1>

                    <div className="mt-3 flex flex-wrap items-center gap-3">
                        <p className="text-[#17233B]/65">Current status:</p>

                        <Badge variant="outline" className="capitalize">
                            {offer.approval_status}
                        </Badge>
                    </div>

                    {offer.approval_status === "approved" && (
                        <p className="mt-3 text-sm text-[#17233B]/70">
                            Changing the headline, title, description or terms sends the
                            new wording to us for a quick check. Your offer stays live
                            with the words we approved until then, so nothing you have
                            printed stops working. A new photo, availability line,
                            expiry date or claim limit saves straight away.
                        </p>
                    )}

                    {waitingEdit && (
                        <Alert className="mt-4 border-amber-200 bg-amber-50">
                            <AlertTitle>Your new wording is with us</AlertTitle>

                            <AlertDescription>
                                Sent{" "}
                                {new Date(waitingEdit.submitted_at).toLocaleDateString("en-GB", {
                                    day: "numeric",
                                    month: "long",
                                })}
                                . Customers still see “{offer.discount} — {offer.title}”
                                until we approve it. Saving again replaces what is
                                waiting.
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

                <Card className="mt-8 border-[#17233B]/10">
                    <CardHeader>
                        <CardTitle>Redemption usage</CardTitle>
                    </CardHeader>

                    <CardContent>
                        <p className="text-2xl font-semibold">
                            {offer.redemption_count} claimed
                        </p>

                        <p className="mt-1 text-sm text-[#17233B]/70">
                            {offer.max_redemptions === null
                                ? "Unlimited total redemptions"
                                : `${offer.max_redemptions} total redemptions allowed`}
                        </p>
                    </CardContent>
                </Card>

                <Card className="mt-6 border-[#17233B]/10">
                    <CardHeader>
                        <CardTitle>Offer details</CardTitle>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-7">
                            <OfferImageField
                                savedImageUrl={removeImage ? null : offer.image_url}
                                disabled={isSaving || isDeleting}
                                error={errors.root?.image?.message}
                                onChange={(file) => {
                                    setImageFile(file);
                                    if (file) {
                                        setRemoveImage(false);
                                        clearErrors("root.image");
                                    }
                                }}
                                onRemove={() => setRemoveImage(true)}
                            />

                            <Separator />

                            <OfferFields
                                register={register}
                                errors={errors}
                                businessId={businessId}
                                canSchedule={canSchedule}
                                schedule={scheduleFrom(offer.schedule_days, offer.schedule_start, offer.schedule_end)}
                                defaultCategoryId={offer.category_id}
                                minRedemptions={offer.redemption_count}
                            />

                            {errorMessage && (
                                <Alert variant="destructive">
                                    <AlertTitle>Unable to save changes</AlertTitle>

                                    <AlertDescription>
                                        {errorMessage}
                                    </AlertDescription>
                                </Alert>
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
                                    onClick={() => setIsDeleteDialogOpen(true)}
                                    variant="destructive"
                                    size="lg"
                                >
                                    Delete offer
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <Dialog
                    open={isDeleteDialogOpen}
                    onOpenChange={setIsDeleteDialogOpen}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete this offer?</DialogTitle>

                            <DialogDescription>
                                This action cannot be undone. The offer and its details
                                will be permanently deleted.
                            </DialogDescription>
                        </DialogHeader>

                        <DialogFooter>
                            <Button
                                size="lg"
                                type="button"
                                variant="outline"
                                onClick={() => setIsDeleteDialogOpen(false)}
                                disabled={isDeleting}
                            >
                                Cancel
                            </Button>

                            <Button
                                size="lg"
                                type="button"
                                variant="destructive"
                                onClick={handleDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting ? "Deleting…" : "Delete offer"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}