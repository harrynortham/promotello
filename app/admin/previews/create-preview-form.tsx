"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { CategorySelect } from "@/components/category-select";
import { ImagePicker } from "@/components/image-picker";
import { LocationFields } from "@/components/location-fields";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { uploadBusinessImage } from "@/lib/business-images";
import { createClient } from "@/utils/supabase/client";
import { createPreview } from "./actions";
import { previewPath } from "./preview-shared";

// Building a preview is one sitting: their details, the offer and card
// you're suggesting, and their own logo and photo. The images can only be
// uploaded once the business exists, so the form creates it first and then
// sends the files — which is why this is a client component rather than a
// plain server-action form.

type CityOption = Parameters<typeof LocationFields>[0]["cities"];

function Section({
    title,
    hint,
    children,
}: {
    title: string;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <section className="space-y-4">
            <div>
                <h3 className="font-semibold text-[#17233B]">{title}</h3>
                {hint && <p className="mt-1 text-sm leading-6 text-[#17233B]/65">{hint}</p>}
            </div>
            {children}
        </section>
    );
}

export function CreatePreviewForm({ cities }: { cities: CityOption }) {
    const router = useRouter();
    const [logo, setLogo] = useState<File | null>(null);
    const [cover, setCover] = useState<File | null>(null);
    const [problem, setProblem] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setProblem("");
        setIsSaving(true);

        const result = await createPreview(new FormData(event.currentTarget));

        if (result.error || !result.businessId) {
            setProblem(result.error ?? "The preview couldn't be created.");
            setIsSaving(false);
            return;
        }

        // The business exists now, so the images have somewhere to go. A
        // failed upload doesn't undo it: the preview page says so and both
        // can be added there.
        const supabase = createClient();
        let imagesFailed = false;

        for (const [kind, file, column] of [
            ["logo", logo, "logo_url"],
            ["cover", cover, "cover_image_url"],
        ] as const) {
            if (!file) continue;

            const upload = await uploadBusinessImage(supabase, result.businessId, kind, file);

            if ("error" in upload) {
                imagesFailed = true;
                continue;
            }

            const { error } = await supabase
                .from("businesses")
                .update({ [column]: upload.url })
                .eq("id", result.businessId);

            if (error) imagesFailed = true;
        }

        router.push(`${previewPath(result.businessId)}?created=1${imagesFailed ? "&images=1" : ""}`);
    }

    return (
        <form onSubmit={onSubmit} className="space-y-8">
            {problem && (
                <Alert variant="destructive">
                    <AlertTitle>Not created</AlertTitle>
                    <AlertDescription>{problem}</AlertDescription>
                </Alert>
            )}

            <div className="grid gap-8 lg:grid-cols-2">
                <Section title="The business" hint="What goes on their page and their poster.">
                    <div className="space-y-2">
                        <Label htmlFor="businessName">Business name</Label>
                        <Input id="businessName" name="businessName" required minLength={2} maxLength={120} placeholder="e.g. Little Loaf" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <CategorySelect id="category" name="category" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description (optional)</Label>
                        <Input id="description" name="description" maxLength={300} placeholder="A neighbourhood bakery on Gloucester Road" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="website">Website (optional)</Label>
                        <Input id="website" name="website" type="url" placeholder="https://" />
                    </div>
                </Section>

                <Section title="Where they are" hint="Their real address, so the page and the poster are right.">
                    <div className="space-y-2">
                        <Label htmlFor="addressLine1">Street address</Label>
                        <Input id="addressLine1" name="addressLine1" required minLength={2} maxLength={200} placeholder="e.g. 21 Gloucester Road" />
                    </div>
                    <LocationFields cities={cities} />
                </Section>
            </div>

            <Separator />

            <Section title="Who you're writing to" hint="Only for you: none of this shows on their page.">
                <div className="grid gap-5 sm:grid-cols-3">
                    <div className="space-y-2">
                        <Label htmlFor="contactName">Owner&apos;s first name (optional)</Label>
                        <Input id="contactName" name="contactName" maxLength={80} placeholder="Sam" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="contactEmail">Where you&apos;ll write (optional)</Label>
                        <Input id="contactEmail" name="contactEmail" type="email" maxLength={160} placeholder="hello@theirshop.com" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="instagramHandle">Instagram (optional)</Label>
                        <Input id="instagramHandle" name="instagramHandle" maxLength={120} placeholder="@theirshop or a profile link" />
                    </div>
                </div>
            </Section>

            <Separator />

            <Section
                title="Sample offer"
                hint="The deal you're suggesting they run. They can change it after they claim the page, so pick something that suits them rather than something safe."
            >
                <div className="max-w-xl space-y-2">
                    <Label htmlFor="sampleOffer">The offer</Label>
                    <Input id="sampleOffer" name="sampleOffer" required minLength={3} maxLength={80} placeholder="Free pastry with any coffee" />
                </div>
            </Section>

            <Separator />

            <Section
                title="Loyalty card"
                hint="What a customer collects stamps towards, and how many it takes. This is what the card in the preview shows."
            >
                <div className="grid max-w-xl gap-5 sm:grid-cols-[1fr_7rem]">
                    <div className="space-y-2">
                        <Label htmlFor="sampleReward">The reward</Label>
                        <Input id="sampleReward" name="sampleReward" required minLength={3} maxLength={60} placeholder="a free coffee" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="sampleStamps">Stamps</Label>
                        <Input id="sampleStamps" name="sampleStamps" type="number" min={3} max={20} defaultValue={9} />
                    </div>
                </div>
            </Section>

            <Separator />

            <Section
                title="Their logo and a photo"
                hint="Optional, and the thing that makes a preview look like them rather than a template. Both can be added or changed afterwards."
            >
                <div className="grid gap-5 sm:grid-cols-2">
                    <ImagePicker
                        id="preview-logo"
                        label="Logo"
                        hint="PNG, JPG or WebP. You can zoom and reposition it."
                        aspect={1}
                        allowSpace
                        maxSize={1024}
                        modal
                        disabled={isSaving}
                        onChange={(file) => setLogo(file)}
                    />
                    <ImagePicker
                        id="preview-cover"
                        label="Cover photo"
                        hint="A landscape photo of the place. You can zoom and reposition it."
                        aspect={16 / 9}
                        maxSize={1600}
                        convertToJpeg
                        modal
                        disabled={isSaving}
                        onChange={(file) => setCover(file)}
                    />
                </div>
            </Section>

            <Button type="submit" size="lg" disabled={isSaving}>
                {isSaving ? "Building the preview…" : "Create preview"}
            </Button>
        </form>
    );
}
