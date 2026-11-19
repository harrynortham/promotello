"use client";

import Image from "next/image";
import Link from "next/link";

import { claimPreview } from "@/app/(business)/business/preview/[token]/actions";
import { SubmitButton } from "@/components/submit-button";

// The header on a preview page.
//
// A preview is a letter to one business, not a shop window: no nav, no
// menu, no sign-in and no avatar, because every one of those is a way
// off the page before they have decided. The logo, and the one thing
// the page is for.
//
// The claim is the real form rather than a link to one. A link could
// only guess at what pressing Claim does — it sends somebody signed out
// to register and somebody signed in straight into setup, and it records
// that they started.
//
// The page decides whether to pass a token. A preview that has been
// claimed already has an owner, so there is nothing here to claim and
// the header is the logo alone — which is why this is the page's to
// render and not the layout's: the layout cannot know.
export function PreviewHeader({ token }: { token?: string | null }) {
    return (
        <header className="sticky top-0 z-50 bg-background/95 px-6 backdrop-blur-md print:hidden">
            <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4">
                <Link href="/business" aria-label="Promotello home" className="shrink-0">
                    <Image
                        src="/brand/promotello-horizontal-primary.svg"
                        alt="Promotello"
                        width={180}
                        height={48}
                        priority
                        className="h-auto w-36 sm:w-44"
                    />
                </Link>

                {token && (
                    <form action={claimPreview}>
                        <input type="hidden" name="token" value={token} />
                        <SubmitButton pendingLabel="Claiming…" size="lg">
                            Claim your page
                        </SubmitButton>
                    </form>
                )}
            </div>
        </header>
    );
}
