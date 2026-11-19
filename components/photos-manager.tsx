"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FiArrowLeft, FiArrowRight, FiTrash2 } from "react-icons/fi";

import { ImagePicker } from "@/components/image-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadBusinessImage } from "@/lib/business-images";
import {
    PHOTO_LIMIT_CODE,
    PRO_PHOTO_LIMIT,
    photoAlt,
    reordered,
    type BusinessPhoto,
} from "@/lib/business-photos";
import { createClient } from "@/utils/supabase/client";

// The photos on a business's page, and the one place to manage them.
//
// A page of its own rather than a tab on the profile form, because that
// is how the logo and the cover already work, and because uploading,
// reordering and deleting do not belong inside a form with a Save
// button — each of them is done the moment it is done.
export function PhotosManager({
    businessId,
    businessName,
    photos: saved,
    limit,
    hasPro,
}: {
    businessId: string;
    businessName: string;
    photos: BusinessPhoto[];
    limit: number;
    hasPro: boolean;
}) {
    const router = useRouter();

    // Held here as well as on the server so a drag lands instantly and
    // the write follows. The server's copy is what survives a reload.
    const [photos, setPhotos] = useState(saved);
    const [busy, setBusy] = useState(false);
    const [problem, setProblem] = useState("");
    const [dragging, setDragging] = useState<number | null>(null);

    const shown = photos.filter((photo) => !photo.plan_paused_at);
    const paused = photos.filter((photo) => photo.plan_paused_at);
    const full = shown.length >= limit;

    async function add(file: File) {
        setBusy(true);
        setProblem("");

        const supabase = createClient();
        const upload = await uploadBusinessImage(supabase, businessId, "photo", file);

        if ("error" in upload) {
            setProblem(upload.error ?? "That photo couldn't be uploaded.");
            setBusy(false);
            return;
        }

        const { data, error } = await supabase
            .from("business_photos")
            .insert({
                business_id: businessId,
                storage_path: upload.path,
                // Onto the end, where they can then drag it.
                sort_order: photos.length,
            })
            .select("id, storage_path, caption, sort_order, plan_paused_at")
            .single();

        if (error) {
            // The database is what holds the line, so this is the real
            // message rather than a guess made before trying.
            setProblem(
                error.code === PHOTO_LIMIT_CODE
                    ? error.message
                    : "That photo couldn't be saved.",
            );
            // The file is already in storage and nothing points at it,
            // so take it back out rather than leave it there.
            await supabase.storage.from("business-logos").remove([upload.path]);
            setBusy(false);
            return;
        }

        setPhotos((current) => [...current, data as BusinessPhoto]);
        setBusy(false);
        router.refresh();
    }

    async function move(from: number, to: number) {
        if (to < 0 || to >= photos.length) return;

        const next = reordered(photos, from, to);

        setPhotos(next);
        setBusy(true);

        const supabase = createClient();

        // One row at a time rather than an upsert of all of them: an
        // upsert needs every column of every row, and getting one
        // wrong would rewrite a caption while reordering.
        await Promise.all(
            next.map((photo) =>
                supabase
                    .from("business_photos")
                    .update({ sort_order: photo.sort_order })
                    .eq("id", photo.id),
            ),
        );

        setBusy(false);
        router.refresh();
    }

    async function describe(id: string, caption: string) {
        setPhotos((current) =>
            current.map((photo) => (photo.id === id ? { ...photo, caption } : photo)),
        );

        await createClient()
            .from("business_photos")
            .update({ caption: caption.trim() || null })
            .eq("id", id);
    }

    async function remove(photo: BusinessPhoto) {
        setBusy(true);
        setProblem("");

        const supabase = createClient();
        const { error } = await supabase.from("business_photos").delete().eq("id", photo.id);

        if (error) {
            setProblem("That photo couldn't be removed.");
            setBusy(false);
            return;
        }

        // The row and the file. A row deleted without its file is how a
        // bucket fills with things nothing points at — and the first
        // version of this did exactly that, because the bucket had no
        // delete policy and storage refuses without raising anything.
        // Hence reading the error rather than assuming.
        const { error: fileError } = await supabase.storage
            .from("business-logos")
            .remove([photo.storage_path]);

        if (fileError) {
            setProblem("The photo is off your page, but its file could not be removed.");
        }

        setPhotos((current) => current.filter((other) => other.id !== photo.id));
        setBusy(false);
        router.refresh();
    }

    return (
        <div className="text-[#17233B]">
            <h1 className="text-2xl font-semibold tracking-tight">Photos</h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#17233B]/70">
                The room, the counter, what you make. These show on your page under
                your offers, and they are the reason somebody picks you over the
                place next door.
            </p>

            <p className="mt-4 text-sm text-[#17233B]/65">
                <strong className="text-[#17233B]">
                    {shown.length} of {limit}
                </strong>{" "}
                used.
                {!hasPro && (
                    <>
                        {" "}
                        <Link
                            href={`/business/${businessId}/billing`}
                            className="font-medium text-[#FF593F] underline underline-offset-2"
                        >
                            Pro holds {PRO_PHOTO_LIMIT}
                        </Link>
                        .
                    </>
                )}
            </p>

            {problem && (
                <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-900">
                    {problem}
                </p>
            )}

            {/* Paused rather than deleted, and said so plainly — a
                business that cancels should be able to see that its
                work is still here. */}
            {paused.length > 0 && (
                <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                    {paused.length} more {paused.length === 1 ? "photo is" : "photos are"} still
                    here but off your page while you are on Free. They come back if you
                    upgrade — nothing has been deleted.
                </p>
            )}

            <div className="mt-6 max-w-sm">
                <ImagePicker
                    id="add-photo"
                    label="Add a photo"
                    hint="A landscape JPG, PNG or WebP. You can zoom and reposition it next."
                    aspect={4 / 3}
                    maxSize={1400}
                    quality={0.82}
                    convertToJpeg
                    modal
                    disabled={busy || full}
                    onChange={(file) => {
                        if (file) void add(file);
                    }}
                />

                {full && (
                    <p className="mt-2 text-xs leading-5 text-[#17233B]/60">
                        {hasPro
                            ? "That is all 25. Remove one to add another."
                            : "That is all 5 on Free. Upgrade to Pro for 25, or remove one."}
                    </p>
                )}
            </div>

            {photos.length > 0 && (
                <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {photos.map((photo, at) => (
                        <div
                            key={photo.id}
                            draggable={!busy}
                            onDragStart={() => setDragging(at)}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={() => {
                                if (dragging !== null && dragging !== at) void move(dragging, at);
                                setDragging(null);
                            }}
                            onDragEnd={() => setDragging(null)}
                            className={`cursor-grab rounded-xl border bg-white p-2 transition active:cursor-grabbing ${
                                dragging === at
                                    ? "border-[#FF593F] opacity-60"
                                    : "border-[#17233B]/10"
                            } ${photo.plan_paused_at ? "opacity-60" : ""}`}
                        >
                            <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-[#FFF8F0]">
                                <Image
                                    src={publicUrl(photo.storage_path)}
                                    alt={photoAlt(photo, businessName, at)}
                                    fill
                                    // An image is draggable on its own
                                    // by default, so starting a drag on
                                    // the photo dragged the photo
                                    // rather than the card it sits in
                                    // — a picture floating free of its
                                    // caption and buttons. Off, so the
                                    // drag belongs to the card and the
                                    // thing that moves looks like the
                                    // thing being moved.
                                    draggable={false}
                                    sizes="(min-width: 1024px) 20rem, (min-width: 640px) 45vw, 90vw"
                                    className="object-cover"
                                />

                                {at === 0 && !photo.plan_paused_at && (
                                    <span className="absolute left-2 top-2 rounded-full bg-[#17233B]/80 px-2 py-0.5 text-[11px] text-white">
                                        First
                                    </span>
                                )}

                                {photo.plan_paused_at && (
                                    <span className="absolute left-2 top-2 rounded-full bg-amber-500/90 px-2 py-0.5 text-[11px] text-white">
                                        Off your page
                                    </span>
                                )}
                            </div>

                            {/* The caption doubles as the image's alt
                                text, which is all somebody using a
                                screen reader gets. */}
                            <Input
                                defaultValue={photo.caption ?? ""}
                                onBlur={(event) => void describe(photo.id, event.target.value)}
                                placeholder="Add a caption"
                                maxLength={160}
                                className="mt-2 h-10 text-sm"
                            />

                            {/* Drag is the fast way and these are the
                                way that works on a phone, with a
                                keyboard, or with one hand. */}
                            <div className="mt-2 flex items-center justify-between">
                                <div className="flex gap-1">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        disabled={busy || at === 0}
                                        onClick={() => void move(at, at - 1)}
                                        aria-label={`Move ${photoAlt(photo, businessName, at)} earlier`}
                                    >
                                        <FiArrowLeft aria-hidden="true" />
                                    </Button>

                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        disabled={busy || at === photos.length - 1}
                                        onClick={() => void move(at, at + 1)}
                                        aria-label={`Move ${photoAlt(photo, businessName, at)} later`}
                                    >
                                        <FiArrowRight aria-hidden="true" />
                                    </Button>
                                </div>

                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    disabled={busy}
                                    onClick={() => void remove(photo)}
                                    className="text-[#17233B]/60 hover:text-red-700"
                                    aria-label={`Remove ${photoAlt(photo, businessName, at)}`}
                                >
                                    <FiTrash2 aria-hidden="true" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function publicUrl(path: string) {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/business-logos/${path}`;
}
