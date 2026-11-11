import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FiArrowLeft, FiCheck, FiEye, FiX } from "react-icons/fi";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { stepLabel } from "@/lib/funnel";
import { createClient } from "@/utils/supabase/server";

export const metadata = { title: "A business's journey" };

type Timeline = {
    business: { id: string; name: string; slug: string | null } | null;
    reached: { step: string; at: string; approximate: boolean }[];
    tried: { step: string; event: string; at: string; metadata: Record<string, string> }[];
};

type PageProps = { params: Promise<{ businessId: string }> };

function when(value: string) {
    return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/London",
    }).format(new Date(value));
}

function Loading() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-64 rounded-2xl" />
        </div>
    );
}

async function TimelineContent({ params }: PageProps) {
    await connection();

    const { businessId } = await params;
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("onboarding_timeline", {
        requested_business_id: businessId,
    });

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertTitle>We couldn&apos;t load this journey</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
            </Alert>
        );
    }

    const timeline = data as Timeline;

    if (!timeline?.business) {
        notFound();
    }

    // Everything that happened, in the order it happened: what they
    // finished, what they looked at, and what refused to save.
    const events = [
        ...timeline.reached.map((item) => ({
            at: item.at,
            kind: "reached" as const,
            step: item.step,
            note: item.approximate ? "time is a guess" : null,
        })),
        ...timeline.tried.map((item) => ({
            at: item.at,
            kind: item.event === "step_failed" ? ("failed" as const) : ("viewed" as const),
            step: item.step,
            note: item.metadata?.message ?? null,
        })),
    ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

    return (
        <div className="text-[#17233B]">
            <Link
                href="/admin/funnel"
                className="inline-flex items-center gap-2 text-sm font-medium text-[#17233B]/70 hover:text-[#17233B]"
            >
                <FiArrowLeft aria-hidden="true" />
                Onboarding funnel
            </Link>

            <header className="mt-6">
                <h1 className="text-3xl font-semibold tracking-tight">{timeline.business.name}</h1>
                <p className="mt-2 text-[#17233B]/65">
                    Every step this business reached, looked at, or couldn&apos;t finish.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                    <Badge variant="outline">
                        <Link href={`/business/${timeline.business.id}`}>Dashboard</Link>
                    </Badge>
                    {timeline.business.slug && (
                        <Badge variant="outline">
                            <Link href={`/businesses/${timeline.business.slug}`}>Public page</Link>
                        </Badge>
                    )}
                </div>
            </header>

            {events.length === 0 ? (
                <p className="mt-8 rounded-2xl border border-dashed border-[#17233B]/15 bg-white px-5 py-6 text-[#17233B]/65">
                    Nothing recorded yet.
                </p>
            ) : (
                <ol className="mt-8 space-y-px overflow-hidden rounded-2xl border border-[#17233B]/10 bg-white">
                    {events.map((event, index) => (
                        <li
                            key={`${event.kind}-${event.step}-${event.at}-${index}`}
                            className="flex items-start gap-3 border-b border-[#17233B]/5 px-4 py-3 last:border-0"
                        >
                            <span
                                aria-hidden="true"
                                className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ${
                                    event.kind === "reached"
                                        ? "bg-emerald-100 text-emerald-700"
                                        : event.kind === "failed"
                                          ? "bg-red-100 text-red-700"
                                          : "bg-[#17233B]/5 text-[#17233B]/60"
                                }`}
                            >
                                {event.kind === "reached" ? (
                                    <FiCheck className="size-3.5" />
                                ) : event.kind === "failed" ? (
                                    <FiX className="size-3.5" />
                                ) : (
                                    <FiEye className="size-3.5" />
                                )}
                            </span>

                            <div className="min-w-0 flex-1">
                                <p className="font-medium">
                                    {stepLabel(event.step)}
                                    <span className="ml-2 text-sm font-normal text-[#17233B]/55">
                                        {event.kind === "reached"
                                            ? "done"
                                            : event.kind === "failed"
                                              ? "wouldn't save"
                                              : "opened"}
                                    </span>
                                </p>

                                {event.note && (
                                    <p className="mt-0.5 text-sm text-[#17233B]/65">{event.note}</p>
                                )}
                            </div>

                            <time
                                dateTime={event.at}
                                className="shrink-0 text-sm tabular-nums text-[#17233B]/55"
                            >
                                {when(event.at)}
                            </time>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
}

export default function BusinessTimelinePage(props: PageProps) {
    return (
        <Suspense fallback={<Loading />}>
            <TimelineContent {...props} />
        </Suspense>
    );
}
