"use client";

import Link from "next/link";
import { useState } from "react";
import { FiCheck, FiPlus } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";

type FollowButtonProps = {
    businessId: string;
    initialFollowing: boolean;
    isSignedIn: boolean;
    size?: "sm" | "default";
};

// Follow a business to get an email when it posts a new offer.
export function FollowButton({ businessId, initialFollowing, isSignedIn, size = "default" }: FollowButtonProps) {
    const [following, setFollowing] = useState(initialFollowing);
    const [pending, setPending] = useState(false);
    const [failed, setFailed] = useState(false);

    if (!isSignedIn) {
        return (
            <Button
                render={<Link href={`/login?next=${encodeURIComponent(`/businesses/${businessId}`)}`} />}
                nativeButton={false}
                variant="outline"
                size={size}
                title="Get an email when they post a new offer"
            >
                <FiPlus aria-hidden="true" />
                Follow
            </Button>
        );
    }

    async function toggle() {
        setPending(true);
        setFailed(false);

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = !user
            ? { error: new Error("Signed out") }
            : following
                ? await supabase.from("business_followers").delete().eq("business_id", businessId).eq("user_id", user.id)
                : await supabase.from("business_followers").insert({ business_id: businessId, user_id: user.id });

        if (error) {
            setFailed(true);
        } else {
            setFollowing(!following);
        }

        setPending(false);
    }

    return (
        <Button
            type="button"
            onClick={toggle}
            disabled={pending}
            variant="outline"
            size={size}
            aria-pressed={following}
            title={following ? "You'll get an email when they post a new offer. Click to unfollow." : "Get an email when they post a new offer"}
            className={following ? "border-[#FF593F]/40 bg-[#FF593F]/10 text-[#C2341F] hover:bg-[#FF593F]/15" : undefined}
        >
            {following ? <FiCheck aria-hidden="true" /> : <FiPlus aria-hidden="true" />}
            {failed ? "Try again" : following ? "Following" : "Follow"}
        </Button>
    );
}
