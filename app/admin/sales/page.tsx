import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FiArrowRight, FiBriefcase, FiMail, FiMapPin } from "react-icons/fi";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { STAGES, STAGE_LABELS, leadAddress } from "@/lib/sales-pipeline";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = { title: "Sales", robots: { index: false } };

type PageProps = { searchParams: Promise<{ stage?: string; post?: string }> };

type LeadRow = {
    id: string;
    name: string;
    // The parts, not a line: the line is built from them when it is
    // shown, so it cannot disagree with them.
    address_line_1: string | null;
    address_line_2: string | null;
    postcode: string | null;
    email: string | null;
    can_email: boolean;
    company_number: string | null;
    stage: string;
    website: string | null;
    created_at: string;
    areas: { name: string } | null;
    cities: { name: string } | null;
};

function Pipeline({ counts }: { counts: Record<string, number> }) {
    // Ten stages, so five to a row above mobile: wrapping put nine on one
    // line and one orphan on the next, which read like a tenth thing
    // rather than part of the same set. A strip that scrolls is still
    // right on a phone.
    return (
        <div className="-mx-6 flex gap-2 overflow-x-auto scrollbar-none px-6 pb-1 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0">
            {STAGES.map((stage) => (
                <Link
                    key={stage.key}
                    href={`/admin/sales?stage=${stage.key}`}
                    className="shrink-0 rounded-xl border border-[#17233B]/10 bg-white px-4 py-3 hover:border-[#FF593F]/40 sm:shrink"
                >
                    <p className="text-xs text-[#17233B]/60">{stage.label}</p>
                    <p className="mt-1 text-xl font-semibold">{counts[stage.key] ?? 0}</p>
                </Link>
            ))}
        </div>
    );
}

