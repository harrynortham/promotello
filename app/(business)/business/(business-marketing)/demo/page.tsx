import type { Metadata } from "next";
import { cacheLife } from "next/cache";

import type { BusinessAnalytics } from "@/components/business-period-summary";
import { qrSvg } from "@/lib/qr";
import { DemoDashboard } from "./demo-dashboard";

// A self-serve tour of the business dashboard with made-up data, for
// outreach emails. Nothing here touches the database.

export const metadata: Metadata = {
    title: "Demo",
    description:
        "Explore the Promotello business dashboard with sample data: loyalty cards, QR posters, offers, followers and monthly results.",
};

// A believable month for a small café, with quieter Mondays. Cached for a
// day so the dates stay current without rendering on every request.
async function sampleAnalytics(): Promise<BusinessAnalytics> {
    "use cache";
    cacheLife("days");

    const today = new Date();
    const daily = Array.from({ length: 30 }, (_, index) => {
        const date = new Date(today);
        date.setDate(today.getDate() - (29 - index));
        const weekday = date.getDay();
        const base = [70, 38, 46, 52, 58, 84, 96][weekday];
        const wobble = ((index * 37) % 17) - 8;
        const views = base + wobble + Math.round(index * 0.8);
        return {
            day: date.toISOString().slice(0, 10),
            views,
            claims: Math.round(views * 0.09),
            used: Math.round(views * 0.06),
        };
    });

    const viewTotal = daily.reduce((n, d) => n + d.views, 0);

    return {
        days: 30,
        totals: {
            profile_views: { current: Math.round(viewTotal * 0.6), previous: Math.round(viewTotal * 0.47) },
            offer_views: { current: Math.round(viewTotal * 0.4), previous: Math.round(viewTotal * 0.33) },
            claims: { current: daily.reduce((n, d) => n + d.claims, 0), previous: 121 },
            used: { current: daily.reduce((n, d) => n + d.used, 0), previous: 84 },
            qr_scans: { current: 403, previous: 288 },
            loyalty_stamps: { current: 612, previous: 455 },
            review_clicks: { current: 21, previous: 9 },
        },
        daily,
    };
}

export default async function DemoPage() {
    return (
        <DemoDashboard
            analytics={await sampleAnalytics()}
            posterQr={await qrSvg("https://www.promotello.com/business/demo")}
        />
    );
}
