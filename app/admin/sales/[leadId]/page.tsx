import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { FiExternalLink } from "react-icons/fi";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { STAGES, STAGE_LABELS } from "@/lib/sales-pipeline";
import { createClient } from "@/utils/supabase/server";
import { checkCompany, enrichLead, moveLead, saveLeadNotes } from "../actions";

export const metadata: Metadata = { title: "Lead", robots: { index: false } };

type PageProps = { params: Promise<{ leadId: string }> };

function When({ value }: { value: string }) {
    return (
        <>
            {new Intl.DateTimeFormat("en-GB", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Europe/London",
            }).format(new Date(value))}
        </>
    );
}

async function Lead({ params }: PageProps) {
    await connection();

    const supabase = await createClient();
    const { data: isAdmin } = await supabase.rpc("is_platform_admin");

    if (!isAdmin) redirect("/admin");

    const { leadId } = await params;

    const { data: lead } = await supabase
        .from("leads")
        .select("*, areas ( name ), cities ( name )")
        .eq("id", leadId)
        .maybeSingle();

    if (!lead) notFound();

    const { data: events } = await supabase
        .from("lead_events")
        .select("id, kind, detail, created_at")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });

    const area = Array.isArray(lead.areas) ? lead.areas[0] : lead.areas;
    const city = Array.isArray(lead.cities) ? lead.cities[0] : lead.cities;

    return (
        <div className="text-[#17233B]">
            <Button render={<Link href="/admin/sales" />} nativeButton={false} variant="ghost" size="sm">
                ← The pipeline
            </Button>

            <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight">{lead.name}</h1>
                    <p className="mt-2 text-sm text-[#17233B]/65">
                        {[lead.address, area?.name, city?.name].filter(Boolean).join(" · ") || "No address yet"}
                    </p>
                </div>

                <div className="flex items-center gap-2">
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

            <div className="mt-8 grid gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    <Card className="border-[#17233B]/10">
                        <CardHeader>
                            <CardTitle className="text-base">What we know, and where from</CardTitle>
                        </CardHeader>

                        <CardContent className="space-y-4 text-sm">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-[#17233B]/55">Email</p>
                                    <p className="mt-1 font-medium">{lead.email ?? "Not found yet"}</p>
                                    {lead.email_source && (
                                        <a
                                            href={lead.email_source}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="mt-1 inline-flex items-center gap-1 text-xs text-[#17233B]/60 hover:text-[#FF593F]"
                                        >
                                            from {lead.email_source.replace(/^https?:\/\//, "").slice(0, 48)}
                                            <FiExternalLink aria-hidden="true" className="size-3" />
                                        </a>
                                    )}
                                </div>

                                <form action={enrichLead}>
                                    <input type="hidden" name="leadId" value={lead.id} />
                                    <Button type="submit" size="sm" variant="outline" disabled={!lead.website}>
                                        {lead.email ? "Look again" : "Find their address"}
                                    </Button>
                                </form>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-[#17233B]/55">
                                        Companies House
                                    </p>
                                    <p className="mt-1 font-medium">
                                        {lead.company_number
                                            ? `${lead.company_name ?? "Registered"} · ${lead.company_number}`
                                            : lead.companies_house_checked_at
                                                ? "No confident match — post only"
                                                : "Not checked"}
                                    </p>
                                    <p className="mt-1 text-xs leading-5 text-[#17233B]/60">
                                        A limited company may be emailed. A sole trader may not,
                                        so they get a letter instead.
                                    </p>
                                </div>

                                <form action={checkCompany}>
                                    <input type="hidden" name="leadId" value={lead.id} />
                                    <Button type="submit" size="sm" variant="outline">
                                        {lead.companies_house_checked_at ? "Check again" : "Check"}
                                    </Button>
                                </form>
                            </div>

                            {lead.website && (
                                <div className="border-t pt-4">
                                    <p className="text-xs uppercase tracking-wide text-[#17233B]/55">Website</p>
                                    <a
                                        href={lead.website}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-1 inline-flex items-center gap-1 font-medium hover:text-[#FF593F]"
                                    >
                                        {lead.website.replace(/^https?:\/\//, "")}
                                        <FiExternalLink aria-hidden="true" className="size-3" />
                                    </a>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-[#17233B]/10">
                        <CardHeader>
                            <CardTitle className="text-base">The preview</CardTitle>
                        </CardHeader>

                        <CardContent className="text-sm">
                            {lead.preview_business_id ? (
                                <Button
                                    render={<Link href={`/admin/previews/${lead.preview_business_id}`} />}
                                    nativeButton={false}
                                    variant="outline"
                                    size="sm"
                                >
                                    Open the preview
                                </Button>
                            ) : (
                                <>
                                    <p className="text-[#17233B]/65">
                                        A page built for them is the whole argument. Build it
                                        when this one is worth writing to, not before.
                                    </p>

                                    <Button
                                        render={<Link href={`/admin/previews/new?lead=${lead.id}`} />}
                                        nativeButton={false}
                                        size="sm"
                                        className="mt-4"
                                    >
                                        Build the preview
                                    </Button>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-[#17233B]/10">
                        <CardHeader>
                            <CardTitle className="text-base">Notes</CardTitle>
                        </CardHeader>

                        <CardContent>
                            <form action={saveLeadNotes} className="space-y-3">
                                <input type="hidden" name="leadId" value={lead.id} />
                                <textarea
                                    name="notes"
                                    defaultValue={lead.notes ?? ""}
                                    rows={4}
                                    className="w-full rounded-lg border border-input bg-background p-3 text-sm"
                                    placeholder="Anything worth remembering before writing."
                                />
                                <Button type="submit" size="sm" variant="outline">
                                    Save notes
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="border-[#17233B]/10">
                        <CardHeader>
                            <CardTitle className="text-base">Move it on</CardTitle>
                        </CardHeader>

                        <CardContent>
                            <form action={moveLead} className="space-y-3">
                                <input type="hidden" name="leadId" value={lead.id} />

                                <select
                                    name="stage"
                                    defaultValue={lead.stage}
                                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                                >
                                    {STAGES.map((stage) => (
                                        <option key={stage.key} value={stage.key}>
                                            {stage.label}
                                        </option>
                                    ))}
                                </select>

                                <Button type="submit" size="sm" className="w-full">
                                    Move
                                </Button>

                                {!lead.can_email && (
                                    <p className="text-xs leading-5 text-[#17233B]/60">
                                        Emailed and Followed up are refused while this is post
                                        only. Check Companies House first.
                                    </p>
                                )}
                            </form>
                        </CardContent>
                    </Card>

                    <Card className="border-[#17233B]/10">
                        <CardHeader>
                            <CardTitle className="text-base">What has happened</CardTitle>
                        </CardHeader>

                        <CardContent className="space-y-3 text-sm">
                            {(events ?? []).length === 0 ? (
                                <p className="text-[#17233B]/60">Nothing yet.</p>
                            ) : (
                                (events ?? []).map((event) => (
                                    <div key={event.id} className="border-b pb-3 last:border-0 last:pb-0">
                                        <p className="font-medium">{event.kind.replace(/_/g, " ")}</p>
                                        {event.detail && (
                                            <p className="mt-0.5 text-xs leading-5 text-[#17233B]/65">
                                                {event.detail}
                                            </p>
                                        )}
                                        <p className="mt-0.5 text-xs text-[#17233B]/50">
                                            <When value={event.created_at} />
                                        </p>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default function LeadPage(props: PageProps) {
    return (
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <Lead {...props} />
        </Suspense>
    );
}
