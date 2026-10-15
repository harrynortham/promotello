
import Footer from "@/components/business-footer"
import Header from "@/components/business-dashboard-nav"
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