import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { FiAlertTriangle, FiCheckCircle } from "react-icons/fi";

import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";
import { markVoucherUsed } from "./actions";

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

    const expired = isExpired(voucher.offer_expires_at);

    return (
        <Shell>
            <div className="rounded-3xl border border-[#17233B]/10 bg-white p-7 shadow-sm">
                <p className="text-sm font-medium text-[#17233B]/55">{voucher.business_name} voucher</p>
                <h1 className="mt-1 text-2xl font-semibold leading-tight">{voucher.offer_title}</h1>
                <p className="mt-2 inline-flex rounded-full bg-[#FF593F] px-3 py-1 text-sm font-semibold text-white">
                    {voucher.offer_discount}
                </p>

                <dl className="mt-6 grid grid-cols-2 gap-3 rounded-2xl bg-[#FFF8F0] p-4 text-sm">
                    <div>
                        <dt className="text-[#17233B]/55">Customer</dt>
                        <dd className="mt-0.5 font-semibold">{voucher.customer_name ?? "Customer"}</dd>
                    </div>
                    <div>
                        <dt className="text-[#17233B]/55">Code</dt>
                        <dd className="mt-0.5 font-mono font-semibold tracking-widest">{voucher.redemption_code}</dd>
                    </div>
                    {voucher.redeemed_at && (
                        <div>
                            <dt className="text-[#17233B]/55">Claimed</dt>
                            <dd className="mt-0.5 font-medium">{formatDateTime(voucher.redeemed_at)}</dd>
                        </div>
                    )}
                    <div>
                        <dt className="text-[#17233B]/55">Offer ends</dt>
                        <dd className={`mt-0.5 font-medium ${expired ? "text-red-700" : ""}`}>
                            {new Date(voucher.offer_expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </dd>
                    </div>
                </dl>

                {done && voucher.used_at && (
                    <Alert className="mt-5 border-emerald-200 bg-emerald-50 text-emerald-900">
                        <FiCheckCircle aria-hidden="true" />
                        <AlertTitle>Voucher used</AlertTitle>
                        <AlertDescription>Apply the discount: {voucher.offer_discount}.</AlertDescription>
                    </Alert>
                )}

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

                        <form action={markVoucherUsed} className="mt-6">
                            <input type="hidden" name="code" value={voucher.redemption_code} />
                            <input type="hidden" name="redemptionId" value={voucher.redemption_id} />
                            <SubmitButton pendingLabel="Marking as used…" className="h-12 w-full bg-[#FF593F] text-base text-white hover:bg-[#FF593F]/90">
                                Mark as used
                            </SubmitButton>
                        </form>
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
