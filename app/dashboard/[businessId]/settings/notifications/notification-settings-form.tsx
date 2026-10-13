"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
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
    }

    async function handleSave() {
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
                    low_inventory_threshold: settings.low_inventory_threshold,
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

        setSaved(true);
    }

    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-10 text-[#17233B] sm:py-16">
            <div className="mx-auto max-w-2xl">
                <Button
                    render={
                        <Link href={`/dashboard/${businessId}`} />
                    }
                    nativeButton={false}
                    variant="outline"
                    size="sm"
                >
                    ← Back to dashboard
                </Button>

                <p className="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                    Business settings
                </p>

                <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                    Notifications
                </h1>

                <p className="mt-3 text-[#17233B]/65">
                    Choose which notifications {businessName} receives.
                </p>

                <section className="mt-10 space-y-6 rounded-3xl bg-white p-6 shadow-sm sm:p-10">
                    <label className="flex items-start gap-4">
                        <input
                            type="checkbox"
                            checked={settings.daily_summary_enabled}
                            onChange={(event) =>
                                updateSetting(
                                    "daily_summary_enabled",
                                    event.target.checked,
                                )
                            }
                            className="mt-1 h-5 w-5 accent-[#FF593F]"
                        />

                        <span>
                            <span className="block font-semibold">
                                Daily redemption summary
                            </span>

                            <span className="mt-1 block text-sm leading-6 text-[#17233B]/60">
                                Receive one daily email summarising new and used redemptions.
                            </span>
                        </span>
                    </label>

                    <label className="flex items-start gap-4">
                        <input
                            type="checkbox"
                            checked={settings.offer_fully_claimed_enabled}
                            onChange={(event) =>
                                updateSetting(
                                    "offer_fully_claimed_enabled",
                                    event.target.checked,
                                )
                            }
                            className="mt-1 h-5 w-5 accent-[#FF593F]"
                        />

                        <span>
                            <span className="block font-semibold">
                                Fully claimed offer alerts
                            </span>

                            <span className="mt-1 block text-sm leading-6 text-[#17233B]/60">
                                Receive an email when a limited promotion has no redemptions
                                remaining.
                            </span>
                        </span>
                    </label>

                    <div>
                        <label className="flex items-start gap-4">
                            <input
                                type="checkbox"
                                checked={settings.low_inventory_enabled}
                                onChange={(event) =>
                                    updateSetting(
                                        "low_inventory_enabled",
                                        event.target.checked,
                                    )
                                }
                                className="mt-1 h-5 w-5 accent-[#FF593F]"
                            />

                            <span>
                                <span className="block font-semibold">
                                    Low inventory alerts
                                </span>

                                <span className="mt-1 block text-sm leading-6 text-[#17233B]/60">
                                    Receive an email when a limited promotion reaches the
                                    threshold below.
                                </span>
                            </span>
                        </label>

                        <label className="mt-4 block max-w-xs text-sm font-medium">
                            Alert threshold
                            <input
                                type="number"
                                min={1}
                                step={1}
                                value={settings.low_inventory_threshold}
                                onChange={(event) =>
                                    updateSetting(
                                        "low_inventory_threshold",
                                        Number(event.target.value),
                                    )
                                }
                                className="mt-2 w-full rounded-xl border border-[#17233B]/15 bg-white px-4 py-3 text-sm outline-none focus:border-[#FF593F] focus:ring-2 focus:ring-[#FF593F]/20"
                            />
                            <span className="mt-1 block text-xs text-[#17233B]/50">
                                Remaining redemptions
                            </span>
                        </label>
                    </div>

                    {errorMessage && (
                        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                            {errorMessage}
                        </p>
                    )}

                    {saved && (
                        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                            Notification settings saved successfully.
                        </p>
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
                </section>
            </div>
        </main>
    );
}