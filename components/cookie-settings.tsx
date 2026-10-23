"use client";

import { Button } from "@/components/ui/button";
import { useConsent } from "@/components/use-consent";
import { gaMeasurementId, saveConsent } from "@/lib/consent";

// Lets visitors change their analytics cookie choice at any time.
export function CookieSettings() {
    const consent = useConsent();

    if (!gaMeasurementId) {
        return <p>Analytics cookies aren&apos;t used on this version of the site.</p>;
    }

    if (consent === undefined) {
        return null;
    }

    return (
        <div className="rounded-xl border bg-white p-5 text-foreground">
            <p className="text-sm">
                Analytics cookies are currently{" "}
                <strong>{consent === "analytics" ? "on" : "off"}</strong>.
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
