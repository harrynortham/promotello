import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FiArrowRight, FiBriefcase, FiClock, FiMail, FiMapPin, FiSend } from "react-icons/fi";

import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { dueColumns, toDueLeads, WAITING_STAGES } from "@/lib/sales-due";
import { STAGES, STAGE_LABELS, dueToday, leadAddress, whenSaid, type DueLead } from "@/lib/sales-pipeline";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = { title: "Sales", robots: { index: false } };

type PageProps = {
    searchParams: Promise<{
        stage?: string;
        post?: string;
        area?: string;
        category?: string;
        q?: string;
        due?: string;
        page?: string;
    }>;
};

type AreaOption = { id: string; name: string; cities: { name: string } | null };

// Enough that a morning's work is one page, few enough that the page
// is readable on a phone.
//
// Twenty-five never fired: the board had twenty-two leads on it and
// the pager stayed hidden while the page ran to nearly five screens.
// A number only reached in theory is not a page size.
const PER_PAGE = 15;

// A uuid no lead has, for the case where a filter matches nothing:
// PostgREST's .in() with an empty list matches every row, which is the
// opposite of what an empty filter means.
const NO_SUCH_LEAD = "00000000-0000-0000-0000-000000000000";

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
    last_touch_at: string;
    lead_events: { kind: string; created_at: string }[] | null;
    areas: { name: string } | null;
    cities: { name: string } | null;
};

// The last thing done to them, said plainly: "emailed 6 days ago".
const TOUCH_WORDS: Record<string, string> = {
    preview_built: "page built",
    followed_social: "followed",
    emailed: "emailed",
    followed_up: "chased",
    letter_sent: "letter posted",
};

function lastTouch(lead: LeadRow) {
    const touches = (lead.lead_events ?? [])
        .filter((event) => event.kind in TOUCH_WORDS)
        .sort((a, b) => a.created_at.localeCompare(b.created_at));

    const last = touches[touches.length - 1];

    return last ? `${TOUCH_WORDS[last.kind]} ${whenSaid(last.created_at)}` : null;
}

// What to do today, above everything else on the page.
//
// The rule that decides this was always right and always invisible: it
// ran in the daily job and wrote a note on the lead, so finding out
// whose turn it was meant opening every lead in the pipeline one at a
// time. Here it is the first thing on the board.
function DueList({ due }: { due: { followUp: DueLead[]; letter: DueLead[] } }) {
    const total = due.followUp.length + due.letter.length;

    if (total === 0) return null;

    return (
        <Card className="mt-8 border-[#FF593F]/30 bg-[#FF593F]/[0.04]">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <FiSend aria-hidden="true" className="text-[#FF593F]" />
                    Needs doing today
                </CardTitle>
            </CardHeader>

            <CardContent className="grid gap-6 sm:grid-cols-2">
                <DueGroup
                    title="Due a follow-up"
                    note="Four days since the first email and no reply."
                    leads={due.followUp}
                />
                <DueGroup
                    title="Due a letter"
                    note="A fortnight with nothing back."
                    leads={due.letter}
                />
            </CardContent>
        </Card>
    );
}

