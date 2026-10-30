"use client";

import Image from "next/image";
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
import { FieldError } from "@/components/field-error";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { scheduleFromForm } from "@/components/offer-schedule-fields";
import { scheduleFrom } from "@/lib/schedule";
import { createClient } from "@/utils/supabase/client";

type EditOfferFormProps = {
    businessId: string;
    offerId: string;
    canSchedule: boolean;
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
        formState: { errors, isSubmitting: isSaving },
    } = useForm<OfferInput, unknown, OfferValues>({ resolver: zodResolver(schema) });

    useEffect(() => {
        // Only the latest load fills the form (development runs effects
        // twice, and a late first load would undo what's been typed).
        let current = true;

        async function loadOffer() {
            const supabase = createClient();

            const { data, error } = await supabase
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
                .single();

            if (!current) return;

            if (error || !data) {
                setErrorMessage("We couldn't load this offer.");
            } else {
                const loaded = data as Offer;
                setOffer(loaded);
                reset({
                    title: loaded.title,
                    category: loaded.category_id ?? "",
                    discount: loaded.discount,
                    description: loaded.description,
                    availability: loaded.availability,
                    expiresAt: loaded.expires_at,
                    maxRedemptions: loaded.max_redemptions === null ? "" : String(loaded.max_redemptions),
                    terms: loaded.terms,
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

        const { error } = await supabase
            .from("offers")
            .update({ ...offerRow(values, schedule), image_url: imageUrl })
            .eq("id", offerId)
            .eq("business_id", businessId);

        if (error) {
            setErrorMessage(error.message);
            return;
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
                    <div className="h-10 animate-pulse rounded-md bg-white" />
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
                            Changing the wording, terms or image sends a live offer
                            back to our team for a quick check, unless your business is
                            on Pro.
                        </p>
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
                            {offer.image_url && !removeImage && (
                                <div className="space-y-3">
                                    <Label>Current offer image</Label>

                                    <div className="relative h-52 w-full overflow-hidden rounded-xl">
                                        <Image
                                            src={offer.image_url}
                                            alt={offer.title}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="image">
                                    {offer.image_url
                                        ? "Replace offer image"
                                        : "Add offer image"}
                                </Label>

                                <Input
                                    id="image"
                                    name="image"
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={(event) => {
                                        setImageFile(event.target.files?.[0] ?? null);
                                        setRemoveImage(false);
                                    }}
                                />

                                <FieldError id="image-error" message={errors.root?.image?.message} />
                                <p className="text-xs text-[#17233B]/65">
                                    Use a JPG, PNG or WebP image under 5MB.
                                </p>
                            </div>

                            {offer.image_url && (
                                <div className="flex items-center gap-3">
                                    <Checkbox
                                        id="removeImage"
                                        checked={removeImage}
                                        onCheckedChange={(checked) => {
                                            const shouldRemove = checked === true;
                                            setRemoveImage(shouldRemove);

                                            if (shouldRemove) {
                                                setImageFile(null);
                                            }
                                        }}
                                    />

                                    <Label htmlFor="removeImage">
                                        Remove current image
                                    </Label>
                                </div>
                            )}

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
                                type="button"
                                variant="outline"
                                onClick={() => setIsDeleteDialogOpen(false)}
                                disabled={isDeleting}
                            >
                                Cancel
                            </Button>

                            <Button
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