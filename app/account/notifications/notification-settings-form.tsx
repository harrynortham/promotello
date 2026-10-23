"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
    FiBell,
    FiGift,
    FiHeart,
    FiMail,
    FiMessageCircle,
    FiShield,
} from "react-icons/fi";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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

type NotificationSettings = {
    followed_business_emails_enabled: boolean;
    local_deals_enabled: boolean;
    product_updates_enabled: boolean;
    feedback_requests_enabled: boolean;
};

type NotificationSettingsFormProps = {
    email: string;
    initialSettings: NotificationSettings;
    followedBusinesses: React.ReactNode;
};

type Feedback = {
    type: "success" | "error";
    message: string;
} | null;

const preferences = [
    {
        key: "followed_business_emails_enabled",
        title: "New offers from businesses you follow",
        description:
            "An email when a business you follow posts a new offer. You can also turn this off for one business below.",
        icon: FiHeart,
    },
    {
        key: "local_deals_enabled",
        title: "Deals & discoveries",
        description:
            "Optional emails about promotions, businesses, and places to explore.",
        icon: FiGift,
    },
    {
        key: "product_updates_enabled",
        title: "What’s new at Promotello",
        description:
            "Updates about new features and ways to use Promotello.",
        icon: FiBell,
    },
    {
        key: "feedback_requests_enabled",
        title: "Feedback & research",
        description:
            "Occasional invitations to share your experience and help improve Promotello.",
        icon: FiMessageCircle,
    },
] satisfies {
    key: keyof NotificationSettings;
    title: string;
    description: string;
    icon: typeof FiBell;
}[];

function settingsMatch(
    first: NotificationSettings,
    second: NotificationSettings,
) {
    return (
        first.followed_business_emails_enabled === second.followed_business_emails_enabled &&
        first.local_deals_enabled === second.local_deals_enabled &&
        first.product_updates_enabled === second.product_updates_enabled &&
        first.feedback_requests_enabled === second.feedback_requests_enabled
    );
}

