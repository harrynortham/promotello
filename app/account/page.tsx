import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import {
    FiArrowRight,
    FiBell,
    FiCheckCircle,
    FiLock,
    FiShield,
    FiUser,
} from "react-icons/fi";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/utils/supabase/server";
import { signOut } from "./actions";

const settings = [
    {
        title: "Your profile",
        description:
            "Manage your display name, profile photo, and personal details.",
        href: "/account/profile",
        action: "Edit profile",
        icon: FiUser,
    },
    {
        title: "Login & security",
        description:
            "Manage your password and the email address you use to sign in.",
        href: "/account/security",
        action: "Manage security",
        icon: FiLock,
    },
    {
        title: "Notifications",
        description:
            "Choose which optional updates you would like to receive.",
        href: "/account/notifications",
        action: "Set preferences",
        icon: FiBell,
    },
    {
        title: "Privacy & data",
        description:
            "Find options for your personal data and account deletion.",
        href: "/account/privacy",
        action: "Manage privacy",
        icon: FiShield,
    },
];

function getDisplayName(metadata: Record<string, unknown>) {
    for (const value of [metadata.full_name, metadata.name]) {
        if (typeof value === "string" && value.trim()) {
            return value.trim();
        }
    }

    return "";
}

function getInitials(name: string, email?: string) {
    if (name) {
        return name
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part.charAt(0))
            .join("")
            .toUpperCase();
    }

    return email?.charAt(0).toUpperCase() || "U";
}

async function AccountContent() {
    await connection();

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const displayName = getDisplayName(user.user_metadata);
    const firstName = displayName.split(/\s+/)[0];
    const initials = getInitials(displayName, user.email);
    const isEmailVerified = Boolean(user.email_confirmed_at);

    return (
        <section className="space-y-8">
            <div>
                <Badge variant="outline">Your account</Badge>

                <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                    {firstName
                        ? `Welcome back, ${firstName}.`
                        : "Make yourself at home."}
                </h1>

                <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
                    Your details, preferences, and security—all in one place.
                    These settings apply wherever you use Promotello.
                </p>
            </div>

            <Card className="overflow-hidden rounded-3xl shadow-none">
                <CardContent className="p-6 sm:p-8">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-4">
                            <span
                                aria-hidden="true"
                                className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-xl font-semibold text-primary"
                            >
                                {initials}
                            </span>

                            <div className="min-w-0">
                                <h2 className="truncate text-xl font-semibold">
                                    {displayName || "Your Promotello account"}
                                </h2>

                                <p className="mt-1 break-all text-sm text-muted-foreground">
                                    {user.email || "No email address"}
                                </p>

                                <div className="mt-3 flex flex-wrap gap-2">
                                    <Badge variant="secondary">
                                        Signed in
                                    </Badge>

                                    {isEmailVerified && (
                                        <Badge variant="outline">
                                            <FiCheckCircle
                                                aria-hidden="true"
                                                className="mr-1 size-3"
                                            />
                                            Email verified
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>

                        <Button
                            render={<Link href="/account/profile" />}
                            nativeButton={false}
                            variant="outline"
                            className="w-fit shrink-0"
                        >
                            Edit profile
                            <FiArrowRight aria-hidden="true" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div>
                <h2 className="text-xl font-semibold tracking-tight">
                    Account settings
                </h2>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Keep your information up to date and make Promotello work
                    for you.
                </p>

                <div className="mt-5 grid gap-5 xl:grid-cols-2">
                    {settings.map((setting) => {
                        const Icon = setting.icon;

                        return (
                            <Card
                                key={setting.href}
                                className="flex flex-col rounded-2xl shadow-none"
                            >
                                <CardHeader>
                                    <span className="mb-3 flex size-11 items-center justify-center rounded-xl bg-muted">
                                        <Icon
                                            aria-hidden="true"
                                            className="size-5"
                                        />
                                    </span>

                                    <CardTitle className="text-lg">
                                        {setting.title}
                                    </CardTitle>

                                    <CardDescription className="leading-7">
                                        {setting.description}
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="mt-auto">
                                    <Button
                                        render={
                                            <Link href={setting.href} />
                                        }
                                        nativeButton={false}
                                        variant="outline"
                                        size="sm"
                                    >
                                        {setting.action}
                                        <FiArrowRight aria-hidden="true" />
                                    </Button>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>

            <Card className="rounded-2xl bg-muted/30 shadow-none">
                <CardContent className="p-6">
                    <h2 className="font-semibold">
                        Manage a business too?
                    </h2>

                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                        Business profiles, team access, and business email
                        preferences are managed separately in your business
                        dashboard.
                    </p>

                    <Button
                        render={<Link href="/business/dashboard" />}
                        nativeButton={false}
                        variant="link"
                        className="mt-2 h-auto px-0"
                    >
                        Go to business dashboard
                        <FiArrowRight aria-hidden="true" />
                    </Button>
                </CardContent>
            </Card>

            <Separator />

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="font-semibold">
                        Finished for now?
                    </h2>

                    <p className="mt-1 text-sm text-muted-foreground">
                        Sign out when using a shared device.
                    </p>
                </div>

                <form action={signOut}>
                    <Button type="submit" variant="outline">
                        Sign out
                    </Button>
                </form>
            </div>
        </section>
    );
}

function AccountLoading() {
    return (
        <section
            role="status"
            aria-label="Loading account overview"
            className="space-y-8"
        >
            <div className="space-y-3">
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-10 w-72 max-w-full" />
                <Skeleton className="h-5 w-full max-w-lg" />
            </div>

            <Skeleton className="h-44 rounded-3xl" />

            <div className="grid gap-5 xl:grid-cols-2">
                {[1, 2, 3, 4].map((item) => (
                    <Skeleton
                        key={item}
                        className="h-60 rounded-2xl"
                    />
                ))}
            </div>
        </section>
    );
}

export default function AccountPage() {
    return (
        <Suspense fallback={<AccountLoading />}>
            <AccountContent />
        </Suspense>
    );
}