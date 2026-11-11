import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
    FiArrowRight,
    FiAward,
    FiCheck,
    FiPlus,
    FiPrinter,
    FiShoppingBag,
    FiTag,
} from "react-icons/fi";
import type { IconType } from "react-icons";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BusinessStatusBadge } from "@/components/business-status-badge";
import { cn } from "@/lib/utils";
import { unclaimedPreview } from "@/lib/previews";
import { storedImage } from "@/lib/images";
import { createClient } from "@/utils/supabase/server";

type Business = {
    id: string;
    name: string;
    logo_url: string | null;
    approval_status: string;
    closed_at: string | null;
    business_previews: { claimed_at: string | null }[];
};

type BusinessSummary = Business & {
    liveOffers: number;
    redemptions: number;
};

// Only people with no business or several see this page; one business goes
// straight to its overview.
function Page({ children }: { children: React.ReactNode }) {
    return (
        <main className="bg-[#FFF8F0] px-6 py-12 text-[#17233B] sm:py-16">
            <div className="mx-auto max-w-2xl">{children}</div>
        </main>
    );
}

// The same coral tile the account menu and the checklist use, so an icon
// on this page belongs to the same product as the ones behind it.
function IconTile({ icon: Icon, className }: { icon: IconType; className?: string }) {
    return (
        <span
            aria-hidden="true"
            // cn, not a template string: the first step's tile swaps both
            // of these colours, and which one wins can't be left to the
            // order the classes happen to land in the stylesheet.
            className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#FFF4E8] text-[#FF593F]",
                className,
            )}
        >
            <Icon className="size-5" />
        </span>
    );
}

function LoadingState() {
    return (
        <Page>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-4 h-10 w-72" />
            <Skeleton className="mt-4 h-5 w-full max-w-xl" />
            <Skeleton className="mt-10 h-72 rounded-xl" />
        </Page>
    );
}

// What to say under the name while a business isn't live yet. The badge
// beside it carries the status itself.
const statuses: Record<string, { note?: string }> = {
    approved: {},
    pending: { note: "You can finish setting up while our team checks it." },
    rejected: { note: "Update your details so we can approve it." },
    suspended: {},
};