export default function NotificationSettingsForm({
    email,
    initialSettings,
    followedBusinesses,
}: NotificationSettingsFormProps) {
    const router = useRouter();
    const busyRef = useRef(false);

    const [settings, setSettings] =
        useState<NotificationSettings>(initialSettings);

    const [savedSettings, setSavedSettings] =
        useState<NotificationSettings>(initialSettings);

    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState<Feedback>(null);

    const hasChanges = !settingsMatch(settings, savedSettings);

    function updatePreference(
        key: keyof NotificationSettings,
        checked: boolean,
    ) {
        setSettings((current) => ({
            ...current,
            [key]: checked,
        }));

        setFeedback(null);
    }

    async function savePreferences(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        if (busyRef.current || !hasChanges) {
            return;
        }

        busyRef.current = true;
        setIsSaving(true);
        setFeedback(null);

        const submittedSettings = { ...settings };

        try {
            const supabase = createClient();

            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();

            if (userError || !user) {
                throw new Error(
                    "Your session could not be verified. Please sign in again.",
                );
            }

            const { error } = await supabase
                .from("account_notification_settings")
                .upsert(
                    {
                        user_id: user.id,
                        ...submittedSettings,
                    },
                    { onConflict: "user_id" },
                );

            if (error) {
                throw new Error(
                    "We couldn’t save your preferences. Please try again.",
                );
            }

            setSavedSettings(submittedSettings);

            setFeedback({
                type: "success",
                message: "Your notification preferences have been saved.",
            });

            router.refresh();
        } catch (error) {
            setFeedback({
                type: "error",
                message:
                    error instanceof Error
                        ? error.message
                        : "Something went wrong. Please try again.",
            });
        } finally {
            busyRef.current = false;
            setIsSaving(false);
        }
    }

    return (
        <section className="space-y-6">
            <div>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    Notifications
                </h1>

                <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
                    Choose what you’d like to hear from us. You can change
                    your personal email preferences here at any time.
                </p>
            </div>

            <Card className="rounded-2xl shadow-none">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FiMail
                            aria-hidden="true"
                            className="size-5 text-muted-foreground"
                        />
                        Email preferences
                    </CardTitle>

                    <CardDescription className="leading-7">
                        Optional emails will be sent to{" "}
                        <span className="break-all font-medium text-foreground">
                            {email || "your account email"}
                        </span>
                        .
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form
                        onSubmit={savePreferences}
                        className="space-y-6"
                        aria-busy={isSaving}
                    >
                        <div className="divide-y">
                            {preferences.map((preference) => {
                                const Icon = preference.icon;
                                const inputId = `notification-${preference.key}`;
                                const descriptionId = `${inputId}-description`;

                                return (
                                    <div
                                        key={preference.key}
                                        className="flex items-start justify-between gap-5 py-6 first:pt-0"
                                    >
                                        <div className="flex items-start gap-3">
                                            <span className="hidden size-10 shrink-0 items-center justify-center rounded-xl bg-muted sm:flex">
                                                <Icon
                                                    aria-hidden="true"
                                                    className="size-5 text-muted-foreground"
                                                />
                                            </span>

                                            <div>
                                                <Label
                                                    htmlFor={inputId}
                                                    className="cursor-pointer font-medium leading-6"
                                                >
                                                    {preference.title}
                                                </Label>

                                                <p
                                                    id={descriptionId}
                                                    className="mt-2 max-w-lg text-sm leading-7 text-muted-foreground"
                                                >
                                                    {preference.description}
                                                </p>
                                            </div>
                                        </div>

                                        <Switch
                                            id={inputId}
                                            checked={
                                                settings[preference.key]
                                            }
                                            onCheckedChange={(checked) =>
                                                updatePreference(
                                                    preference.key,
                                                    checked,
                                                )
                                            }
                                            aria-describedby={descriptionId}
                                            disabled={isSaving}
                                            className="mt-1 shrink-0"
                                        />
                                    </div>
                                );
                            })}
                        </div>

                        <div aria-live="polite" aria-atomic="true">
                            {feedback && (
                                <Alert
                                    variant={
                                        feedback.type === "error"
                                            ? "destructive"
                                            : "default"
                                    }
                                >
                                    <AlertTitle>
                                        {feedback.type === "error"
                                            ? "Preferences not saved"
                                            : "All saved"}
                                    </AlertTitle>

                                    <AlertDescription>
                                        {feedback.message}
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-6">
                            <p className="text-sm text-muted-foreground">
                                {hasChanges
                                    ? "You have unsaved changes."
                                    : "Your preferences are up to date."}
                            </p>

                            <Button
                                type="submit"
                                disabled={isSaving || !hasChanges}
                            >
                                {isSaving
                                    ? "Saving preferences…"
                                    : "Save preferences"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {followedBusinesses}

            <Card className="rounded-2xl bg-muted/30 shadow-none">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <FiShield
                            aria-hidden="true"
                            className="size-5 text-muted-foreground"
                        />
                        Essential account emails
                    </CardTitle>
                </CardHeader>

                <CardContent>
                    <Badge variant="secondary">
                        Always enabled
                    </Badge>

                    <p className="mt-4 text-sm leading-7 text-muted-foreground">
                        You’ll still receive necessary messages such as
                        password resets, email confirmations, and important
                        account or security notices. These are separate from
                        optional updates.
                    </p>
                </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-none">
                <CardHeader>
                    <CardTitle className="text-lg">
                        Business notifications
                    </CardTitle>

                    <CardDescription className="leading-7">
                        Daily business summaries and promotion availability
                        alerts are managed separately for each business.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <Button
                        render={<Link href="/business/dashboard" />}
                        nativeButton={false}
                        variant="outline"
                        size="sm"
                    >
                        Open business dashboard
                    </Button>
                </CardContent>
            </Card>
        </section>
    );
}