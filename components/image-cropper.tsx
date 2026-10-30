"use client";

import { useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { FiMinus, FiPlus } from "react-icons/fi";

import { Button } from "@/components/ui/button";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;

// Drag to reposition and zoom (slider, buttons, scroll or pinch) an image
// before it's saved. Zooming out below 1 leaves space around a wide logo
// instead of cutting it off. Pass the crop to cropImage() when saving.
export function ImageCropper({
    src,
    aspect = 1,
    round = false,
    onCropChange,
}: {
    src: string;
    aspect?: number;
    round?: boolean;
    onCropChange: (area: Area) => void;
}) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);

    const changeZoom = (next: number) => setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(next.toFixed(2)))));

    return (
        <div className="space-y-4">
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[#17233B]">
                <Cropper
                    image={src}
                    crop={crop}
                    zoom={zoom}
                    minZoom={MIN_ZOOM}
                    maxZoom={MAX_ZOOM}
                    zoomSpeed={0.2}
                    aspect={aspect}
                    cropShape={round ? "round" : "rect"}
                    restrictPosition={false}
                    objectFit="contain"
                    onCropChange={setCrop}
                    onZoomChange={changeZoom}
                    onCropComplete={(_, pixels) => onCropChange(pixels)}
                />
            </div>

            <div className="flex items-center gap-3">
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Zoom out"
                    onClick={() => changeZoom(zoom - ZOOM_STEP)}
                    disabled={zoom <= MIN_ZOOM}
                >
                    <FiMinus aria-hidden="true" />
                </Button>

                <input
                    type="range"
                    aria-label="Zoom"
                    min={MIN_ZOOM}
                    max={MAX_ZOOM}
                    step={0.01}
                    value={zoom}
                    onChange={(event) => changeZoom(Number(event.target.value))}
                    className="h-2 min-w-0 flex-1 cursor-pointer accent-[#FF593F]"
                />

                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Zoom in"
                    onClick={() => changeZoom(zoom + ZOOM_STEP)}
                    disabled={zoom >= MAX_ZOOM}
                >
                    <FiPlus aria-hidden="true" />
                </Button>
            </div>

            <p className="text-center text-xs text-[#17233B]/65">
                Drag to reposition. Zoom in to trim the edges, or out to fit the whole image.
            </p>
        </div>
    );
}

function loadImage(src: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("The image couldn't be read."));
        image.src = src;
    });
}

// Draws the cropped area onto a canvas, at most `maxSize` pixels wide. Areas
// outside the image stay transparent (white for JPEGs, which can't be).
export async function cropImage(
    src: string,
    area: Area,
    { type = "image/png", maxSize = 1024 }: { type?: string; maxSize?: number } = {},
) {
    const image = await loadImage(src);
    const scale = Math.min(1, maxSize / Math.max(area.width, area.height));

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(area.width * scale);
    canvas.height = Math.round(area.height * scale);

    const context = canvas.getContext("2d");
    if (!context) throw new Error("The image couldn't be cropped.");

    if (type === "image/jpeg") {
        context.fillStyle = "#FFFFFF";
        context.fillRect(0, 0, canvas.width, canvas.height);
    }

    context.imageSmoothingQuality = "high";
    context.drawImage(
        image,
        area.x, area.y, area.width, area.height,
        0, 0, canvas.width, canvas.height,
    );

    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error("The image couldn't be cropped."))),
            type,
            0.92,
        );
    });
}
