"use client";

import { Button } from "@/components/ui/button";
import { useConsentRecord } from "@/components/use-consent";
import { gaMeasurementId, saveConsent } from "@/lib/consent";

// Lets visitors change their analytics cookie choice at any time.
export function CookieSettings() {
    const record = useConsentRecord();
    const consent = record?.choice ?? null;

    if (!gaMeasurementId) {
        return <p>Analytics cookies aren&apos;t used on this version of the site.</p>;
    }

    if (record === undefined) {
        return null;
    }

    return (
        <div className="rounded-xl border bg-white p-5 text-foreground">
            <p className="text-sm">
                Analytics cookies are currently{" "}
                <strong>{consent === "analytics" ? "on" : "off"}</strong>
                {record?.decidedOn
                    ? `, which is what you chose on ${new Date(record.decidedOn).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.`
                    : "."}
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={consent === "analytics"}
                    onClick={() => saveConsent("analytics")}
                >
                    Allow analytics cookies
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={consent === "essential"}
                    onClick={() => saveConsent("essential")}
                >
                    Turn off analytics cookies
                </Button>
            </div>
        </div>
    );
}
