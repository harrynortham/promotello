import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { FiAlertTriangle } from "react-icons/fi";

import { SubmitButton } from "@/components/submit-button";
import { businessHasPro } from "@/lib/billing";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatSchedule, scheduleFrom } from "@/lib/schedule";
import { createClient } from "@/utils/supabase/server";
import { markVoucherUsed } from "./actions";
import { GiftVoucher, type StaffGift } from "./gift-voucher";
import { VoucherUsed } from "./voucher-used";

export const metadata: Metadata = {
    title: "Redeem a voucher",
    robots: { index: false, follow: false },
};

type PageProps = {
    params: Promise<{ code: string }>;
    searchParams: Promise<{ done?: string; error?: string }>;
};

type StaffVoucher = {
    redemption_id: string;
    redemption_code: string;
    business_id: string;
    business_name: string;
    offer_title: string;
    offer_discount: string;
    offer_expires_at: string;
    redeemed_at: string | null;
    used_at: string | null;
    customer_name: string | null;
    schedule_days: number[] | null;
    schedule_start: string | null;
    schedule_end: string | null;
    schedule_open: boolean;
};

function formatDateTime(value: string) {
    return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/London",
    }).format(new Date(value));
}

function isExpired(expiresAt: string) {
    return expiresAt < new Date().toISOString().slice(0, 10);
}

function Shell({ children }: { children: React.ReactNode }) {
    return (
        <main className="flex min-h-dvh items-start justify-center bg-[#FFF8F0] px-5 py-10 text-[#17233B] sm:items-center">
            <div className="w-full max-w-md">{children}</div>
        </main>
    );
}