async function Board({ searchParams }: PageProps) {
    await connection();

    const supabase = await createClient();
    const { data: isAdmin } = await supabase.rpc("is_platform_admin");

    if (!isAdmin) redirect("/admin");

    const params = await searchParams;

    const { data: all } = await supabase.from("leads").select("stage, can_email");

    const counts = (all ?? []).reduce<Record<string, number>>((tally, lead) => {
        tally[lead.stage] = (tally[lead.stage] ?? 0) + 1;
        return tally;
    }, {});

    const postOnly = (all ?? []).filter((lead) => !lead.can_email).length;

    const { count: waitingCount } = await supabase
        .from("outreach_messages")
        .select("id", { count: "exact", head: true })
        .eq("status", "queued");

    const waiting = waitingCount ?? 0;

    let query = supabase
        .from("leads")
        .select("id, name, address_line_1, address_line_2, postcode, email, can_email, company_number, stage, website, created_at, areas ( name ), cities ( name )")
        .order("created_at", { ascending: false })
        .limit(200);

    if (params.stage) query = query.eq("stage", params.stage);
    if (params.post === "1") query = query.eq("can_email", false);

    const { data } = await query;
    const leads = (data ?? []) as unknown as LeadRow[];

    return (
        <div className="text-[#17233B]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                        Sales
                    </p>
                    <h1 className="mt-3 text-4xl font-semibold tracking-tight">The pipeline</h1>
                    <p className="mt-3 max-w-2xl text-[#17233B]/65">
                        Every business we have found, and how far it has got. A lead
                        becomes a preview when it is worth writing to.
                    </p>
                </div>

                <div className="flex shrink-0 gap-3">
                    <Button render={<Link href="/admin/sales/outbox" />} nativeButton={false} variant="outline">
                        Outbox{waiting > 0 ? ` · ${waiting}` : ""}
                    </Button>

                    <Button render={<Link href="/admin/sales/new" />} nativeButton={false}>
                        Add a lead
                        <FiArrowRight aria-hidden="true" />
                    </Button>
                </div>
            </div>


            <div className="mt-8">
                <Pipeline counts={counts} />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
                <Link
                    href="/admin/sales"
                    className={`rounded-full px-3 py-1.5 ${!params.stage && params.post !== "1" ? "bg-[#17233B] text-white" : "border border-[#17233B]/15"}`}
                >
                    Everyone
                </Link>

                {/* Post only is not a stage: it is the legal gate, and it
                    cuts across all of them. A business we may not email
                    still gets a letter. */}
                <Link
                    href="/admin/sales?post=1"
                    className={`rounded-full px-3 py-1.5 ${params.post === "1" ? "bg-[#17233B] text-white" : "border border-[#17233B]/15"}`}
                >
                    Post only · {postOnly}
                </Link>

                {params.stage && (
                    <span className="text-[#17233B]/60">
                        Showing {STAGE_LABELS[params.stage] ?? params.stage}
                    </span>
                )}
            </div>

            {leads.length === 0 ? (
                <Card className="mt-8 border-[#17233B]/10">
                    <CardContent className="p-10 text-center">
                        <h2 className="text-lg font-semibold">Nothing here yet</h2>
                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#17233B]/65">
                            Add a business and it becomes a lead. Give it a website and the
                            crawler finds their email and the address they publish. Nothing is
                            written to anybody until you say so.
                        </p>
                        <Button
                            render={<Link href="/admin/sales/new" />}
                            nativeButton={false}
                            className="mt-6"
                        >
                            Add a lead
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="mt-6 space-y-3">
                    {/* The whole tile is the link, not just the name.
                        Nothing else in it is interactive, so there is no
                        link inside a link and no second tab stop for the
                        same destination. */}
                    {leads.map((lead) => (
                        <Link
                            key={lead.id}
                            href={`/admin/sales/${lead.id}`}
                            className="block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF593F]"
                        >
                            <Card className="border-[#17233B]/10 transition hover:border-[#FF593F]/40 hover:shadow-sm">
                            <CardHeader className="pb-3">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <CardTitle className="text-base">{lead.name}</CardTitle>

                                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#17233B]/60">
                                            {lead.areas?.name && (
                                                <span className="inline-flex items-center gap-1">
                                                    <FiMapPin aria-hidden="true" />
                                                    {lead.areas.name}
                                                </span>
                                            )}
                                            {lead.email && (
                                                <span className="inline-flex items-center gap-1">
                                                    <FiMail aria-hidden="true" />
                                                    {lead.email}
                                                </span>
                                            )}
                                            {leadAddress(lead) && <span>{leadAddress(lead)}</span>}
                                        </p>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-2">
                                        {lead.can_email ? (
                                            <Badge variant="secondary">Emailable</Badge>
                                        ) : (
                                            <Badge variant="outline" className="border-[#FF593F]/30 text-[#FF593F]">
                                                Post only
                                            </Badge>
                                        )}
                                        <Badge variant="outline">{STAGE_LABELS[lead.stage] ?? lead.stage}</Badge>
                                    </div>
                                </div>
                            </CardHeader>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}

            {/* Moved here from the overview. It is the thing to open when
                somebody is about to be sold to, which is this page's whole
                business — on the overview it sat under a column of numbers
                that are nobody's next move. */}
            <section className="mt-10 border-t border-[#17233B]/10 pt-8">
                <h2 className="text-lg font-semibold">Selling</h2>
                <p className="mt-1 text-sm text-[#17233B]/65">
                    A business of our own to show, and a pack to leave behind.
                </p>

                <Link
                    href="/admin/demo"
                    className="group mt-4 flex items-center gap-4 rounded-xl border border-[#17233B]/10 bg-white p-4 transition-colors hover:border-[#FF593F]/40 sm:max-w-md"
                >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#17233B]/5 text-[#17233B]/65">
                        <FiBriefcase />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block font-semibold">The demo business</span>
                        <span className="block text-sm text-[#17233B]/70">
                            Real offers, a real card, and a report — invisible to everybody else.
                        </span>
                    </span>
                    <FiArrowRight
                        aria-hidden="true"
                        className="text-[#17233B]/30 transition-colors group-hover:text-[#FF593F]"
                    />
                </Link>
            </section>
        </div>
    );
}

export default function SalesPage(props: PageProps) {
    return (
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <Board {...props} />
        </Suspense>
    );
}
