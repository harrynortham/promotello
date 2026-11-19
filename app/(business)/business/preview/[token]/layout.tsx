import { MarketingFooter } from "@/components/site/footers";

// A preview sits outside the business marketing group on purpose.
//
// That group's layout puts the marketing header on every page under it —
// nav, menu, sign-in, avatar — and a preview wants none of them: it is a
// letter to one business, and every link is a way off the page before
// they have decided. The page renders its own header instead
// (components/site/preview-header.tsx), which is also the only place
// that knows whether there is anything left to claim.
//
// It was done with usePathname() in the shared header first, which broke
// the build: the hook is URL data, and reading it outside <Suspense>
// stops this route prerendering (CLIENT_HOOK_DYNAMIC). A layout of its
// own needs no hook and no boundary.
//
// The footer stays. Somebody who has decided not to claim still deserves
// the way to the privacy policy.
export default function PreviewLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-dvh flex-col">
            {children}
            <MarketingFooter variant="business" />
        </div>
    );
}
