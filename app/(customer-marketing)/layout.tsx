import { Suspense } from "react"

import { MarketingFooter } from "@/components/site/footers"
import { CustomerHeader } from "@/components/site/headers"

export default function MarketingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <div className="flex flex-col min-h-dvh ">
        <Suspense fallback={<header className="sticky top-0 z-50 h-20 bg-background/95 backdrop-blur-md" />}>
            <CustomerHeader />
        </Suspense>
        {children}
        <MarketingFooter variant="customer" />
    </div>
}