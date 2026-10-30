import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FiArrowRight, FiPlus } from "react-icons/fi";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/utils/supabase/server";

type Business = {
    id: string;
    name: string;
    logo_url: string | null;
    approval_status: string;
};

type BusinessSummary = Business & {
    liveOffers: number;
    redemptions: number;
};

// Only people with no business or several see this page; one business goes
// straight to its overview.
function Page({ children }: { children: React.ReactNode }) {
    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-12 text-[#17233B] sm:py-16">
            <div className="mx-auto max-w-2xl">{children}</div>
        </main>
    );
}

function LoadingState() {
    return (
        <Page>
            <Skeleton className="h-10 w-72" />
            <Skeleton className="mt-3 h-5 w-80 max-w-full" />
            <Skeleton className="mt-10 h-40 rounded-3xl" />
        </Page>
    );
}

const statuses: Record<string, { label: string; className: string; note?: string }> = {
    approved: { label: "Live", className: "bg-emerald-50 text-emerald-800" },
    pending: {
        label: "Waiting for approval",
        className: "bg-amber-50 text-amber-800",
        note: "You can finish setting up while our team checks it.",
    },
    rejected: {
        label: "Needs changes",
        className: "bg-red-50 text-red-800",
        note: "Update your details so we can approve it.",
    },
    suspended: { label: "Suspended", className: "bg-red-50 text-red-800" },
};

function BusinessCard({ business }: { business: BusinessSummary }) {
    const status = statuses[business.approval_status] ?? statuses.pending;
    const href = `/business/${business.id}`;

    return (
        <li className="group relative flex items-center gap-4 rounded-3xl border border-[#17233B]/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:gap-5 sm:p-6">
            {business.logo_url ? (
                <Image
                    src={business.logo_url}
                    alt=""
                    width={64}
                    height={64}
                    className="size-14 shrink-0 rounded-2xl border border-[#17233B]/10 object-cover sm:size-16"
                />
            ) : (
                <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#FFF4E8] text-2xl font-semibold text-[#FF593F] sm:size-16">
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
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
                        {status.label}
                    </span>
                </div>

                <p className="mt-1 text-sm text-[#17233B]/65">
                    {status.note ??
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

const welcomeSteps = [
    {
        title: "Add your business",
        description: "Your name, category and address. About two minutes.",
    },
    {
        title: "Create your first offer",
        description: "Free on every plan. A good offer gives people a reason to visit.",
    },
    {
        title: "Go live and bring people in",
        description: "Once approved, print a QR poster for your window and watch the visits.",
    },
];

function NewBusinessWelcome({ firstName }: { firstName: string | null }) {
    return (
        <Page>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {firstName ? `Welcome, ${firstName}` : "Welcome to Promotello"}
            </h1>
            <p className="mt-3 text-[#17233B]/65">
                Three steps to your first customers. Start free, no card needed.
            </p>

            <div className="mt-10 rounded-3xl border border-[#17233B]/10 bg-white p-6 shadow-sm sm:p-8">
                <ol className="space-y-5">
                    {welcomeSteps.map((step, index) => (
                        <li key={step.title} className="flex gap-4">
                            <span
                                className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${index === 0 ? "bg-[#FF593F] text-[#17233B]" : "bg-[#17233B]/5 text-[#17233B]/60"}`}
                            >
                                {index + 1}
                            </span>
                            <div>
                                <p className="font-semibold">{step.title}</p>
                                <p className="text-sm text-[#17233B]/65">{step.description}</p>
                            </div>
                        </li>
                    ))}
                </ol>

                <Button
                    render={<Link href="/onboarding" />}
                    nativeButton={false}
                    size="lg"
                    className="mt-8 w-full sm:w-auto"
                >
                    Add your business
                    <FiArrowRight aria-hidden="true" />
                </Button>
            </div>

            <p className="mt-6 text-center text-sm text-[#17233B]/65">
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
        .select("businesses ( id, name, logo_url, approval_status )")
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

    const businesses: Business[] =
        memberships
            ?.map((membership) =>
                Array.isArray(membership.businesses) ? membership.businesses[0] : membership.businesses,
            )
            .filter((business): business is Business => Boolean(business?.id && business?.name)) ?? [];

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
                render={<Link href="/onboarding" />}
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
