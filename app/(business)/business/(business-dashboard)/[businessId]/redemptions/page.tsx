import { Suspense } from "react";
import Link from "next/link";
import { FiArrowLeft, FiArrowRight, FiCamera, FiPrinter, FiSearch } from "react-icons/fi";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";

import { ScanVoucherIllustration } from "@/components/scan-voucher-illustration";
import { RedemptionsHowItWorks } from "./how-it-works";
import { ScanQrButton } from "@/components/scan-qr-button";
import { createClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { JustUsed, Redemption, type RedemptionRow } from "./redemption-rows";

type Filter = "all" | "to-use" | "used" | "expired";

type PageProps = {
    params: Promise<{
        businessId: string;
    }>;
    searchParams: Promise<{ show?: string; code?: string; page?: string; used?: string; offer?: string }>;
};

// Ten at a time: a till is not a place to scroll.
const PER_PAGE = 10;

const filters: { id: Filter; label: string }[] = [
    { id: "to-use", label: "To use" },
    { id: "used", label: "Used" },
    { id: "expired", label: "Offer ended" },
    { id: "all", label: "All" },
];

function isFilter(value: string | undefined): value is Filter {
    return filters.some((filter) => filter.id === value);
}

function today() {
    return new Date().toISOString().slice(0, 10);
}

type OfferRow = {
    id: string;
    title: string;
    discount: string;
    description: string | null;
    terms: string | null;
    expires_at: string;
    business_id: string;
};

type Row = {
    id: string;
    redemption_code: string;
    redeemed_at: string;
    used_at: string | null;
    offers: OfferRow | OfferRow[] | null;
};

async function markRedemptionUsed(formData: FormData) {
    "use server";

    const redemptionId = formData.get("redemptionId");
    const businessId = formData.get("businessId");

    if (
        typeof redemptionId !== "string" ||
        typeof businessId !== "string" ||
        !redemptionId ||
        !businessId
    ) {
        return;
    }

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { error } = await supabase.rpc("mark_redemption_used", {
        requested_redemption_id: redemptionId,
    });

    if (error) {
        throw new Error(error.message);
    }

    // Back to the list, which says what just happened at the top of it.
    const code = String(formData.get("code") ?? "");

    redirect(`/business/${businessId}/redemptions?used=${encodeURIComponent(code)}`);
}

function LoadingState() {
    return (
        <div>
            <div>
                <div className="flex items-end justify-between">
                    <div>
                        <Skeleton className="h-5 w-40 rounded-lg" />
                        <Skeleton className="mt-3 h-10 w-72 rounded-lg" />
                        <Skeleton className="mt-3 h-5 w-96 max-w-full rounded-lg" />
                    </div>

                    <Skeleton className="hidden h-9 w-40 rounded-lg sm:block" />
                </div>

                <div className="mt-10 space-y-4">
                    {[1, 2, 3].map((item) => (
                        <div
                            key={item}
                            className="rounded-xl border border-[#17233B]/10 bg-white p-6"
                        >
                            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                                <div className="space-y-3">
                                    <Skeleton className="h-7 w-56 rounded-lg" />
                                    <Skeleton className="h-4 w-24 rounded-full" />
                                    <Skeleton className="h-4 w-40 rounded-lg" />
                                    <Skeleton className="h-4 w-32 rounded-lg" />
                                </div>

                                <Skeleton className="h-24 w-48 rounded-xl" />
                            </div>

                            <Skeleton className="mt-6 h-9 w-32 rounded-lg" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
async function RedemptionsContent({ params, searchParams }: PageProps) {
    await connection();

    const [{ businessId }, query] = await Promise.all([params, searchParams]);
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: business, error: businessError } = await supabase
        .from("businesses")
        .select("id, name")
        .eq("id", businessId)
        .maybeSingle();

    if (businessError || !business) {
        notFound();
    }

    // One offer's vouchers, arrived at from the offers page. Everything
    // else on this page — tabs, counts, pages — narrows with it.
    const offerId = /^[0-9a-f-]{36}$/i.test(query.offer ?? "") ? query.offer! : null;

    const show: Filter = isFilter(query.show) ? query.show : "to-use";
    const code = (query.code ?? "").trim().toUpperCase().slice(0, 16);
    const page = Math.max(Number.parseInt(query.page ?? "1", 10) || 1, 1);
    const from = (page - 1) * PER_PAGE;

    const columns = `
        id,
        redemption_code,
        redeemed_at,
        used_at,
        offers!inner (
          id,
          title,
          discount,
          description,
          terms,
          expires_at,
          business_id
        )
    `;

    // Which of them, in each of the three states a voucher can be in. A
    // searched code ignores the tabs: somebody holding a code wants that
    // voucher, wherever it has got to.
    function forFilter(filter: Filter, select: string, options?: { head?: boolean }) {
        let rows = supabase
            .from("offer_redemptions")
            .select(select, options?.head ? { count: "exact", head: true } : undefined)
            .eq("offers.business_id", businessId);

        if (offerId) {
            rows = rows.eq("offer_id", offerId);
        }

        if (filter === "to-use") {
            rows = rows.is("used_at", null).gte("offers.expires_at", today());
        } else if (filter === "used") {
            rows = rows.not("used_at", "is", null);
        } else if (filter === "expired") {
            rows = rows.is("used_at", null).lt("offers.expires_at", today());
        }

        return rows;
    }

    const [listed, counts, justUsed] = await Promise.all([
        code
            ? supabase
                .from("offer_redemptions")
                .select(columns)
                .eq("offers.business_id", businessId)
                .eq("redemption_code", code)
                .order("redeemed_at", { ascending: false })
            : forFilter(show, columns)
                .order("redeemed_at", { ascending: false })
                .range(from, from + PER_PAGE - 1),

        Promise.all(
            filters.map(async (filter) => ({
                id: filter.id,
                // The join has to be in the select for a filter on it to
                // mean anything, even when only the count is wanted.
                count: (await forFilter(filter.id, "id, offers!inner ( business_id, expires_at )", { head: true }))
                    .count ?? 0,
            })),
        ),

        // What was just marked used, for the line at the top. It may not
        // be on this page of the list, so it is asked for by name.
        query.used
            ? supabase
                .from("offer_redemptions")
                .select("redemption_code, offers!inner ( discount, business_id )")
                .eq("offers.business_id", businessId)
                .eq("redemption_code", String(query.used).toUpperCase())
                .maybeSingle()
            : Promise.resolve({ data: null }),
    ]);

    if (listed.error) {
        throw new Error("Unable to load redemptions.");
    }

    const { data: chosenOffer } = offerId
        ? await supabase
            .from("offers")
            .select("id, title")
            .eq("id", offerId)
            .eq("business_id", businessId)
            .maybeSingle()
        : { data: null };

    const rows: RedemptionRow[] = ((listed.data ?? []) as unknown as Row[]).map((row) => {
        const offer = Array.isArray(row.offers) ? row.offers[0] : row.offers;

        return {
            id: row.id,
            code: row.redemption_code,
            claimedAt: row.redeemed_at,
            usedAt: row.used_at,
            expired: Boolean(offer && offer.expires_at < today()),
            offer: offer
                ? {
                    title: offer.title,
                    discount: offer.discount,
                    description: offer.description,
                    terms: offer.terms,
                    expiresAt: offer.expires_at,
                }
                : null,
        };
    });

    // Who claimed each of them. Names live in auth.users, which a
    // business can't read, so they come back from a function that checks
    // the business owns these vouchers — a first name, as everywhere else
    // a business sees a customer.
    const { data: customers } = rows.length
        ? await supabase.rpc("staff_redemption_customers", {
            requested_business_id: businessId,
            requested_ids: rows.map((row) => row.id),
        })
        : { data: null };

    const nameFor = new Map(
        ((customers ?? []) as { redemption_id: string; customer_name: string | null }[]).map((row) => [
            row.redemption_id,
            row.customer_name,
        ]),
    );

    const withCustomers = rows.map((row) => ({ ...row, customerName: nameFor.get(row.id) ?? null }));

    const countFor = (id: Filter) => counts.find((count) => count.id === id)?.count ?? 0;
    const total = countFor(show);
    const pages = Math.max(Math.ceil(total / PER_PAGE), 1);
    const usedRow = (justUsed as { data: { redemption_code: string; offers: { discount: string } | { discount: string }[] } | null }).data;
    const usedOffer = usedRow ? (Array.isArray(usedRow.offers) ? usedRow.offers[0] : usedRow.offers) : null;

    const linkTo = (next: { show?: Filter; page?: number; offer?: string | null }) => {
        const params = new URLSearchParams();
        if (next.show && next.show !== "to-use") params.set("show", next.show);
        if (next.page && next.page > 1) params.set("page", String(next.page));
        const keepOffer = next.offer === undefined ? offerId : next.offer;
        if (keepOffer) params.set("offer", keepOffer);
        const search = params.toString();

        return `/business/${businessId}/redemptions${search ? `?${search}` : ""}`;
    };

    return (
        <div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                        {business.name}
                    </p>

                    <h1 className="mt-3 text-4xl font-semibold tracking-tight">Redemptions</h1>

                    <p className="mt-3 max-w-2xl text-[#17233B]/65">
                        Every voucher your customers are holding, and the one in front of
                        you right now. Search the code they read out, mark it used in a
                        tap, and nobody can use it twice.
                    </p>
                </div>

                {/* Stacked on a phone, the guide under "How it works";
                    side by side on anything wider, with the guide to its
                    left — which is what the reversed row is for. */}
                <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row-reverse sm:items-center sm:gap-3">
                    <RedemptionsHowItWorks />

                    {/* For whoever is on the counter rather than on this
                        page: one sheet, printed once, stuck up. */}
                    <Button
                        render={<Link href={`/staff-guide/${businessId}`} />}
                        nativeButton={false}
                        variant="ghost"
                        size="lg"
                    >
                        <FiPrinter aria-hidden="true" />
                        Print the till guide
                    </Button>
                </div>
            </div>

            {usedRow && <JustUsed code={usedRow.redemption_code} discount={usedOffer?.discount ?? null} />}

            {chosenOffer && (
                <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#17233B]/10 bg-white px-4 py-3">
                    <p className="text-sm">
                        <span className="text-[#17233B]/60">Vouchers for</span>{" "}
                        <span className="font-semibold">{chosenOffer.title}</span>
                    </p>

                    <Button
                        render={<Link href={linkTo({ show, offer: null })} />}
                        nativeButton={false}
                        variant="ghost"
                        size="sm"
                    >
                        All offers
                    </Button>
                </div>
            )}

            <div className="mt-8 grid gap-6 rounded-xl border border-[#17233B]/10 bg-white p-6 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center sm:gap-8 sm:p-8">
                <ScanVoucherIllustration className="mx-auto w-36 sm:w-40" />

                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                        Quickest at the till
                    </p>

                    <h2 className="mt-2 text-xl font-semibold text-[#17233B]">
                        Scan the customer&apos;s voucher
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-[#17233B]/70">
                        Point your phone camera at the QR code on their voucher. It opens the
                        voucher here, so you can mark it used in one tap.
                    </p>

                    <ScanQrButton
                        kind="redeem"
                        label="Scan a voucher"
                        title="Scan the customer's voucher"
                        description="Point the camera at the QR code on their voucher. It opens the voucher here, so you can mark it used in one tap."
                        className="mt-4 w-full sm:w-auto"
                    />

                    <p className="mt-4 flex items-start gap-2 text-sm leading-6 text-[#17233B]/55">
                        <FiCamera aria-hidden="true" className="mt-1 size-4 shrink-0 text-[#FF593F]" />
                        No camera to hand? Type the code below, or find the offer in the list.
                    </p>
                </div>
            </div>

            {/* A code read off a phone or a printout, which is the other
                half of "no camera to hand". */}
            <form method="get" className="mt-8 flex flex-wrap items-end gap-3">
                <div className="min-w-0 flex-1">
                    <label htmlFor="code" className="text-sm font-medium">
                        Find a code
                    </label>
                    <Input
                        id="code"
                        name="code"
                        defaultValue={code}
                        placeholder="e.g. 5280613F90"
                        autoComplete="off"
                        spellCheck={false}
                        className="mt-1.5 font-mono tracking-[0.12em] uppercase"
                    />
                </div>

                <Button type="submit" size="lg">
                    <FiSearch aria-hidden="true" />
                    Find
                </Button>

                {code && (
                    <Button render={<Link href={linkTo({ show })} />} nativeButton={false} variant="ghost" size="lg">
                        Clear
                    </Button>
                )}
            </form>

            {code ? (
                <p className="mt-6 text-sm text-[#17233B]/65">
                    {rows.length === 0
                        ? `No voucher of yours has the code ${code}. Check the code with the customer.`
                        : `One voucher with the code ${code}.`}
                </p>
            ) : (
                <nav aria-label="Which vouchers" className="mt-8 flex flex-wrap gap-2">
                    {filters.map((filter) => (
                        <Button
                            key={filter.id}
                            render={<Link href={linkTo({ show: filter.id })} />}
                            nativeButton={false}
                            variant={show === filter.id ? "default" : "outline"}
                            size="sm"
                        >
                            {filter.label}
                            <span className={show === filter.id ? "text-white/70" : "text-[#17233B]/50"}>
                                {countFor(filter.id)}
                            </span>
                        </Button>
                    ))}
                </nav>
            )}

            {rows.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-[#17233B]/20 bg-white px-6 py-14 text-center">
                    <h2 className="text-xl font-semibold">
                        {code ? "Nothing with that code" : "Nothing here"}
                    </h2>
                    <p className="mx-auto mt-2 max-w-md text-[#17233B]/65">
                        {code
                            ? "Codes are ten characters. Check it with the customer, or scan their voucher instead."
                            : "Vouchers appear here when customers claim your offers."}
                    </p>
                </div>
            ) : (
                <ul className="mt-6 space-y-3">
                    {withCustomers.map((row) => (
                        <Redemption
                            key={row.id}
                            redemption={row}
                            businessId={businessId}
                            markUsed={markRedemptionUsed}
                        />
                    ))}
                </ul>
            )}

            {!code && pages > 1 && (
                <nav
                    aria-label="More vouchers"
                    className="mt-6 flex items-center justify-between gap-4 text-sm"
                >
                    <Button
                        render={<Link href={linkTo({ show, page: page - 1 })} />}
                        nativeButton={false}
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                    >
                        <FiArrowLeft aria-hidden="true" />
                        Newer
                    </Button>

                    <p className="text-[#17233B]/65">
                        Page {Math.min(page, pages)} of {pages}
                    </p>

                    <Button
                        render={<Link href={linkTo({ show, page: page + 1 })} />}
                        nativeButton={false}
                        variant="outline"
                        size="sm"
                        disabled={page >= pages}
                    >
                        Older
                        <FiArrowRight aria-hidden="true" />
                    </Button>
                </nav>
            )}
        </div>
    );
}

export default function BusinessRedemptionsPage(props: PageProps) {
    return (
        <Suspense fallback={<LoadingState />}>
            <RedemptionsContent {...props} />
        </Suspense>
    );
}