import { Suspense } from "react"

import Header from "@/components/marketing-nav"
import Footer from "@/components/footer"

export default function MarketingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <div className="flex flex-col min-h-dvh ">
        <Suspense fallback={<header className="sticky top-0 z-50 h-20 bg-background/95 backdrop-blur-md" />}>
            <Header />
        </Suspense>
        {children}
        <Footer />
    </div>
}