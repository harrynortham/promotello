import type { Metadata } from "next";
import Footer from "@/components/business-dashboard-footer"
import Header from "@/components/business-dashboard-nav"

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
        <Header />
        {children}
        <Footer />
    </div>
}