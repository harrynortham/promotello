"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { photoAlt, type BusinessPhoto } from "@/lib/business-photos";

// The photos on a business's public page.
//
// A grid that opens a lightbox, which is what anybody expects of a row
// of photos and what they will try without being told.
// Each photo arrives with its url already built. Not a urlFor
// function: a function cannot be passed from a server component to a
// client one, and that is a runtime error TypeScript does not catch.
export type GalleryPhoto = BusinessPhoto & { url: string };

export function BusinessGallery({
    photos,
    businessName,
}: {
    photos: GalleryPhoto[];
    businessName: string;
}) {
    // null when closed; an index when open.
    const [open, setOpen] = useState<number | null>(null);

    // Where to put focus back. A lightbox that closes to the top of the
    // page loses somebody who was six photos in.
    const opener = useRef<HTMLButtonElement | null>(null);
    const thumbs = useRef<(HTMLButtonElement | null)[]>([]);

    const step = useCallback(
        (by: number) =>
            setOpen((at) => (at === null ? at : (at + by + photos.length) % photos.length)),
        [photos.length],
    );

    useEffect(() => {
        if (open === null) return;

        const onKey = (event: KeyboardEvent) => {
            if (event.key === "ArrowRight") step(1);
            if (event.key === "ArrowLeft") step(-1);
        };

        window.addEventListener("keydown", onKey);

        return () => window.removeEventListener("keydown", onKey);
    }, [open, step]);

    if (photos.length === 0) return null;

    const showing = open === null ? null : photos[open];

    return (
        <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {photos.map((photo, at) => (
                    <button
                        key={photo.id}
                        type="button"
                        ref={(node) => {
                            thumbs.current[at] = node;
                        }}
                        onClick={(event) => {
                            opener.current = event.currentTarget;
                            setOpen(at);
                        }}
                        className="group relative aspect-square overflow-hidden rounded-xl bg-[#FFF8F0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF593F]"
                    >
                        <Image
                            src={photo.url}
                            alt={photoAlt(photo, businessName, at)}
                            fill
                            // The first is near the top of what a
                            // visitor scrolls to; the rest can wait
                            // until they get there.
                            priority={at === 0}
                            loading={at === 0 ? undefined : "lazy"}
                            sizes="(min-width: 1024px) 18rem, (min-width: 640px) 30vw, 45vw"
                            className="object-cover transition duration-300 group-hover:scale-[1.03]"
                        />
                    </button>
                ))}
            </div>

            <Dialog
                open={open !== null}
                onOpenChange={(next) => {
                    if (next) return;

                    setOpen(null);
                    // Back to the thumbnail they opened, not the top of
                    // the page.
                    opener.current?.focus();
                }}
            >
                {/* A dark panel of its own. The shared overlay is
                    bg-black/10 — right for a dialog on a light page,
                    and far too light to read white text against, which
                    is what a transparent lightbox gave: a caption
                    nobody could see. The close button is told the same
                    thing, since a ghost button on navy is dark on
                    dark. */}
                <DialogContent
                    className={[
                        "max-w-4xl bg-[#17233B] p-4 text-white ring-foreground/20",
                        // The close button sits over the photo, so it
                        // cannot borrow its contrast from the panel —
                        // white on whatever happens to be in the top
                        // right corner is white on nothing. It gets a
                        // dark disc of its own, and a size worth aiming
                        // a thumb at.
                        "[&_[data-slot=dialog-close]]:size-9",
                        "[&_[data-slot=dialog-close]]:rounded-full",
                        "[&_[data-slot=dialog-close]]:bg-[#17233B]/70",
                        "[&_[data-slot=dialog-close]]:text-white",
                        "[&_[data-slot=dialog-close]]:ring-1",
                        "[&_[data-slot=dialog-close]]:ring-white/25",
                        "[&_[data-slot=dialog-close]]:hover:bg-[#17233B]",
                        "[&_[data-slot=dialog-close]]:hover:text-white",
                        "[&_[data-slot=dialog-close]]:top-6",
                        "[&_[data-slot=dialog-close]]:right-6",
                    ].join(" ")}
                >
                    {showing && (
                        <>
                            {/* Named for a screen reader, which is told
                                a dialog opened and otherwise nothing
                                about what is in it. */}
                            <DialogTitle className="sr-only">
                                {photoAlt(showing, businessName, open!)} — photo {open! + 1} of{" "}
                                {photos.length}
                            </DialogTitle>

                            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-black/40">
                                <Image
                                    src={showing.url}
                                    alt={photoAlt(showing, businessName, open!)}
                                    fill
                                    sizes="(min-width: 1024px) 56rem, 100vw"
                                    className="object-contain"
                                />
                            </div>

                            {showing.caption && (
                                <p className="mt-3 text-center text-sm leading-6 text-white">
                                    {showing.caption}
                                </p>
                            )}

                            {photos.length > 1 && (
                                <div className="mt-3 flex items-center justify-center gap-4 text-white">
                                    <button
                                        type="button"
                                        onClick={() => step(-1)}
                                        aria-label="Previous photo"
                                        className="flex size-10 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25"
                                    >
                                        <FiChevronLeft aria-hidden="true" className="size-5" />
                                    </button>

                                    <span className="text-sm tabular-nums">
                                        {open! + 1} / {photos.length}
                                    </span>

                                    <button
                                        type="button"
                                        onClick={() => step(1)}
                                        aria-label="Next photo"
                                        className="flex size-10 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25"
                                    >
                                        <FiChevronRight aria-hidden="true" className="size-5" />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
