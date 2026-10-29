"use client";

import { EVENTS_ENABLED } from "@/lib/features";
import { SiteHeader, type HeaderLink } from "./site-header";

// One header component, configured per area of the site.

const customerLinks: HeaderLink[] = [
    { label: "Explore", href: "/explore" },
    { label: "Offers", href: "/offers" },
    { label: "Categories", href: "/categories" },
    { label: "Businesses", href: "/businesses" },
    ...(EVENTS_ENABLED ? [{ label: "Events", href: "/events" }] : []),
];

// The public header also leads to the business site, where the paid plans are.
const customerMarketingLinks: HeaderLink[] = [...customerLinks, { label: "For business", href: "/business" }];

const businessLinks: HeaderLink[] = [
    { label: "How it works", href: "/business/how-it-works" },
    { label: "Features", href: "/business/features" },
    { label: "Pricing", href: "/business/pricing" },
    { label: "Demo", href: "/business/demo" },
    { label: "Blog", href: "/blog" },
];

// Public customer pages: /, /offers, /explore and so on.
export function CustomerHeader() {
    return (
        <SiteHeader
            homeHref="/"
            links={customerMarketingLinks}
            collapseBelow="lg"
            signedOutActions={[
                { label: "Sign up", href: "/signup" },
                { label: "Log in", href: "/login", primary: true },
            ]}
        />
    );
}

// Business marketing pages under /business.
export function BusinessMarketingHeader() {
    return (
        <SiteHeader
            homeHref="/business"
            links={businessLinks}
            collapseBelow="lg"
            signedOutActions={[
                {
                    label: "Sign in",
                    mobileLabel: "Already registered? Sign in",
                    href: "/login?next=/business/dashboard",
                },
                { label: "Get started", href: "/business/register", primary: true },
            ]}
        />
    );
}

// Signed-in customer areas (/dashboard, /account): keep the browse links so
// customers can get straight back to offers.
export function CustomerAppHeader() {
    return (
        <SiteHeader
            homeHref="/"
            links={customerLinks}
            variant="app"
            signOutRedirect="/login"
            signedOutActions={[{ label: "Sign in", href: "/login", primary: true }]}
        />
    );
}

// The business dashboard, which has its own sidebar navigation.
export function BusinessAppHeader() {
    return (
        <SiteHeader
            homeHref="/business/dashboard"
            links={[]}
            variant="app"
            signOutRedirect="/login"
            signedOutActions={[
                { label: "Sign in", href: "/login?next=/business/dashboard", primary: true },
            ]}
        />
    );
}

// Platform admin, which has its own sidebar navigation.
export function AdminAppHeader() {
    return (
        <SiteHeader
            homeHref="/admin"
            links={[]}
            variant="app"
            signOutRedirect="/login"
            signedOutActions={[{ label: "Sign in", href: "/login", primary: true }]}
        />
    );
}
