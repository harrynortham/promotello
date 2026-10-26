import { MarketingFooter } from "@/components/site/footers";
import { BusinessMarketingHeader } from "@/components/site/headers";

// The blog is for business owners, so it uses the business site's header
// (with "Get started") and footer.
export default function BlogLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-dvh flex-col bg-[#FFF8F0] text-[#17233B]">
            <BusinessMarketingHeader />
            {children}
            <MarketingFooter variant="business" />
        </div>
    );
}
