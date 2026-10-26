import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";

import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/utils/supabase/server";

import { VoucherCard } from "../redemption-list";
import { getStatus } from "../voucher-status";
import { getWallet } from "../wallet";

export const metadata: Metadata = {
    title: "Your voucher",
};

type PageProps = {
    params: Promise<{ id: string }>;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function BackLink() {
    return (
        <Link
            href="/dashboard/redemptions"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#17233B]/70 hover:text-[#17233B]"
        >
            <FiArrowLeft aria-hidden="true" />
            My vouchers
        </Link>
    );
}

function LoadingState() {
    return (
        <section role="status" aria-label="Loading your voucher" className="mx-auto max-w-xl space-y-6">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-[36rem] rounded-3xl" />
        </section>
    );
}

// One voucher on its own page: the code and QR to show at the till, with
// the offer's details.
async function VoucherContent({ params }: PageProps) {
    await connection();

    const { id } = await params;

    if (!UUID.test(id)) {
        notFound();
    }

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect(`/login?next=${encodeURIComponent(`/dashboard/redemptions/${id}`)}`);
    }

    const { vouchers } = await getWallet(user.id, id);
    const voucher = vouchers[0];

    if (!voucher) {
        notFound();
    }

    return (
        <section className="mx-auto max-w-xl space-y-6">
            <BackLink />
            <h1 className="sr-only">Your voucher</h1>
            <VoucherCard
                redemption={voucher}
                status={getStatus(voucher, new Date().toISOString().slice(0, 10))}
                standalone
            />
        </section>
    );
}

export default function VoucherPage(props: PageProps) {
    return (
        <Suspense fallback={<LoadingState />}>
            <VoucherContent {...props} />
        </Suspense>
    );
}
