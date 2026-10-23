"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
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
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
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
                setOffer(data as Offer);
            }

            setIsLoading(false);
        }

        loadOffer();
    }, [businessId, offerId]);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!offer) return;

        const form = event.currentTarget;
        const formData = new FormData(form);

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
                availability:
                    formData.get("availability") || "Available now",
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
            <main className="min-h-screen bg-[#FFF8F0] px-6 py-16">
                <div className="mx-auto max-w-2xl">
                    <div className="h-10 animate-pulse rounded-md bg-white" />
                    <div className="mt-6 h-96 animate-pulse rounded-xl bg-white" />
                </div>
            </main>
        );
    }

    if (!offer) {
        return (
            <main className="min-h-screen bg-[#FFF8F0] px-6 py-16">
                <Card className="mx-auto max-w-2xl border-red-200">
                    <CardContent className="p-8">
                        <Alert variant="destructive">
                            <AlertTitle>Promotion unavailable</AlertTitle>
                            <AlertDescription>
                                {errorMessage || "Promotion not found."}
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-10 text-[#17233B] sm:py-16">
            <div className="mx-auto max-w-2xl">
                <Button
                    render={
                        <Link href={`/business/${businessId}/offers`} />
                    }
                    nativeButton={false}
                    variant="outline"
                    size="sm"
                >
                    ← Back to promotions
                </Button>

                <div className="mt-8">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                        Promotion management
                    </p>

                    <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                        Edit promotion
                    </h1>

                    <div className="mt-3 flex flex-wrap items-center gap-3">
                        <p className="text-[#17233B]/65">Current status:</p>

                        <Badge variant="outline" className="capitalize">
                            {offer.approval_status}
                        </Badge>
                    </div>
                </div>

                <Card className="mt-8 border-[#17233B]/10">
                    <CardHeader>
                        <CardTitle>Redemption usage</CardTitle>
                    </CardHeader>

                    <CardContent>
                        <p className="text-2xl font-semibold">
                            {offer.redemption_count} claimed
                        </p>

                        <p className="mt-1 text-sm text-[#17233B]/55">
                            {offer.max_redemptions === null
                                ? "Unlimited total redemptions"
                                : `${offer.max_redemptions} total redemptions allowed`}
                        </p>
                    </CardContent>
                </Card>

                <Card className="mt-6 border-[#17233B]/10">
                    <CardHeader>
                        <CardTitle>Promotion details</CardTitle>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-7">
                            {offer.image_url && !removeImage && (
                                <div className="space-y-3">
                                    <Label>Current promotion image</Label>

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
                                        ? "Replace promotion image"
                                        : "Add promotion image"}
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

                                <p className="text-xs text-[#17233B]/50">
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

                            <div className="space-y-2">
                                <Label htmlFor="title">Promotion title</Label>

                                <Input
                                    id="title"
                                    name="title"
                                    required
                                    minLength={2}
                                    maxLength={160}
                                    defaultValue={offer.title}
                                />
                            </div>

                            <div className="grid gap-6 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="category">Category</Label>

                                    <Input
                                        id="category"
                                        name="category"
                                        required
                                        defaultValue={offer.category}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="discount">Discount</Label>

                                    <Input
                                        id="discount"
                                        name="discount"
                                        required
                                        defaultValue={offer.discount}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>

                                <Textarea
                                    id="description"
                                    name="description"
                                    required
                                    rows={5}
                                    defaultValue={offer.description}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="availability">Availability</Label>

                                <Input
                                    id="availability"
                                    name="availability"
                                    defaultValue={offer.availability}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="expiresAt">Expiry date</Label>

                                <Input
                                    id="expiresAt"
                                    name="expiresAt"
                                    type="date"
                                    required
                                    defaultValue={offer.expires_at}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="maxRedemptions">
                                    Maximum redemptions
                                </Label>

                                <Input
                                    id="maxRedemptions"
                                    name="maxRedemptions"
                                    type="number"
                                    min={offer.redemption_count || 1}
                                    step="1"
                                    defaultValue={offer.max_redemptions ?? ""}
                                    placeholder="Leave empty for unlimited"
                                />

                                <p className="text-xs leading-5 text-[#17233B]/55">
                                    The limit cannot be lower than the number already claimed.
                                    Leave empty for unlimited redemptions.
                                </p>
                            </div>

                            <Separator />

                            <div className="space-y-2">
                                <Label htmlFor="terms">
                                    Terms and conditions
                                </Label>

                                <Textarea
                                    id="terms"
                                    name="terms"
                                    required
                                    rows={5}
                                    defaultValue={offer.terms}
                                />
                            </div>

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
                                    Delete promotion
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
                            <DialogTitle>Delete this promotion?</DialogTitle>

                            <DialogDescription>
                                This action cannot be undone. The promotion and its details
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
                                {isDeleting ? "Deleting…" : "Delete promotion"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </main>
    );
}