async function RedeemContent({ params, searchParams }: PageProps) {
    await connection();

    const [{ code }, { done, error }] = await Promise.all([params, searchParams]);
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect(`/login?next=${encodeURIComponent(`/redeem/${code}`)}`);
    }

    // Only returns the voucher if the signed-in user works at its business.
    const { data } = await supabase.rpc("staff_get_redemption", { requested_code: code });
    const voucher = (Array.isArray(data) ? data[0] : null) as StaffVoucher | null;

    // Not an offer voucher? It may be a gift voucher from an automation.
    if (!voucher) {
        const { data: giftRows } = await supabase.rpc("staff_get_reward_voucher", { requested_code: code });
        const gift = (Array.isArray(giftRows) ? giftRows[0] : null) as StaffGift | null;

        if (gift) {
            return (
                <Shell>
                    <GiftVoucher gift={gift} done={Boolean(done)} error={Boolean(error)} now={new Date().toISOString()} />
                </Shell>
            );
        }
    }

    if (!voucher) {
        return (
            <Shell>
                <div className="rounded-3xl border border-[#17233B]/10 bg-white p-8 text-center">
                    <h1 className="text-2xl font-semibold">Voucher not found</h1>
                    <p className="mt-3 text-[#17233B]/65">
                        This voucher isn&apos;t for a business you work at, or the
                        code is wrong. Check you&apos;re signed in with your
                        business account.
                    </p>
                    <Button render={<Link href="/business/dashboard" />} nativeButton={false} variant="outline" className="mt-6">
                        Business dashboard
                    </Button>
                </div>
            </Shell>
        );
    }

    if (done && voucher.used_at) {
        // Two small questions worth answering while somebody is looking:
        // how the day is going, and whether a stamp card is the next
        // thing for them. Both only asked on the page that celebrates.
        const midnight = new Date();
        midnight.setHours(0, 0, 0, 0);

        const [{ count: usedToday }, hasPro] = await Promise.all([
            supabase
                .from("offer_redemptions")
                .select("id, offers!inner ( business_id )", { count: "exact", head: true })
                .eq("offers.business_id", voucher.business_id)
                .gte("used_at", midnight.toISOString()),
            businessHasPro(supabase, voucher.business_id).catch(() => true),
        ]);

        return (
            <Shell>
                <VoucherUsed
                    discount={voucher.offer_discount}
                    offerTitle={voucher.offer_title}
                    customerName={voucher.customer_name}
                    usedAt={voucher.used_at}
                    code={voucher.redemption_code}
                    usedToday={Math.max(usedToday ?? 1, 1)}
                    businessId={voucher.business_id}
                    showLoyaltyNudge={!hasPro}
                />
            </Shell>
        );
    }

    const expired = isExpired(voucher.offer_expires_at);
    const schedule = scheduleFrom(voucher.schedule_days, voucher.schedule_start, voucher.schedule_end);

    return (
        <Shell>
            <div className="overflow-hidden rounded-3xl border border-[#17233B]/10 bg-white shadow-sm">
                {/* What they are holding up, at the size it is read across
                    a counter: the discount first, because that is the
                    thing about to be given away. */}
                <div className="bg-[#FFF4E8] px-7 pb-6 pt-7 text-center">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                        {voucher.business_name} voucher
                    </p>

                    <p className="mt-3 text-4xl font-semibold leading-none tracking-tight text-[#17233B]">
                        {voucher.offer_discount}
                    </p>

                    <h1 className="mx-auto mt-3 max-w-xs text-base leading-6 text-[#17233B]/75">
                        {voucher.offer_title}
                    </h1>
                </div>

                <div className="p-7 pt-6">
                <dl className="grid grid-cols-2 gap-3 rounded-2xl bg-[#FFF8F0] p-4 text-sm">
                    <div>
                        <dt className="text-[#17233B]/70">Customer</dt>
                        <dd className="mt-0.5 font-semibold">{voucher.customer_name ?? "Customer"}</dd>
                    </div>
                    <div>
                        <dt className="text-[#17233B]/70">Code</dt>
                        <dd className="mt-0.5 font-mono font-semibold tracking-widest">{voucher.redemption_code}</dd>
                    </div>
                    {voucher.redeemed_at && (
                        <div>
                            <dt className="text-[#17233B]/70">Claimed</dt>
                            <dd className="mt-0.5 font-medium">{formatDateTime(voucher.redeemed_at)}</dd>
                        </div>
                    )}
                    <div>
                        <dt className="text-[#17233B]/70">Offer ends</dt>
                        <dd className={`mt-0.5 font-medium ${expired ? "text-red-700" : ""}`}>
                            {new Date(voucher.offer_expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </dd>
                    </div>
                </dl>

                {error && (
                    <Alert variant="destructive" className="mt-5">
                        <AlertTitle>Not done</AlertTitle>
                        <AlertDescription>That didn&apos;t work. Please try again.</AlertDescription>
                    </Alert>
                )}

                {voucher.used_at && !done ? (
                    <Alert variant="destructive" className="mt-5">
                        <FiAlertTriangle aria-hidden="true" />
                        <AlertTitle>Already used</AlertTitle>
                        <AlertDescription>
                            This voucher was used on {formatDateTime(voucher.used_at)}. Don&apos;t apply the discount again.
                        </AlertDescription>
                    </Alert>
                ) : !voucher.used_at ? (
                    <>
                        {expired && (
                            <Alert className="mt-5 border-amber-200 bg-amber-50 text-amber-900">
                                <AlertTitle>This offer has ended</AlertTitle>
                                <AlertDescription>
                                    You can still accept it if you choose to.
                                </AlertDescription>
                            </Alert>
                        )}

                        {schedule && !voucher.schedule_open ? (
                            <Alert className="mt-5 border-amber-200 bg-amber-50 text-amber-900">
                                <FiAlertTriangle aria-hidden="true" />
                                <AlertTitle>Not valid right now</AlertTitle>
                                <AlertDescription>
                                    This offer can only be used {formatSchedule(schedule)}. Ask the customer to come back then.
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <form action={markVoucherUsed} className="mt-6">
                                <input type="hidden" name="code" value={voucher.redemption_code} />
                                <input type="hidden" name="redemptionId" value={voucher.redemption_id} />
                                <SubmitButton pendingLabel="Marking as used…" className="h-14 w-full bg-[#FF593F] text-base font-semibold text-white hover:bg-[#FF593F]/90">
                                    Mark as used
                                </SubmitButton>
                            </form>
                        )}
                    </>
                ) : null}

                <Button
                    render={<Link href={`/business/${voucher.business_id}/redemptions`} />}
                    nativeButton={false}
                    variant="ghost"
                    className="mt-4 w-full"
                >
                    Back to redemptions
                </Button>
                </div>
            </div>
        </Shell>
    );
}

export default function RedeemPage(props: PageProps) {
    return (
        <Suspense fallback={<Shell><div className="h-96 animate-pulse rounded-3xl bg-white" /></Shell>}>
            <RedeemContent {...props} />
        </Suspense>
    );
}
