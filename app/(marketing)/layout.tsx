import Header from "@/components/marketing-nav"
import Footer from "@/components/footer"

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