"use client";

import Link from "next/link";
import { useState } from "react";

import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/utils/supabase/client";

type NotificationSettings = {
    daily_summary_enabled: boolean;
    offer_fully_claimed_enabled: boolean;
    low_inventory_enabled: boolean;
    low_inventory_threshold: number;
};

type NotificationSettingsFormProps = {
    businessId: string;
    businessName: string;
    initialSettings: NotificationSettings;
};

export default function NotificationSettingsForm({
    businessId,
    businessName,
    initialSettings,
}: NotificationSettingsFormProps) {
    const [settings, setSettings] =
        useState<NotificationSettings>(initialSettings);

    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    function updateSetting(
        field: keyof NotificationSettings,
        value: boolean | number,
    ) {
        setSettings((current) => ({
            ...current,
            [field]: value,
        }));

        setSaved(false);
    }

    async function handleSave() {
        const threshold = Number(settings.low_inventory_threshold);

        if (!Number.isInteger(threshold) || threshold < 1) {
            setErrorMessage(
                "The alert threshold must be a whole number greater than zero.",
            );
            return;
        }

        setIsSaving(true);
        setSaved(false);
        setErrorMessage("");

        const supabase = createClient();

        const { error } = await supabase
            .from("business_notification_settings")
            .upsert(
                {
                    business_id: businessId,
                    daily_summary_enabled: settings.daily_summary_enabled,
                    offer_fully_claimed_enabled:
                        settings.offer_fully_claimed_enabled,
                    low_inventory_enabled: settings.low_inventory_enabled,
                    low_inventory_threshold: threshold,
                    updated_at: new Date().toISOString(),
                },
                {
                    onConflict: "business_id",
                },
            );

        setIsSaving(false);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        setSettings((current) => ({
            ...current,
            low_inventory_threshold: threshold,
        }));

        setSaved(true);
    }

    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-10 text-[#17233B] sm:py-16">
            <div className="mx-auto max-w-2xl">
                <Button
                    render={<Link href="/business/dashboard" />}
                    nativeButton={false}
                    variant="outline"
                    size="sm"
                >
                    ← Back to dashboard
                </Button>

                <div className="mt-8">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C8371D]">
                        Business settings
                    </p>

                    <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                        Notifications
                    </h1>

                    <p className="mt-3 text-[#17233B]/65">
                        Choose which notifications {businessName} receives.
                    </p>
                </div>

                <Card className="mt-10 border-[#17233B]/10">
                    <CardHeader>
                        <CardTitle>Email notifications</CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-7">
                        <div className="flex items-start justify-between gap-6">
                            <div>
                                <Label htmlFor="daily-summary">
                                    Daily redemption summary
                                </Label>

                                <p className="mt-1 text-sm leading-6 text-[#17233B]/70">
                                    Receive one daily email summarising new and used
                                    redemptions.
                                </p>
                            </div>

                            <Switch
                                id="daily-summary"
                                checked={settings.daily_summary_enabled}
                                onCheckedChange={(checked) =>
                                    updateSetting("daily_summary_enabled", checked)
                                }
                            />
                        </div>

                        <Separator />

                        <div className="flex items-start justify-between gap-6">
                            <div>
                                <Label htmlFor="fully-claimed">
                                    Fully claimed offer alerts
                                </Label>

                                <p className="mt-1 text-sm leading-6 text-[#17233B]/70">
                                    Receive an email when a limited promotion has no
                                    redemptions remaining.
                                </p>
                            </div>

                            <Switch
                                id="fully-claimed"
                                checked={settings.offer_fully_claimed_enabled}
                                onCheckedChange={(checked) =>
                                    updateSetting(
                                        "offer_fully_claimed_enabled",
                                        checked,
                                    )
                                }
                            />
                        </div>

                        <Separator />

                        <div>
                            <div className="flex items-start justify-between gap-6">
                                <div>
                                    <Label htmlFor="low-inventory">
                                        Low inventory alerts
                                    </Label>

                                    <p className="mt-1 text-sm leading-6 text-[#17233B]/70">
                                        Receive an email when a limited promotion reaches
                                        the threshold below.
                                    </p>
                                </div>

                                <Switch
                                    id="low-inventory"
                                    checked={settings.low_inventory_enabled}
                                    onCheckedChange={(checked) =>
                                        updateSetting("low_inventory_enabled", checked)
                                    }
                                />
                            </div>

                            <div className="mt-5 max-w-xs space-y-2">
                                <Label htmlFor="threshold">
                                    Alert threshold
                                </Label>

                                <Input
                                    id="threshold"
                                    type="number"
                                    min={1}
                                    step={1}
                                    value={settings.low_inventory_threshold}
                                    disabled={!settings.low_inventory_enabled}
                                    onChange={(event) =>
                                        updateSetting(
                                            "low_inventory_threshold",
                                            Number(event.target.value),
                                        )
                                    }
                                />

                                <p className="text-xs text-[#17233B]/65">
                                    Remaining redemptions
                                </p>
                            </div>
                        </div>

                        {errorMessage && (
                            <Alert variant="destructive">
                                <AlertTitle>Unable to save settings</AlertTitle>

                                <AlertDescription>
                                    {errorMessage}
                                </AlertDescription>
                            </Alert>
                        )}

                        {saved && (
                            <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
                                <AlertTitle>Settings saved</AlertTitle>

                                <AlertDescription>
                                    Notification settings saved successfully.
                                </AlertDescription>
                            </Alert>
                        )}

                        <Button
                            type="button"
                            variant="default"
                            size="lg"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="w-full"
                        >
                            {isSaving ? "Saving settings…" : "Save settings"}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}