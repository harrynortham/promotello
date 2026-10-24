"use client";

import { useState } from "react";
import { FiCheck, FiCopy, FiDownload, FiMail, FiShare2 } from "react-icons/fi";
import { SocialIcon } from "react-social-icons/component";
import "react-social-icons/whatsapp";
import "react-social-icons/facebook";
import "react-social-icons/x";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { shareLinks } from "@/lib/share";

export type ShareImage = {
    label: string;
    href: string;
    filename: string;
    // e.g. "aspect-[9/16]"
    aspect: string;
};

type SharePanelProps = {
    title: string;
    url: string;
    caption: string;
    images: ShareImage[];
    stats?: { views: number; sharedViews: number };
    triggerLabel?: string;
};

function useCopy() {
    const [copied, setCopied] = useState<string | null>(null);

    async function copy(key: string, text: string) {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(key);
            setTimeout(() => setCopied((current) => (current === key ? null : current)), 2000);
        } catch {
            setCopied(null);
        }
    }

    return { copied, copy };
}

// Share a promotion: its link, a suggested caption, one-tap links to each
// network, and ready-made images for Instagram and Facebook.
export function SharePanel({ title, url, caption, images, stats, triggerLabel = "Share" }: SharePanelProps) {
    const { copied, copy } = useCopy();
    const [sharing, setSharing] = useState(false);
    const links = shareLinks({ url, text: caption });
    const canNativeShare = typeof navigator !== "undefined" && "share" in navigator;

    // On phones, opens the share sheet (Instagram, WhatsApp, Messages…),
    // with the square image attached where the phone allows it.
    async function nativeShare() {
        setSharing(true);

        try {
            const square = images.find((image) => image.aspect === "aspect-square") ?? images[0];
            let files: File[] = [];

            if (square) {
                const blob = await (await fetch(square.href)).blob();
                files = [new File([blob], square.filename, { type: blob.type || "image/png" })];
            }

            const data = navigator.canShare?.({ files }) ? { files, text: `${caption} ${url}` } : { text: caption, url };
            await navigator.share(data);
        } catch {
            // Cancelled, or sharing isn't available: nothing to do.
        } finally {
            setSharing(false);
        }
    }

    return (
        <Dialog>
            <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
                <FiShare2 aria-hidden="true" />
                {triggerLabel}
            </DialogTrigger>

            <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Share this promotion</DialogTitle>
                    <DialogDescription>{title}</DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    <div>
                        <p className="text-sm font-medium">Link</p>
                        <div className="mt-2 flex gap-2">
                            <code className="min-w-0 flex-1 truncate rounded-md border bg-muted/40 px-3 py-2 text-xs">{url}</code>
                            <Button type="button" variant="outline" size="sm" onClick={() => copy("link", url)}>
                                {copied === "link" ? <FiCheck aria-hidden="true" /> : <FiCopy aria-hidden="true" />}
                                {copied === "link" ? "Copied" : "Copy link"}
                            </Button>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                            Views from this link are counted separately in your analytics.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {canNativeShare && (
                            <Button type="button" onClick={nativeShare} disabled={sharing}>
                                <FiShare2 aria-hidden="true" />
                                {sharing ? "Opening…" : "Share…"}
                            </Button>
                        )}
                        {[
                            { network: "whatsapp", label: "WhatsApp", href: links.whatsapp },
                            { network: "facebook", label: "Facebook", href: links.facebook },
                            { network: "x", label: "X", href: links.x },
                        ].map(({ network, label, href }) => (
                            <Button
                                key={network}
                                render={<a href={href} target="_blank" rel="noopener noreferrer" />}
                                nativeButton={false}
                                variant="outline"
                            >
                                <SocialIcon as="span" network={network} style={{ width: 18, height: 18 }} />
                                {label}
                            </Button>
                        ))}
                        <Button render={<a href={links.email} />} nativeButton={false} variant="outline">
                            <FiMail aria-hidden="true" />
                            Email
                        </Button>
                    </div>

                    <div>
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium">Suggested caption</p>
                            <Button type="button" variant="ghost" size="sm" onClick={() => copy("caption", `${caption} ${url}`)}>
                                {copied === "caption" ? <FiCheck aria-hidden="true" /> : <FiCopy aria-hidden="true" />}
                                {copied === "caption" ? "Copied" : "Copy caption"}
                            </Button>
                        </div>
                        <p className="mt-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                            {caption} {url}
                        </p>
                    </div>

                    {images.length > 0 && (
                        <div>
                            <p className="text-sm font-medium">Images for Instagram and Facebook</p>
                            <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-[1fr_1.4fr]">
                                {images.map((image) => (
                                    <figure key={image.href} className="flex flex-col">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={image.href}
                                            alt={`${image.label} for ${title}`}
                                            loading="lazy"
                                            className={`w-full rounded-lg border object-cover ${image.aspect}`}
                                        />
                                        <figcaption className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                            {image.label}
                                            <Button
                                                render={<a href={image.href} download={image.filename} />}
                                                nativeButton={false}
                                                variant="outline"
                                                size="sm"
                                            >
                                                <FiDownload aria-hidden="true" />
                                                Download
                                            </Button>
                                        </figcaption>
                                    </figure>
                                ))}
                            </div>
                        </div>
                    )}

                    {stats && (
                        <p className="rounded-md bg-[#FF593F]/5 px-3 py-2 text-sm">
                            Last 30 days: <strong>{stats.views}</strong> views of this promotion,{" "}
                            <strong>{stats.sharedViews}</strong> from shared links.
                        </p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
