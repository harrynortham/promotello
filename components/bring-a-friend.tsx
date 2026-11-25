"use client";

import { useState } from "react";
import { FiCheck, FiCopy, FiShare2, FiUsers } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";

// A customer's own link to this shop.
//
// Minted when they ask for it rather than for everybody up front: most
// people will never press this, and a code per customer per business
// for all of them is a table full of rows nobody shared.
//
// It says what the referrer gets and when, because "share this" with no
// answer to "and then what" is an advert. The honest version is also
// the persuasive one: the reward lands when the friend has actually
// been in, which is the only version a shop would agree to.

export function BringAFriend({
    businessId,
    businessName,
    reward,
    isSignedIn,
}: {
    businessId: string;
    businessName: string;
    reward: string;
    isSignedIn: boolean;
}) {
    const [link, setLink] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [failed, setFailed] = useState(false);

    async function getLink() {
        setLoading(true);
        setFailed(false);

        const { data, error } = await createClient().rpc("my_friend_code", {
            requested_business_id: businessId,
        });

        setLoading(false);

        if (error || typeof data !== "string") {
            setFailed(true);
            return;
        }

        setLink(`${window.location.origin}/friend/${data}`);
    }

    async function copy() {
        if (!link) return;

        try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    }

    async function share() {
        if (!link) return;

        try {
            await navigator.share({
                text: `Come to ${businessName} with me — their offers are free to claim on your phone.`,
                url: link,
            });
        } catch {
            // Cancelled, or sharing isn't available: the link is still
            // on screen to copy.
        }
    }

    return (
        <section
            aria-labelledby="bring-a-friend"
            className="rounded-2xl border border-[#FF593F]/25 bg-[#FF593F]/[0.04] p-6"
        >
            <div className="flex items-start gap-3">
                <FiUsers aria-hidden="true" className="mt-1 size-5 shrink-0 text-[#FF593F]" />
                <div className="min-w-0">
                    <h2 id="bring-a-friend" className="text-lg font-semibold">
                        Bring a friend
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-[#17233B]/75">
                        Send somebody who hasn&apos;t been to {businessName} before. Once they
                        come in and the counter scans them, you get{" "}
                        <strong className="font-semibold">{reward.toLowerCase()}</strong>.
                    </p>
                </div>
            </div>

            {!isSignedIn ? (
                <p className="mt-4 text-sm text-[#17233B]/65">
                    Sign in to get your link.
                </p>
            ) : link ? (
                <div className="mt-4 space-y-3">
                    <code className="block truncate rounded-lg border bg-white px-3 py-2 text-xs">
                        {link}
                    </code>

                    <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" onClick={copy}>
                            {copied ? <FiCheck aria-hidden="true" /> : <FiCopy aria-hidden="true" />}
                            {copied ? "Copied" : "Copy your link"}
                        </Button>

                        {typeof navigator !== "undefined" && "share" in navigator && (
                            <Button type="button" variant="outline" size="sm" onClick={share}>
                                <FiShare2 aria-hidden="true" />
                                Share…
                            </Button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="mt-4">
                    <Button type="button" size="sm" onClick={getLink} disabled={loading}>
                        {loading ? "Getting your link…" : "Get my link"}
                    </Button>

                    {failed && (
                        <p className="mt-2 text-sm text-[#17233B]/65">
                            That didn&apos;t work. Try again in a moment.
                        </p>
                    )}
                </div>
            )}
        </section>
    );
}
