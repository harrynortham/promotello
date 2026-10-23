import type { Metadata } from "next";
import { AppFooter } from "@/components/site/footers"
import { BusinessAppHeader } from "@/components/site/headers"

// Signed-in area: keep it out of search results.
export const metadata: Metadata = {
    robots: { index: false, follow: false },
};

export default function MarketingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <div className="flex flex-col min-h-dvh ">
        <BusinessAppHeader />
        {children}
        <AppFooter variant="business" />
    </div>
}