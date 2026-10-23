import type { User } from "@supabase/supabase-js";

export type UserProfile = {
    email: string;
    name: string;
    avatarUrl: string;
    displayName: string;
    initials: string;
};

function readText(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

// Up to two initials from the name, falling back to the email address.
export function initialsFor(name: string, email = "") {
    const source = name.trim() || email;

    return (
        source
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part.charAt(0).toUpperCase())
            .join("") || "U"
    );
}

// Normalises a Supabase user into what headers and menus display. The
// avatar is stored as a path in the profile-images bucket.
export function profileFromUser(
    user: User,
    publicUrlFor: (path: string) => string,
): UserProfile {
    const email = user.email ?? "";
    const name = readText(user.user_metadata?.full_name) || readText(user.user_metadata?.name);
    const avatarPath = readText(user.user_metadata?.avatar_path);

    return {
        email,
        name,
        avatarUrl: avatarPath ? publicUrlFor(avatarPath) : "",
        displayName: name || email.split("@")[0] || "Account",
        initials: initialsFor(name, email),
    };
}
