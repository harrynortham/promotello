"use client";

import { businessPath } from "@/lib/slugs";
import Link from "next/link";
import { useState } from "react";
import { FiHeart } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/utils/supabase/client";

export type FollowedBusiness = {
    business_id: string;
    emails_enabled: boolean;
    businesses: { slug: string; name: string; logo_url: string | null } | null;
};

// Businesses the customer follows, with a per-business email switch.
export function FollowedBusinesses({ follows: initialFollows }: { follows: FollowedBusiness[] }) {
    const [follows, setFollows] = useState(initialFollows);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [error, setError] = useState(false);

    async function update(businessId: string, change: "emails-on" | "emails-off" | "unfollow") {
        setBusyId(businessId);
        setError(false);

        const supabase = createClient();
        const query = supabase.from("business_followers");
        const { data: { user } } = await supabase.auth.getUser();

        const { error: updateError } = !user
            ? { error: new Error("Signed out") }
            : change === "unfollow"
                ? await query.delete().eq("business_id", businessId).eq("user_id", user.id)
                : await query
                    .update({ emails_enabled: change === "emails-on" })
                    .eq("business_id", businessId)
                    .eq("user_id", user.id);

        if (updateError) {
            setError(true);
        } else {
            setFollows((current) =>
                change === "unfollow"
                    ? current.filter((follow) => follow.business_id !== businessId)
                    : current.map((follow) =>
                        follow.business_id === businessId
                            ? { ...follow, emails_enabled: change === "emails-on" }
                            : follow,
                    ),
            );
        }

        setBusyId(null);
    }

    return (
        <Card className="rounded-2xl shadow-none">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <FiHeart aria-hidden="true" className="size-5 text-muted-foreground" />
                    Businesses you follow
                </CardTitle>

                <CardDescription className="leading-7">
                    Followed businesses can email you when they post a new offer.
                </CardDescription>
            </CardHeader>

            <CardContent>
                {follows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        You don&apos;t follow any businesses yet. Tap Follow on a{" "}
                        <Link href="/businesses" className="font-medium text-[#C8371D] hover:underline">
                            business page
                        </Link>{" "}
                        to hear about their new offers.
                    </p>
                ) : (
                    <ul className="divide-y">
                        {follows.map((follow) => {
                            const name = follow.businesses?.name ?? "Business";
                            const switchId = `follow-emails-${follow.business_id}`;

                            return (
                                <li key={follow.business_id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0">
                                    <Link href={follow.businesses ? businessPath(follow.businesses) : "/businesses"} className="min-w-0 font-medium hover:text-[#C8371D]">
                                        {name}
                                    </Link>

                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                id={switchId}
                                                checked={follow.emails_enabled}
                                                disabled={busyId === follow.business_id}
                                                onCheckedChange={(checked) =>
                                                    update(follow.business_id, checked ? "emails-on" : "emails-off")
                                                }
                                            />
                                            <Label htmlFor={switchId} className="text-sm text-muted-foreground">
                                                Emails
                                            </Label>
                                        </div>

                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={busyId === follow.business_id}
                                            onClick={() => update(follow.business_id, "unfollow")}
                                        >
                                            Unfollow
                                        </Button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}

                {error && (
                    <p role="alert" className="mt-4 text-sm text-red-700">
                        That didn&apos;t save. Please try again.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
