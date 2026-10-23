import Link from "next/link";
import {
    FiArrowRight,
    FiBell,
    FiDownload,
    FiFileText,
    FiShield,
    FiTrash2,
    FiUser,
} from "react-icons/fi";

import { Suspense } from "react";
import { connection } from "next/server";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/utils/supabase/server";
import type { DeletionOutcome } from "./actions";
import { DeleteAccount } from "./delete-account";

const settingsLinks = [
    {
        title: "Personal details",
        description:
            "Update your display name, profile photo, and preferred town or city.",
        href: "/account/profile",
        action: "Edit profile",
        icon: FiUser,
    },
    {
        title: "Email preferences",
        description:
            "Choose which optional emails you would like to receive.",
        href: "/account/notifications",
        action: "Manage preferences",
        icon: FiBell,
    },
];

async function DeleteAccountSection() {
    await connection();

    const supabase = await createClient();
    const { data } = await supabase.rpc("account_deletion_check");

    return <DeleteAccount outcomes={(data ?? []) as DeletionOutcome[]} />;
}

export default function AccountPrivacyPage() {
    return (
        <section className="space-y-6">
            <div>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    Privacy & data
                </h1>

                <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
                    Manage your personal information, understand how it is
                    used, and contact us about your data or account.
                </p>
            </div>

            <Card className="rounded-2xl bg-muted/30 shadow-none">
                <CardHeader>
                    <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-background">
                        <FiShield
                            aria-hidden="true"
                            className="size-5"
                        />
                    </div>

                    <CardTitle>Your account, across Promotello</CardTitle>

                    <CardDescription className="leading-7">
                        Your personal account is shared between the customer
                        and business areas. Changes to your personal account
                        can therefore affect both.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <p className="text-sm leading-7 text-muted-foreground">
                        Business profiles, team access, and business
                        notification settings are managed separately in each
                        business dashboard.
                    </p>
                </CardContent>
            </Card>

            <div className="grid gap-5 xl:grid-cols-2">
                {settingsLinks.map((setting) => {
                    const Icon = setting.icon;

                    return (
                        <Card
                            key={setting.href}
                            className="flex flex-col rounded-2xl shadow-none"
                        >
                            <CardHeader>
                                <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-muted">
                                    <Icon
                                        aria-hidden="true"
                                        className="size-5"
                                    />
                                </div>

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

            <Card className="rounded-2xl shadow-none">
                <CardHeader>
                    <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-muted">
                        <FiDownload
                            aria-hidden="true"
                            className="size-5"
                        />
                    </div>

                    <CardTitle>Request your personal data</CardTitle>

                    <CardDescription className="leading-7">
                        Contact us if you would like to request a copy of the
                        personal information associated with your account.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-5">
                    <Badge variant="secondary">
                        Handled through support
                    </Badge>

                    <p className="text-sm leading-7 text-muted-foreground">
                        Use your account email when contacting us. We may need
                        to verify your identity before sharing information.
                        Please do not include your password or redemption
                        codes.
                    </p>

                    <Button
                        render={<Link href="/contact" />}
                        nativeButton={false}
                        variant="outline"
                    >
                        Contact us about a data request
                        <FiArrowRight aria-hidden="true" />
                    </Button>
                </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-none">
                <CardHeader>
                    <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-muted">
                        <FiFileText
                            aria-hidden="true"
                            className="size-5"
                        />
                    </div>

                    <CardTitle>Understand your privacy</CardTitle>

                    <CardDescription className="leading-7">
                        Read about how Promotello handles personal information
                        and uses cookies or similar technologies.
                    </CardDescription>
                </CardHeader>

                <CardContent className="flex flex-wrap gap-3">
                    <Button
                        render={<Link href="/legal/privacy" />}
                        nativeButton={false}
                        variant="outline"
                        size="sm"
                    >
                        Privacy policy
                    </Button>

                    <Button
                        render={<Link href="/legal/cookies" />}
                        nativeButton={false}
                        variant="outline"
                        size="sm"
                    >
                        Cookie policy
                    </Button>
                </CardContent>
            </Card>

            <Card className="rounded-2xl border-destructive/25 shadow-none">
                <CardHeader>
                    <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                        <FiTrash2
                            aria-hidden="true"
                            className="size-5"
                        />
                    </div>

                    <CardTitle>Delete your account</CardTitle>

                    <CardDescription className="leading-7">
                        Permanently delete your Promotello account and personal
                        information. This can&apos;t be undone.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <Suspense fallback={<Skeleton className="h-40 rounded-xl" />}>
                        <DeleteAccountSection />
                    </Suspense>
                </CardContent>
            </Card>
        </section>
    );
}