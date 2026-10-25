import Link from "next/link";
import { FiAlertTriangle, FiCheckCircle } from "react-icons/fi";

import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { markGiftUsed } from "./actions";

export type StaffGift = {
    voucher_id: string;
    code: string;
    business_id: string;
    business_name: string;
    kind: "welcome" | "birthday" | "winback";
    reward: string;
    created_at: string;
    expires_at: string;
    used_at: string | null;
    customer_name: string | null;
};

const kindLabels = {
    welcome: "Welcome gift",
    birthday: "Birthday treat",
    winback: "Come-back gift",
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

// Staff view of a gift voucher from an automation, opened by scanning it.
export function GiftVoucher({ gift, done, error, now }: { gift: StaffGift; done: boolean; error: boolean; now: string }) {
    const expired = gift.expires_at < now;

    return (
        <div className="rounded-3xl border border-[#17233B]/10 bg-white p-7 shadow-sm">
            <p className="text-sm font-medium text-[#17233B]/70">
                {gift.business_name} · {kindLabels[gift.kind]}
            </p>
            <h1 className="mt-1 text-2xl font-semibold leading-tight">{gift.reward}</h1>

            <dl className="mt-6 grid grid-cols-2 gap-3 rounded-2xl bg-[#FFF8F0] p-4 text-sm">
                <div>
                    <dt className="text-[#17233B]/70">Customer</dt>
                    <dd className="mt-0.5 font-semibold">{gift.customer_name ?? "Customer"}</dd>
                </div>
                <div>
                    <dt className="text-[#17233B]/70">Code</dt>
                    <dd className="mt-0.5 font-mono font-semibold tracking-widest">{gift.code}</dd>
                </div>
                <div>
                    <dt className="text-[#17233B]/70">Valid until</dt>
                    <dd className={`mt-0.5 font-medium ${expired ? "text-red-700" : ""}`}>{formatDateTime(gift.expires_at)}</dd>
                </div>
            </dl>

            {done && gift.used_at && (
                <Alert className="mt-5 border-emerald-200 bg-emerald-50 text-emerald-900">
                    <FiCheckCircle aria-hidden="true" />
                    <AlertTitle>Gift used</AlertTitle>
                    <AlertDescription>Give them: {gift.reward}.</AlertDescription>
                </Alert>
            )}

            {error && (
                <Alert variant="destructive" className="mt-5">
                    <AlertTitle>Not done</AlertTitle>
                    <AlertDescription>That didn&apos;t work. Please try again.</AlertDescription>
                </Alert>
            )}

            {gift.used_at && !done ? (
                <Alert variant="destructive" className="mt-5">
                    <FiAlertTriangle aria-hidden="true" />
                    <AlertTitle>Already used</AlertTitle>
                    <AlertDescription>This gift was used on {formatDateTime(gift.used_at)}.</AlertDescription>
                </Alert>
            ) : !gift.used_at && expired ? (
                <Alert variant="destructive" className="mt-5">
                    <AlertTitle>This gift has expired</AlertTitle>
                    <AlertDescription>It can no longer be used.</AlertDescription>
                </Alert>
            ) : !gift.used_at ? (
                <form action={markGiftUsed} className="mt-6">
                    <input type="hidden" name="code" value={gift.code} />
                    <input type="hidden" name="voucherId" value={gift.voucher_id} />
                    <SubmitButton pendingLabel="Marking as used…" className="h-12 w-full bg-[#FF593F] text-base text-white hover:bg-[#FF593F]/90">
                        Mark as used
                    </SubmitButton>
                </form>
            ) : null}

            <Button
                render={<Link href={`/business/${gift.business_id}/automations`} />}
                nativeButton={false}
                variant="ghost"
                className="mt-4 w-full"
            >
                Automations
            </Button>
        </div>
    );
}
