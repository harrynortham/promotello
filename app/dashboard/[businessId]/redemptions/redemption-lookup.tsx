"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type RedemptionLookupProps = {
    businessId: string;
};

type Redemption = {
    id: string;
    redemption_code: string;
    redeemed_at: string | null;
    offers:
    | {
        title: string;
        business_id: string;
    }
    | {
        title: string;
        business_id: string;
    }[]
    | null;
};

export default function RedemptionLookup({
    businessId,
}: RedemptionLookupProps) {
    const [code, setCode] = useState("");
    const [redemption, setRedemption] = useState<Redemption | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isMarkingUsed, setIsMarkingUsed] = useState(false);
    const [message, setMessage] = useState("");

    async function handleSearch(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setIsSearching(true);
        setRedemption(null);
        setMessage("");

        const supabase = createClient();

        const { data, error } = await supabase
            .from("offer_redemptions")
            .select(
                `
          id,
          redemption_code,
          redeemed_at,
          offers!inner (
            title,
            business_id
          )
        `,
            )
            .eq("redemption_code", code.trim().toUpperCase())
            .eq("offers.business_id", businessId)
            .maybeSingle();

        setIsSearching(false);

        if (error || !data) {
            setMessage("No matching redemption code was found.");
            return;
        }

        setRedemption(data as Redemption);
    }

    async function markAsUsed() {
        if (!redemption) {
            return;
        }

        setIsMarkingUsed(true);
        setMessage("");

        const supabase = createClient();

        const { data, error } = await supabase.rpc("mark_redemption_used", {
            requested_redemption_id: redemption.id,
        });

        setIsMarkingUsed(false);

        if (error) {
            setMessage(error.message);
            return;
        }

        setRedemption({
            ...redemption,
            redeemed_at: data.redeemed_at,
        });
    }

    return (
        <section className="mt-10 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-semibold">Check a redemption code</h2>

            <p className="mt-2 text-sm text-[#17233B]/65">
                Enter the code shown by the customer.
            </p>

            <form
                onSubmit={handleSearch}
                className="mt-5 flex flex-col gap-3 sm:flex-row"
            >
                <input
                    value={code}
                    onChange={(event) => setCode(event.target.value.toUpperCase())}
                    required
                    placeholder="A1B2C3D4E5"
                    className="flex-1 rounded-xl border border-[#17233B]/15 px-4 py-3 text-sm uppercase outline-none focus:border-[#FF593F] focus:ring-2 focus:ring-[#FF593F]/20"
                />

                <button
                    type="submit"
                    disabled={isSearching}
                    className="rounded-xl bg-[#FF593F] px-5 py-3 font-semibold transition hover:bg-[#E94D36] disabled:opacity-60"
                >
                    {isSearching ? "Checking…" : "Check code"}
                </button>
            </form>

            {message && (
                <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                    {message}
                </p>
            )}

            {redemption && (
                <div className="mt-6 rounded-2xl border border-[#17233B]/10 p-5">
                    <p className="text-sm text-[#17233B]/55">Promotion</p>

                    <p className="mt-1 text-lg font-semibold">
                        {Array.isArray(redemption.offers)
                            ? redemption.offers[0]?.title
                            : redemption.offers?.title}
                    </p>

                    <p className="mt-3 font-mono text-xl font-bold tracking-[0.2em]">
                        {redemption.redemption_code}
                    </p>

                    {redemption.redeemed_at ? (
                        <p className="mt-4 font-semibold text-slate-600">
                            This code has already been used.
                        </p>
                    ) : (
                        <button
                            type="button"
                            onClick={markAsUsed}
                            disabled={isMarkingUsed}
                            className="mt-5 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                        >
                            {isMarkingUsed ? "Confirming…" : "Mark as used"}
                        </button>
                    )}
                </div>
            )}
        </section>
    );
}