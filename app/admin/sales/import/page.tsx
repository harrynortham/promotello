import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FiExternalLink } from "react-icons/fi";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { TradePicker } from "@/components/trade-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { SubmitButton } from "@/components/submit-button";
import { EXTRA_TRADES } from "@/lib/google-places";
import { createClient } from "@/utils/supabase/server";
import { handleCandidates, sweepArea } from "./actions";

export const metadata: Metadata = { title: "Import leads", robots: { index: false } };

type PageProps = {
    searchParams: Promise<{
        area?: string;
        swept?: string;
        trades?: string;
        calls?: string;
        capped?: string;
        cappedCount?: string;
        made?: string;
        crawled?: string;
        skipped?: string;
        error?: string;
    }>;
};

async function Importer({ searchParams }: PageProps) {
    await connection();

    const supabase = await createClient();
    const { data: isAdmin } = await supabase.rpc("is_platform_admin");

    if (!isAdmin) redirect("/admin");

    const params = await searchParams;

    const [{ data: areas }, { data: ourTrades }, { data: waiting }] = await Promise.all([
        supabase.from("areas").select("id, name, cities ( name )").order("name"),
        supabase
            .from("categories")
            .select("id, name")
            .not("parent_id", "is", null)
            .eq("is_active", true)
            .order("name"),
        params.area
            ? supabase
                  .from("lead_candidates")
                  .select("id, place_id, website, cached_name, cached_address, categories ( name )")
                  .eq("area_id", params.area)
                  .eq("status", "new")
                  .not("cached_name", "is", null)
                  .order("cached_name")
            : Promise.resolve({ data: [] }),
    ]);

    const candidates = waiting ?? [];
    const tradeCategories = ourTrades ?? [];

    return (
        <div className="text-[#17233B]">
            <Button render={<Link href="/admin/sales" />} nativeButton={false} variant="ghost" size="sm">
                ← The pipeline
            </Button>

            <h1 className="mt-6 text-3xl font-semibold tracking-tight">Import leads</h1>

            <p className="mt-3 max-w-2xl leading-7 text-[#17233B]/65">
                Pick a street and Google will say who is on it. Importing makes a lead
                and then reads their own website for the address and the email, which
                is the part worth keeping.
            </p>

            {/* Said out loud because it decides the shape of all of
                this, and because the next person to touch it will
                wonder why the names are not simply stored. */}
            <p className="mt-4 max-w-2xl rounded-lg border border-[#17233B]/10 bg-[#FFF8F0] px-4 py-3 text-xs leading-6 text-[#17233B]/70">
                Google&apos;s terms let us keep a place ID and little else — the policy
                names saving business names and addresses as a prohibited use. So the
                names and addresses below are borrowed: they are here to be read, they
                are replaced by the business&apos;s own published address when the
                crawler finds one, and anything still borrowed after thirty days is
                deleted by the nightly job.
            </p>

            {params.error === "no_area" && (
                <Alert variant="destructive" className="mt-6">
                    <AlertTitle>That area is not one of ours</AlertTitle>
                    <AlertDescription>Pick one from the list.</AlertDescription>
                </Alert>
            )}

            {params.error === "none_picked" && (
                <p className="mt-6 rounded-lg border border-[#17233B]/15 bg-white px-4 py-3 text-sm text-[#17233B]/75">
                    Nothing was ticked, so nothing was imported.
                </p>
            )}

            {params.swept && (
                <p className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
                    Swept {params.trades} trades and found {params.swept} businesses we
                    did not already have, in {params.calls} billed searches.
                </p>
            )}

            {/* Sixty is Google's ceiling and there is no way to ask
                for the sixty-first. A trade that came back full has
                almost certainly been cut off, and the only thing to be
                done is ask a narrower question. Saying so beats a
                sweep that quietly missed half a street. */}
            {params.cappedCount && (
                <Alert className="mt-6 border-amber-200 bg-amber-50">
                    <AlertTitle>
                        {params.cappedCount} {params.cappedCount === "1" ? "trade" : "trades"} hit
                        Google&apos;s limit of 60
                    </AlertTitle>
                    <AlertDescription>
                        <span className="text-amber-900">{params.capped}</span>
                        {Number(params.cappedCount) > 6 ? " and others" : ""} returned the most
                        Google will give for one search, so this street almost certainly has
                        more of them. Ask something narrower — &ldquo;pizza
                        restaurant&rdquo; and &ldquo;curry house&rdquo; rather than
                        &ldquo;restaurants&rdquo; — and sweep again.
                    </AlertDescription>
                </Alert>
            )}

            {params.made && (
                <p className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
                    {params.made} leads made, {params.crawled} with an address read from
                    their own site. The rest want one typed.
                </p>
            )}

            {params.skipped && (
                <p className="mt-6 rounded-lg border border-[#17233B]/15 bg-white px-4 py-3 text-sm text-[#17233B]/75">
                    {params.skipped} set aside. They will not be offered again.
                </p>
            )}

            <Card className="mt-8 border-[#17233B]/10">
                <CardContent className="p-5">
                    <form action={sweepArea} className="space-y-4">
                        <div className="flex flex-wrap items-end gap-3">
                        <div className="min-w-56 flex-1 space-y-1">
                            <label htmlFor="areaId" className="text-xs text-[#17233B]/65">
                                Area
                            </label>
                            <NativeSelect id="areaId" name="areaId" defaultValue={params.area ?? ""}>
                                <option value="" disabled>
                                    Choose an area
                                </option>
                                {(areas ?? []).map((area) => {
                                    const city = Array.isArray(area.cities) ? area.cities[0] : area.cities;

                                    return (
                                        <option key={area.id} value={area.id}>
                                            {area.name}
                                            {city?.name ? `, ${city.name}` : ""}
                                        </option>
                                    );
                                })}
                            </NativeSelect>
                        </div>

                            <SubmitButton pendingLabel="Sweeping…">Sweep it</SubmitButton>
                        </div>

                        {/* Which trades, rather than how wide. A street
                            nobody has touched wants all of them; one
                            half-done wants the few that are left, and
                            each trade is billed. */}
                        <TradePicker ours={tradeCategories} others={EXTRA_TRADES} />
                    </form>

                    <p className="mt-3 text-xs leading-5 text-[#17233B]/55">
                        One search a trade, because Google gives at most sixty results a
                        query, and only results whose address is in the area are kept.
                        Our categories are 44 trades and every trade is 183, each
                        needing one to three searches. Google gives 5,000 Text Search
                        requests a month before charging, so a handful of sweeps a
                        month costs nothing — and results are saved as they are found,
                        so a sweep that stops partway keeps what it got.
                    </p>
                </CardContent>
            </Card>

            {params.area && candidates.length === 0 && (
                <p className="mt-8 text-sm text-[#17233B]/65">
                    Nothing waiting for this area. Sweep it, or everything found is
                    already a lead.
                </p>
            )}

            {candidates.length > 0 && (
                <form action={handleCandidates} className="mt-8">
                    <input type="hidden" name="areaId" value={params.area ?? ""} />

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-[#17233B]/70">
                            <strong className="text-[#17233B]">{candidates.length}</strong>{" "}
                            waiting to be looked at.
                        </p>

                        <div className="flex flex-wrap items-center gap-2">
                            <SubmitButton
                                pendingLabel="Importing…"
                                size="sm"
                                name="intent"
                                value="import"
                            >
                                Import the ticked
                            </SubmitButton>

                            {/* Which button was pressed arrives as a
                                field: a form has one action, and the
                                ticks have to travel with either. */}
                            <SubmitButton
                                pendingLabel="Setting aside…"
                                size="sm"
                                variant="outline"
                                name="intent"
                                value="skip"
                            >
                                Not interested
                            </SubmitButton>
                        </div>
                    </div>

                    <div className="mt-4 divide-y divide-[#17233B]/8 overflow-hidden rounded-xl border border-[#17233B]/10 bg-white">
                        {candidates.map((candidate) => {
                            const category = Array.isArray(candidate.categories)
                                ? candidate.categories[0]
                                : candidate.categories;

                            return (
                                <div
                                    key={candidate.id}
                                    className="flex items-start gap-3 px-4 py-3 transition hover:bg-[#FFF8F0]"
                                >
                                    {/* The link sits outside the label
                                        on purpose: inside it, opening
                                        their site also toggled the
                                        tick, and a server component
                                        cannot hand a click handler to
                                        a client one to stop it. */}
                                    <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                                        <input
                                            type="checkbox"
                                            name="candidateId"
                                            value={candidate.id}
                                            defaultChecked
                                            className="mt-1 size-4 shrink-0 accent-[#FF593F]"
                                        />

                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm font-medium">
                                                {candidate.cached_name}
                                            </span>
                                            <span className="block text-xs leading-5 text-[#17233B]/55">
                                                {candidate.cached_address}
                                            </span>
                                        </span>
                                    </label>

                                    <span className="hidden w-32 shrink-0 truncate pt-0.5 text-xs text-[#17233B]/55 sm:inline">
                                        {category?.name ?? "—"}
                                    </span>

                                    {/* Whether the crawler will have
                                        anything to read is the best
                                        guess at whether this lead will
                                        need typing out by hand. */}
                                    <span className="w-20 shrink-0 pt-0.5 text-right text-[11px]">
                                        {candidate.website ? (
                                            <a
                                                href={candidate.website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-[#FF593F] underline underline-offset-2"
                                            >
                                                Site
                                                <FiExternalLink aria-hidden="true" />
                                            </a>
                                        ) : (
                                            <span className="text-[#17233B]/40">No site</span>
                                        )}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </form>
            )}
        </div>
    );
}

export default function ImportPage(props: PageProps) {
    return (
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <Importer {...props} />
        </Suspense>
    );
}
