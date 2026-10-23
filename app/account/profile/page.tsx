import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/utils/supabase/server";
import ProfileForm from "./profile-form";

function readText(value: unknown) {
    return typeof value === "string" ? value : "";
}

async function ProfileContent() {
    await connection();

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: birthday } = await supabase
        .from("customer_birthdays")
        .select("birth_month, birth_day")
        .eq("user_id", user.id)
        .maybeSingle();

    return (
        <ProfileForm
            key={user.id}
            initialProfile={{
                name:
                    readText(user.user_metadata.full_name) ||
                    readText(user.user_metadata.name),
                city: readText(user.user_metadata.city),
                avatarPath: readText(user.user_metadata.avatar_path),
                email: user.email ?? "",
                birthMonth: birthday?.birth_month ?? null,
                birthDay: birthday?.birth_day ?? null,
            }}
        />
    );
}

function ProfileLoading() {
    return (
        <section
            role="status"
            aria-label="Loading your profile"
            className="space-y-6"
        >
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-5 w-80 max-w-full" />
            <Skeleton className="h-52 rounded-2xl" />
            <Skeleton className="h-80 rounded-2xl" />
        </section>
    );
}

export default function ProfilePage() {
    return (
        <Suspense fallback={<ProfileLoading />}>
            <ProfileContent />
        </Suspense>
    );
}