function BusinessCard({ business }: { business: BusinessSummary }) {
    const status = statuses[business.approval_status] ?? statuses.pending;
    const href = `/business/${business.id}`;

    return (
        <li className="group relative flex items-center gap-4 rounded-xl border border-[#17233B]/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:gap-5 sm:p-6">
            {storedImage(business.logo_url) ? (
                <Image
                    src={storedImage(business.logo_url)!}
                    alt=""
                    width={64}
                    height={64}
                    className="size-14 shrink-0 rounded-xl border border-[#17233B]/10 object-cover sm:size-16"
                />
            ) : (
                <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-[#FFF4E8] text-2xl font-semibold text-[#FF593F] sm:size-16">
                    {business.name.charAt(0).toUpperCase()}
                </span>
            )}

            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-lg font-semibold sm:text-xl">
                        {/* The whole card opens the business. */}
                        <Link href={href} className="after:absolute after:inset-0 focus-visible:outline-none">
                            {business.name}
                        </Link>
                    </h2>
                    {business.closed_at ? (
                        <Badge variant="outline" className="border-[#FF593F]/40 bg-[#FF593F]/5 text-[#FF593F]">
                            Closed
                        </Badge>
                    ) : (
                        /* The same badge as the sidebar: pending wears a clock. */
                        <BusinessStatusBadge status={business.approval_status} />
                    )}
                </div>

                <p className="mt-1 text-sm text-[#17233B]/65">
                    {business.closed_at
                        ? "Off the directory. Open it to reopen it."
                        : status.note ??
                            `${business.liveOffers} live ${business.liveOffers === 1 ? "offer" : "offers"} · ${business.redemptions} redeemed`}
                </p>
            </div>

            <span className="hidden shrink-0 items-center gap-1.5 text-sm font-medium text-[#17233B]/70 transition group-hover:text-[#17233B] sm:inline-flex">
                Open
                <FiArrowRight aria-hidden="true" className="transition group-hover:translate-x-0.5" />
            </span>
        </li>
    );
}

// The same four the checklist works down once a business exists, in the
// same order, so the first screen and the second agree about what
// setting up means.
const welcomeSteps = [
    {
        icon: FiShoppingBag,
        title: "Your profile page",
        description:
            "Your name, where to find you, your hours and a photo. This is the page a customer lands on.",
        time: "About five minutes",
    },
    {
        icon: FiTag,
        title: "Your first offer",
        description:
            "Something small is plenty: a discount, a free side, a second coffee. It is the reason somebody walks in today.",
        time: "Free on every plan",
    },
    {
        icon: FiPrinter,
        title: "A QR poster for your window",
        description:
            "Every scan opens your offers, and you can see which spot is earning its place.",
        time: "A4 or A5, from your own printer",
    },
    {
        icon: FiAward,
        title: "Your loyalty card",
        description:
            "Digital stamps that live in a phone rather than the bottom of a bag, so the next one is worth walking past somewhere else for.",
        time: "On Pro, free for 30 days",
    },
];

const reassurances = [
    "Free to start, no card needed",
    "Nothing is public until we've checked your page, usually the same day",
    "Add your team, your other locations and more offers whenever you like",
];

function NewBusinessWelcome({ firstName }: { firstName: string | null }) {
    return (
        <Page>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                Getting started
            </p>

            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
                Promotello for Business
            </h1>

            <p className="mt-4 text-lg leading-8 text-[#17233B]/70">
                {firstName ? `Welcome, ${firstName}. The` : "The"} customers Promotello
                works on first are the ones already walking past your door. Give them a
                reason to come in, and a reason to come back.
            </p>

            <div className="mt-10 rounded-xl border border-[#17233B]/10 bg-white p-6 shadow-sm sm:p-8">
                <h2 className="text-xl font-semibold">Four steps to your first regulars</h2>
                <p className="mt-2 text-sm leading-6 text-[#17233B]/65">
                    Start at the top. Nothing here is permanent, and nothing is public
                    until you say so.
                </p>

                <ol className="mt-7 space-y-6">
                    {welcomeSteps.map((step, index) => (
                        <li key={step.title} className="flex gap-4">
                            <div className="relative shrink-0">
                                <IconTile
                                    icon={step.icon}
                                    className={index === 0 ? "bg-[#FF593F] text-white" : ""}
                                />

                                {/* A line down the margin, through the gap
                                    below, so the four read as one run
                                    rather than four cards. */}
                                {index < welcomeSteps.length - 1 && (
                                    <span
                                        aria-hidden="true"
                                        className="absolute -bottom-6 left-1/2 top-13 w-px -translate-x-1/2 bg-[#17233B]/10"
                                    />
                                )}
                            </div>

                            <div className="pb-1">
                                <p className="font-semibold">
                                    <span className="text-[#17233B]/40">{index + 1}.</span>{" "}
                                    {step.title}
                                </p>
                                <p className="mt-1 text-sm leading-6 text-[#17233B]/70">
                                    {step.description}
                                </p>
                                <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-[#17233B]/50">
                                    {step.time}
                                </p>
                            </div>
                        </li>
                    ))}
                </ol>

                <Button
                    render={<Link href="/business/setup/new" />}
                    nativeButton={false}
                    size="lg"
                    className="mt-8 w-full sm:w-auto"
                >
                    Add your business
                    <FiArrowRight aria-hidden="true" />
                </Button>

                <ul className="mt-7 space-y-2.5 border-t border-[#17233B]/10 pt-6">
                    {reassurances.map((line) => (
                        <li key={line} className="flex gap-2.5 text-sm leading-6 text-[#17233B]/70">
                            <FiCheck aria-hidden="true" className="mt-1 shrink-0 text-[#FF593F]" />
                            {line}
                        </li>
                    ))}
                </ul>
            </div>

            <p className="mt-8 text-center text-sm text-[#17233B]/65">
                Been invited to join a team? Open the link in your invitation email.
            </p>
        </Page>
    );
}

async function BusinessDashboardContent() {
    await connection();

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: memberships, error } = await supabase
        .from("business_members")
        .select("businesses ( id, name, logo_url, approval_status, closed_at, business_previews ( claimed_at ) )")
        .eq("user_id", user.id);

    if (error) {
        return (
            <Page>
                <Alert variant="destructive">
                    <AlertTitle>Unable to load your businesses</AlertTitle>
                    <AlertDescription>Please refresh the page and try again.</AlertDescription>
                </Alert>
            </Page>
        );
    }

    // A preview nobody has claimed belongs to whoever built it only in the
    // sense that someone has to own the row. It is managed in /admin/previews,
    // and listing it here would bury the businesses they actually run.
    const businesses: Business[] =
        memberships
            ?.map((membership) =>
                Array.isArray(membership.businesses) ? membership.businesses[0] : membership.businesses,
            )
            .filter((business): business is Business => Boolean(business?.id && business?.name))
            .filter((business) => !unclaimedPreview(business)) ?? [];

    const fullName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";
    const firstName = fullName.split(" ")[0] || null;

    // First visit: one clear next step instead of an empty dashboard.
    if (businesses.length === 0) {
        return <NewBusinessWelcome firstName={firstName} />;
    }

    // Most people have one business: its overview is their dashboard. Adding
    // another is in the business switcher.
    if (businesses.length === 1) {
        redirect(`/business/${businesses[0].id}`);
    }

    const today = new Date().toISOString().slice(0, 10);

    const summaries: BusinessSummary[] = await Promise.all(
        businesses.map(async (business) => {
            const [{ count: liveOffers }, { count: redemptions }] = await Promise.all([
                supabase
                    .from("offers")
                    .select("id", { count: "exact", head: true })
                    .eq("business_id", business.id)
                    .eq("approval_status", "approved")
                    .gte("expires_at", today),
                supabase
                    .from("offer_redemptions")
                    .select("id, offers!inner ( business_id )", { count: "exact", head: true })
                    .eq("offers.business_id", business.id),
            ]);

            return { ...business, liveOffers: liveOffers ?? 0, redemptions: redemptions ?? 0 };
        }),
    );

    return (
        <Page>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {firstName ? `Good to see you, ${firstName}` : "Good to see you"}
            </h1>
            <p className="mt-3 text-[#17233B]/65">
                Choose a business to manage.
            </p>

            <ul className="mt-10 space-y-4">
                {summaries.map((business) => (
                    <BusinessCard key={business.id} business={business} />
                ))}
            </ul>

            <Button
                size="lg"
                render={<Link href="/business/setup/new" />}
                nativeButton={false}
                variant="ghost"
                className="mt-6 text-[#17233B]/70 hover:text-[#17233B]"
            >
                <FiPlus aria-hidden="true" />
                Add another business
            </Button>
        </Page>
    );
}

export default function BusinessDashboardPage() {
    return (
        <Suspense fallback={<LoadingState />}>
            <BusinessDashboardContent />
        </Suspense>
    );
}
