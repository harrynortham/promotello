"use client";

import Link from "next/link";
import Script from "next/script";

import { Button } from "@/components/ui/button";
import { useConsent } from "@/components/use-consent";
import { gaMeasurementId, saveConsent } from "@/lib/consent";

// Loads Google Analytics only after the visitor accepts analytics cookies,
// and asks them once. GA4 tracks client-side page changes by itself.
export function Analytics() {
    const consent = useConsent();

    if (!gaMeasurementId || consent === undefined) {
        return null;
    }

    if (consent === "analytics") {
        return (
            <>
                <Script
                    src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
                    strategy="afterInteractive"
                />
                <Script id="google-analytics" strategy="afterInteractive">
                    {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaMeasurementId}');`}
                </Script>
            </>
        );
    }

    if (consent === "essential") {
        return null;
    }

    return (
        <div
            role="region"
            aria-label="Cookie choice"
            className="fixed inset-x-3 bottom-3 z-50 print:hidden mx-auto max-w-xl rounded-2xl border border-[#17233B]/10 bg-white p-5 text-[#17233B] shadow-lg sm:bottom-5"
        >
            <p className="text-sm leading-6">
                We&apos;d like to use Google Analytics cookies to see how people
                use Promotello so we can improve it. They&apos;re off unless you
                accept.{" "}
                <Link href="/legal/cookies" className="font-medium text-[#C8371D] underline underline-offset-4">
                    Cookie policy
                </Link>
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
                <Button type="button" variant="outline" onClick={() => saveConsent("essential")}>
                    Reject
                </Button>
                <Button type="button" variant="outline" onClick={() => saveConsent("analytics")}>
                    Accept
                </Button>
            </div>
        </div>
    );
}
