"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { profileFromUser, type UserProfile } from "@/lib/user-profile";
import { createClient } from "@/utils/supabase/client";

// The signed-in user for headers and menus, kept in sync with sign-in,
// sign-out and profile changes.
export function useCurrentUser() {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const supabase = createClient();
        let isMounted = true;
        let authEventReceived = false;

        function update(authUser: User | null) {
            if (!isMounted) return;

            setUser(
                authUser
                    ? profileFromUser(
                        authUser,
                        (path) => supabase.storage.from("profile-images").getPublicUrl(path).data.publicUrl,
                    )
                    : null,
            );
            setIsLoading(false);
        }

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            authEventReceived = true;
            update(session?.user ?? null);
        });

        supabase.auth
            .getUser()
            .then(({ data }) => {
                if (!authEventReceived) update(data.user);
            })
            .catch(() => {
                if (isMounted && !authEventReceived) setIsLoading(false);
            });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    return { user, isLoading };
}
