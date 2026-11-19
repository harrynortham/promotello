"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { GeneratedCoverField } from "@/components/generated-cover-field";
import { ImagePicker } from "@/components/image-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadBusinessImage } from "@/lib/business-images";
import { createClient } from "@/utils/supabase/client";
import { createPreviewFromLead } from "../actions";

// Building a preview used to be a section of its own that asked
// again for the name, the category, the address, who to write to and
// their email — all of it sitting on the lead you came from. This asks
// the four things a lead cannot answer and nothing else.
//
// A page rather than the dialog it was first built as. ImagePicker opens
// its own modal to crop, so in a dialog the cropper sat inside a sheet
// already constraining it, and two pickers with shrink-0 upload buttons
// pushed past the edge. Cropping is the one thing here that wants room.
//
// The business has to exist before an image has anywhere to go, so the
// action returns its id and the uploads happen after. A failed upload
// does not undo the preview: it says so, and both images can be added
// from the business itself.
export function BuildPreviewForm({
    leadId,
    businessName,
    categoryId,
    taking,
    description,
}: {
    leadId: string;
    // Both only so a cover can be drawn from them before the business
    // exists: the name goes on it, the trade picks its colour and its
    // mark.
    businessName: string;
    categoryId: string | null;
    taking: string[];
    description: string | null;
}) {
    const router = useRouter();
    const [logo, setLogo] = useState<File | null>(null);
    const [cover, setCover] = useState<File | null>(null);
    // A cover drawn from their colours, for a business with no photo.
    // It is uploaded exactly as a photo is — same bucket, same column —
    // so nothing downstream has to know which it got.
    const [generated, setGenerated] = useState<File | null>(null);
    const [problem, setProblem] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setProblem("");
        setIsSaving(true);

        const result = await createPreviewFromLead(new FormData(event.currentTarget));

        if (result.error || !result.businessId) {
            setProblem(result.error ?? "The preview couldn't be built.");
            setIsSaving(false);
            return;
        }

        const supabase = createClient();
        let imagesFailed = false;

        // uploadBusinessImage puts the file in storage and hands back its
        // url; writing that url onto the business is a second step. Left
        // out, the upload succeeds, nothing complains, and the page has
        // no picture on it — which is the one thing a preview is for.
        for (const [kind, file, column] of [
            ["logo", logo, "logo_url"],
            ["cover", cover ?? generated, "cover_image_url"],
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

        if (imagesFailed) {
            setProblem("The preview was built, but an image didn't upload. Add it from the business.");
            setIsSaving(false);
            return;
        }

        router.push(`/admin/sales/${leadId}?saved=preview`);
    }

    return (
        <form onSubmit={onSubmit} className="space-y-8">
            <input type="hidden" name="leadId" value={leadId} />

            {/* What it is about to use, so it is obvious nothing needs
                retyping — and obvious what to go and fix on the lead if any
                of it is wrong. */}
            <div className="rounded-xl border border-[#17233B]/10 bg-[#FFF8F0] p-4 text-sm leading-6 text-[#17233B]/70">
                <p className="font-medium text-[#17233B]">Taken from the lead</p>
                <p>{taking.join(" · ")}</p>
            </div>

            {problem && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-900">
                    {problem}
                </p>
            )}

            <div className="space-y-2">
                <Label htmlFor="description">What they are</Label>
                <textarea
                    id="description"
                    name="description"
                    required
                    defaultValue={description ?? ""}
                    rows={2}
                    maxLength={300}
                    className="w-full rounded-md border border-input bg-background p-3 text-sm"
                    placeholder="A neighbourhood bakery on Gloucester Road"
                    disabled={isSaving}
                />
                <p className="text-xs text-[#17233B]/60">
                    The line under their name on the page. Without one, claiming it does
                    not publish it.
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="sampleOffer">The offer</Label>
                <Input
                    id="sampleOffer"
                    name="sampleOffer"
                    required
                    minLength={3}
                    maxLength={80}
                    placeholder="10% off your first order"
                    disabled={isSaving}
                />
                <p className="text-xs text-[#17233B]/60">
                    An example of what they might run. They can change it once it is theirs.
                </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                    <Label htmlFor="sampleReward">The loyalty card gives</Label>
                    <Input
                        id="sampleReward"
                        name="sampleReward"
                        required
                        minLength={3}
                        maxLength={60}
                        placeholder="A free coffee"
                        disabled={isSaving}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="sampleStamps">Stamps</Label>
                    <Input
                        id="sampleStamps"
                        name="sampleStamps"
                        type="number"
                        min={3}
                        max={20}
                        defaultValue={9}
                        className="w-24"
                        disabled={isSaving}
                    />
                </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
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
                <div className="space-y-4">
                    <ImagePicker
                        id="preview-cover"
                        label="Photo of the place"
                        hint="A landscape photo. You can zoom and reposition it."
                        aspect={16 / 9}
                        maxSize={1600}
                        convertToJpeg
                        modal
                        disabled={isSaving}
                        onChange={(file) => {
                            setCover(file);
                            // A photo of the real place beats anything
                            // drawn, so choosing one drops the drawing
                            // rather than leaving two covers racing for
                            // the same column.
                            if (file) setGenerated(null);
                        }}
                    />

                    <div className="border-t border-[#17233B]/10 pt-4">
                        <p className="text-sm font-medium text-[#17233B]">Or build one</p>

                        <div className="mt-3">
                            <GeneratedCoverField
                                name={businessName}
                                categoryId={categoryId ?? ""}
                                logo={logo}
                                disabled={isSaving || Boolean(cover)}
                                onChange={setGenerated}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3 border-t border-[#17233B]/10 pt-6">
                <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Building…" : "Build it"}
                </Button>

                <Button
                    render={<Link href={`/admin/sales/${leadId}`} />}
                    nativeButton={false}
                    variant="ghost"
                    disabled={isSaving}
                >
                    Cancel
                </Button>
            </div>
        </form>
    );
}