function DueGroup({ title, note, leads }: { title: string; note: string; leads: DueLead[] }) {
    return (
        <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#17233B]/55">
                {title} · {leads.length}
            </p>

            {leads.length === 0 ? (
                <p className="mt-2 text-sm text-[#17233B]/60">Nobody.</p>
            ) : (
                <>
                    <p className="mt-1 text-xs text-[#17233B]/55">{note}</p>

                    <ul className="mt-2 space-y-1">
                        {leads.map((lead) => (
                            <li key={lead.id} className="flex items-center gap-2">
                                <Link
                                    href={`/admin/sales/${lead.id}`}
                                    className="text-sm font-medium text-[#FF593F] hover:underline"
                                >
                                    {lead.name}
                                </Link>

                                {/* Dragging across a link starts a drag
                                    rather than a selection, so the name
                                    cannot be copied by hand here either. */}
                                <CopyButton
                                    text={lead.name}
                                    label={`Copy ${lead.name}`}
                                    iconOnly
                                    className="shrink-0 cursor-pointer text-[#17233B]/35 transition hover:text-[#FF593F]"
                                />

                                {!lead.can_email && (
                                    <span className="text-xs text-[#17233B]/55">post only</span>
                                )}
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
}

// A link that keeps the filters already on, changing only what it is
// given. Without it every chip and every stage tile silently threw the
// rest away, which is the thing that makes a filter bar annoying.
type Params = Awaited<PageProps["searchParams"]>;

function withParams(current: Params, changes: Record<string, string | null>) {
    const next = new URLSearchParams();

    for (const [key, value] of Object.entries({ ...current, ...changes })) {
        if (value) next.set(key, String(value));
    }

    const query = next.toString();

    return query ? `/admin/sales?${query}` : "/admin/sales";
}

function Pipeline({ counts, params }: { counts: Record<string, number>; params: Params }) {
    // Twelve stages, so six to a row above mobile: two full rows, no
    // orphan. It was five and five, then six and five when following
    // them was added, and now six and six with the DM between that and
    // the first email. A strip that scrolls is still right on a phone.
    return (
        <div className="-mx-6 flex gap-2 overflow-x-auto scrollbar-none px-6 pb-1 sm:mx-0 sm:grid sm:grid-cols-6 sm:overflow-visible sm:px-0">
            {STAGES.map((stage) => (
                <Link
                    key={stage.key}
                    href={withParams(params, { stage: stage.key, page: null })}
                    // The one being shown is marked, which matters most
                    // on the first load: the board opens on New, and a
                    // strip of unmarked counts would not say so.
                    className={`shrink-0 rounded-xl border bg-white px-4 py-3 hover:border-[#FF593F]/40 sm:shrink ${
                        (params.stage ?? "new") === stage.key
                            ? "border-[#FF593F]"
                            : "border-[#17233B]/10"
                    }`}
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

    // Worked out here, live, rather than read off whatever the daily
    // job wrote at eight. The board is where the question "what do I do
    // today" is actually asked, and an answer that is up to sixteen
    // hours old is not an answer.
    const { data: waitingRows } = await supabase
        .from("leads")
        .select(dueColumns)
        .in("stage", WAITING_STAGES);

    const due = dueToday(toDueLeads(waitingRows ?? []), new Date());

    // The places and the trades actually on the board, so the two
    // selects never offer a filter that would return nothing.
    const [{ data: areaRows }, { data: categoryRows }] = await Promise.all([
        supabase.from("areas").select("id, name, cities ( name )").order("name"),
        supabase.from("categories").select("id, name").not("parent_id", "is", null).order("name"),
    ]);

    const areas = (areaRows ?? []) as unknown as AreaOption[];
    const categories = (categoryRows ?? []) as { id: string; name: string }[];

    // New leads, unless something else is asked for.
    //
    // The board opens on the work that has not been started rather than
    // on everything ever found. A list of three hundred leads at every
    // stage does not say what to do next; the ones nobody has touched
    // do.
    //
    // "all" is the word for everything, so the chip has something to
    // link to — an absent stage cannot mean both "new" and "all".
    const stage = params.stage ?? "new";
    const showingAll = stage === "all";

    // Whether anything is narrowing the list beyond that default, which
    // is what decides if a Clear button is worth showing.
    const filtered = Boolean(
        params.q || params.area || params.category || params.stage || params.post || params.due,
    );

    const page = Math.max(1, Number(params.page) || 1);
    const from = (page - 1) * PER_PAGE;

    let query = supabase
        .from("leads")
        .select(
            "id, name, address_line_1, address_line_2, postcode, email, can_email, company_number, stage, website, created_at, last_touch_at, lead_events ( kind, created_at ), areas ( name ), cities ( name )",
            { count: "exact" },
        )
        // Longest since anything happened, first. A sales board is for
        // finding neglected work, not for admiring recent work — and
        // the column exists so this can be an ORDER BY rather than
        // reading the whole table and sorting it here.
        .order("last_touch_at", { ascending: true })
        .range(from, from + PER_PAGE - 1);

    if (!showingAll) query = query.eq("stage", stage);
    if (params.post === "1") query = query.eq("can_email", false);
    if (params.area) query = query.eq("area_id", params.area);
    if (params.category) query = query.eq("category_id", params.category);

    // Matched on the name alone. An address or an email would widen it
    // in ways that are hard to predict from what was typed.
    const search = params.q?.trim();

    if (search) query = query.ilike("name", `%${search.replace(/[%_]/g, "\\$&")}%`);

    // The two lists above, as a filter, so they can be worked through
    // with the area and stage filters still on.
    if (params.due === "followup" || params.due === "letter") {
        const ids = (params.due === "followup" ? due.followUp : due.letter).map((lead) => lead.id);

        // .in() with an empty list matches everything, not nothing.
        query = ids.length > 0 ? query.in("id", ids) : query.eq("id", NO_SUCH_LEAD);
    }

    const { data, count } = await query;
    const leads = (data ?? []) as unknown as LeadRow[];
    const total = count ?? 0;
    const lastPage = Math.max(1, Math.ceil(total / PER_PAGE));

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
                    <Button render={<Link href="/admin/sales/import" />} nativeButton={false} variant="outline">
                        Import
                    </Button>

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
                <DueList due={due} />

                <Pipeline counts={counts} params={params} />
            </div>

            {/* A GET form, so every filter is in the URL and a board
                worth coming back to can be bookmarked or sent to
                somebody. Page is deliberately not carried: changing a
                filter should land on the first page of the new list,
                not page four of it. */}
            <form method="get" action="/admin/sales" className="mt-6 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
                    <Input
                        type="search"
                        name="q"
                        defaultValue={params.q ?? ""}
                        placeholder="Search by name"
                        aria-label="Search by name"
                    />

                    <NativeSelect name="area" defaultValue={params.area ?? ""} aria-label="Area">
                        <option value="">Everywhere</option>
                        {areas.map((area) => (
                            <option key={area.id} value={area.id}>
                                {area.cities?.name ? `${area.name} · ${area.cities.name}` : area.name}
                            </option>
                        ))}
                    </NativeSelect>

                    <NativeSelect
                        name="category"
                        defaultValue={params.category ?? ""}
                        aria-label="Category"
                    >
                        <option value="">Every trade</option>
                        {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </NativeSelect>

                    {/* The same height as the fields beside them, so the
                        row is one line rather than three things that
                        nearly line up. */}
                    <div className="flex items-center gap-2">
                        <Button type="submit" size="lg" className="h-12 px-6">
                            Filter
                        </Button>

                        {filtered && (
                            <Button
                                render={<Link href="/admin/sales" />}
                                nativeButton={false}
                                variant="ghost"
                                size="lg"
                                className="h-12"
                            >
                                Clear
                            </Button>
                        )}
                    </div>
                </div>

                {/* Kept as hidden fields so the chips above and the
                    stage tiles are not thrown away by pressing Filter. */}
                {params.stage && <input type="hidden" name="stage" value={params.stage} />}
                {params.post === "1" && <input type="hidden" name="post" value="1" />}
                {params.due && <input type="hidden" name="due" value={params.due} />}
            </form>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                {/* "all" rather than nothing, because nothing now
                    means new. */}
                <Link
                    href={withParams(params, { stage: "all", post: null, due: null, page: null })}
                    className={`rounded-full px-3 py-1.5 ${showingAll && params.post !== "1" && !params.due ? "bg-[#17233B] text-white" : "border border-[#17233B]/15"}`}
                >
                    Everyone
                </Link>

                {/* Post only is not a stage: it is the legal gate, and it
                    cuts across all of them. A business we may not email
                    still gets a letter. */}
                <Link
                    href={withParams(params, { post: params.post === "1" ? null : "1", page: null })}
                    className={`rounded-full px-3 py-1.5 ${params.post === "1" ? "bg-[#17233B] text-white" : "border border-[#17233B]/15"}`}
                >
                    Post only · {postOnly}
                </Link>

                {due.followUp.length > 0 && (
                    <Link
                        href={withParams(params, { due: params.due === "followup" ? null : "followup", page: null })}
                        className={`rounded-full px-3 py-1.5 ${params.due === "followup" ? "bg-[#FF593F] text-white" : "border border-[#FF593F]/40 text-[#FF593F]"}`}
                    >
                        Due a follow-up · {due.followUp.length}
                    </Link>
                )}

                {due.letter.length > 0 && (
                    <Link
                        href={withParams(params, { due: params.due === "letter" ? null : "letter", page: null })}
                        className={`rounded-full px-3 py-1.5 ${params.due === "letter" ? "bg-[#FF593F] text-white" : "border border-[#FF593F]/40 text-[#FF593F]"}`}
                    >
                        Due a letter · {due.letter.length}
                    </Link>
                )}

                {params.stage && !showingAll && (
                    <Link
                        href={withParams(params, { stage: null, page: null })}
                        className="rounded-full border border-[#17233B]/15 px-3 py-1.5"
                    >
                        {STAGE_LABELS[params.stage] ?? params.stage} ✕
                    </Link>
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
                        <div key={lead.id} className="relative">
                            <Card className="border-[#17233B]/10 transition hover:border-[#FF593F]/40 hover:shadow-sm">
                            {/* The link covers the card rather than
                                wrapping it, so the copy button beside
                                the name is a button next to a link
                                instead of a button inside one. */}
                            <Link
                                href={`/admin/sales/${lead.id}`}
                                aria-label={lead.name}
                                className="absolute inset-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF593F]"
                            />
                            <CardHeader className="pb-3">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <CardTitle className="text-base">{lead.name}</CardTitle>

                                            <CopyButton
                                                text={lead.name}
                                                label={`Copy ${lead.name}`}
                                                iconOnly
                                                className="relative shrink-0 cursor-pointer text-[#17233B]/35 transition hover:text-[#FF593F]"
                                            />
                                        </div>

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
                                            {/* Without this a lead badged
                                                "Emailed" might have been
                                                emailed yesterday or last
                                                month, which is the one
                                                fact the next decision
                                                turns on. */}
                                            {lastTouch(lead) && (
                                                <span className="inline-flex items-center gap-1">
                                                    <FiClock aria-hidden="true" />
                                                    {lastTouch(lead)}
                                                </span>
                                            )}
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
                        </div>
                    ))}
                </div>
            )}

            {/* Only when there is more than one page of it. A pager under
                a list of six is furniture. */}
            {lastPage > 1 && (
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
                    <p className="text-[#17233B]/60">
                        {from + 1}–{Math.min(from + PER_PAGE, total)} of {total}
                    </p>

                    <div className="flex items-center gap-2">
                        {page > 1 ? (
                            <Link
                                href={withParams(params, { page: page === 2 ? null : String(page - 1) })}
                                className="rounded-full border border-[#17233B]/15 px-3 py-1.5"
                            >
                                Previous
                            </Link>
                        ) : (
                            <span className="rounded-full border border-[#17233B]/10 px-3 py-1.5 text-[#17233B]/35">
                                Previous
                            </span>
                        )}

                        <span className="text-[#17233B]/60">
                            Page {page} of {lastPage}
                        </span>

                        {page < lastPage ? (
                            <Link
                                href={withParams(params, { page: String(page + 1) })}
                                className="rounded-full border border-[#17233B]/15 px-3 py-1.5"
                            >
                                Next
                            </Link>
                        ) : (
                            <span className="rounded-full border border-[#17233B]/10 px-3 py-1.5 text-[#17233B]/35">
                                Next
                            </span>
                        )}
                    </div>
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
