import { MarketingFooter } from "@/components/site/footers"
import { BusinessMarketingHeader } from "@/components/site/headers"

export default function MarketingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <div className="flex flex-col min-h-dvh ">
        <BusinessMarketingHeader />
        {children}
        <MarketingFooter variant="business" />
    </div>
}