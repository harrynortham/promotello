"use client";

import jsQR from "jsqr";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { FiCamera } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { cardCodeFrom } from "@/lib/card-code";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

// Scanning a customer's card from the dashboard, for staff who are
// already on this page with a phone in their hand. The card's QR opens
// /stamp/<code> when read by the phone's own camera app, so this does
// the same thing without leaving the browser.
//
// BarcodeDetector where the browser has it (Android Chrome), jsQR
// everywhere else, including iOS Safari, which has no detector.

type Detector = { detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]> };

export function ScanCardButton({ className = "" }: { className?: string }) {
    const router = useRouter();
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const frameRef = useRef<number | null>(null);

    const [open, setOpen] = useState(false);
    const [problem, setProblem] = useState("");

    const stop = useCallback(() => {
        if (frameRef.current !== null) {
            cancelAnimationFrame(frameRef.current);
            frameRef.current = null;
        }

        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
    }, []);

    useEffect(() => stop, [stop]);

    useEffect(() => {
        if (!open) {
            stop();
            return;
        }

        let cancelled = false;

        async function start() {
            // Cleared here rather than in the effect body: a setState in
            // the body of an effect cascades a render.
            setProblem("");

            if (!navigator.mediaDevices?.getUserMedia) {
                setProblem("This browser can't open the camera. Type the code instead.");
                return;
            }

            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "environment" },
                });

                if (cancelled) {
                    stream.getTracks().forEach((track) => track.stop());
                    return;
                }

                streamRef.current = stream;

                const video = videoRef.current;
                if (!video) return;

                video.srcObject = stream;
                await video.play();

                const canvas = document.createElement("canvas");
                const context = canvas.getContext("2d", { willReadFrequently: true });

                const maker = (window as { BarcodeDetector?: new (options: { formats: string[] }) => Detector })
                    .BarcodeDetector;
                const detector = maker ? new maker({ formats: ["qr_code"] }) : null;

                const read = async () => {
                    if (cancelled || !video.videoWidth) {
                        frameRef.current = requestAnimationFrame(read);
                        return;
                    }

                    let text: string | null = null;

                    if (detector) {
                        const found = await detector.detect(video).catch(() => []);
                        text = found[0]?.rawValue ?? null;
                    } else if (context) {
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        context.drawImage(video, 0, 0, canvas.width, canvas.height);
                        const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
                        text = jsQR(pixels.data, pixels.width, pixels.height)?.data ?? null;
                    }

                    const code = text ? cardCodeFrom(text) : null;

                    if (code) {
                        stop();
                        router.push(`/stamp/${code}`);
                        return;
                    }

                    frameRef.current = requestAnimationFrame(read);
                };

                frameRef.current = requestAnimationFrame(read);
            } catch {
                setProblem(
                    "We couldn't use the camera. Allow camera access for this site, or type the code instead.",
                );
            }
        }

        start();

        return () => {
            cancelled = true;
            stop();
        };
    }, [open, router, stop]);

    return (
        <>
            <Button
                type="button"
                variant="outline"
                size="lg"
                className={className}
                onClick={() => setOpen(true)}
            >
                <FiCamera aria-hidden="true" />
                Scan a card
            </Button>

            <Dialog
                open={open}
                onOpenChange={(next) => {
                    setOpen(next);
                    if (!next) stop();
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Scan the customer&apos;s card</DialogTitle>

                        <DialogDescription>
                            Point the camera at the QR code on their card. It opens
                            the same page as scanning it with your phone&apos;s camera.
                        </DialogDescription>
                    </DialogHeader>

                    {problem ? (
                        <p className="rounded-xl bg-[#FFF4E8] px-4 py-3 text-sm text-[#17233B]/75">
                            {problem}
                        </p>
                    ) : (
                        <div className="relative overflow-hidden rounded-xl bg-[#17233B]">
                            <video
                                ref={videoRef}
                                muted
                                playsInline
                                className="aspect-square w-full object-cover"
                            />

                            {/* Where to hold the card. */}
                            <div
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-8 rounded-xl border-2 border-white/70"
                            />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
