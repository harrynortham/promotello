"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FiWifi } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SSID_MAX, WIFI_PASSWORD_MAX, WIFI_SECURITIES } from "@/lib/wifi";
import { saveWifi } from "./actions";

// The guest network.
//
// Here rather than in settings because this is the only thing it is
// for: a poster with two codes on it. A business filling this in has
// already decided to print one.
//
// The password is shown rather than masked. It is about to be printed
// on a wall, and a field of dots is a field somebody cannot check
// before sending it to a printer.

export function WifiForm({
    businessId,
    ssid,
    security,
    password,
    hidden,
}: {
    businessId: string;
    ssid: string;
    security: string;
    password: string;
    hidden: boolean;
}) {
    const router = useRouter();
    const [busy, startBusy] = useTransition();
    const [problem, setProblem] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [kind, setKind] = useState(security || "WPA");

    return (
        <section
            aria-labelledby="wifi-heading"
            className="mt-8 rounded-2xl border border-[#17233B]/10 bg-white p-6"
        >
            <div className="flex items-start gap-3">
                <FiWifi aria-hidden="true" className="mt-1 size-5 shrink-0 text-[#FF593F]" />
                <div className="min-w-0">
                    <h2 id="wifi-heading" className="font-semibold">
                        Your guest Wi-Fi
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-[#17233B]/65">
                        Fill this in and you can print a poster with two codes on it: one joins
                        people to your Wi-Fi, one opens your offers. They scan the first because
                        they want it, and read the second while the page loads.
                    </p>
                </div>
            </div>

            {problem && (
                <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                    {problem}
                </p>
            )}

            <form
                action={(formData) => {
                    setProblem(null);
                    setSaved(false);
                    startBusy(async () => {
                        const result = await saveWifi(businessId, formData);
                        if (result.error) setProblem(result.error);
                        else {
                            setSaved(true);
                            router.refresh();
                        }
                    });
                }}
                className="mt-5 space-y-4"
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="ssid">Network name</Label>
                        <Input
                            id="ssid"
                            name="ssid"
                            defaultValue={ssid}
                            maxLength={SSID_MAX}
                            placeholder="Harbour Grind Guest"
                        />
                        <p className="text-xs leading-5 text-[#17233B]/55">
                            Exactly as it appears in the Wi-Fi list, capitals and all.
                        </p>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="security">How it is secured</Label>
                        <select
                            id="security"
                            name="security"
                            value={kind}
                            onChange={(event) => setKind(event.target.value)}
                            className="h-9 w-full rounded-md border border-[#17233B]/15 bg-white px-3 text-sm"
                        >
                            {WIFI_SECURITIES.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label} — {option.hint}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {kind !== "nopass" && (
                    <div className="space-y-1.5">
                        <Label htmlFor="password">Password</Label>
                        {/* Not masked: it is about to go on a wall, and a
                            field of dots cannot be checked before it is
                            printed. */}
                        <Input
                            id="password"
                            name="password"
                            defaultValue={password}
                            maxLength={WIFI_PASSWORD_MAX}
                            placeholder="flatwhite2026"
                        />
                        <p className="text-xs leading-5 text-[#17233B]/55">
                            Shown as you typed it, so you can check it before printing.
                        </p>
                    </div>
                )}

                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        name="hidden"
                        defaultChecked={hidden}
                        className="size-4 rounded border-[#17233B]/25"
                    />
                    This network does not show up in the list
                </label>

                <div className="flex items-center gap-3">
                    <Button type="submit" variant="outline" disabled={busy}>
                        {busy ? "Saving…" : "Save the network"}
                    </Button>
                    {saved && !busy && (
                        <p className="text-sm text-[#17233B]/60">
                            Saved. &ldquo;Wi-Fi and offers&rdquo; is now one of the layouts.
                        </p>
                    )}
                    <p className="text-xs text-[#17233B]/50">Clear both fields to remove it.</p>
                </div>
            </form>
        </section>
    );
}
