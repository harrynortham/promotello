import Header from "@/components/business-marketing-nav"
import Footer from "@/components/business-footer"

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