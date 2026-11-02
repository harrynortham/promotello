import { Suspense } from "react";
import { connection } from "next/server";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/utils/supabase/server";
import { setFeedbackStatus } from "./actions";

type FeedbackRow = {
    id: string;
    kind: string;
    message: string;
    page: string | null;
    status: string;
    created_at: string;
    businesses: { name: string } | null;
};

const kindLabels: Record<string, string> = {
    idea: "Idea",
    problem: "Problem",
    other: "Other",
};

// What to offer next, given where it is now.
const nextStatuses: Record<string, { value: string; label: string }[]> = {
    new: [
        { value: "planned", label: "Planned" },
        { value: "declined", label: "Not doing" },
    ],
    planned: [
        { value: "done", label: "Done" },
        { value: "declined", label: "Not doing" },
    ],
    done: [{ value: "planned", label: "Back to planned" }],
    declined: [{ value: "planned", label: "Planned after all" }],
};

function formatDate(value: string) {
    return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "Europe/London",
    }).format(new Date(value));
}

async function FeedbackList() {
    await connection();

    const supabase = await createClient();
    const { data } = await supabase
        .from("business_feedback")
        .select("id, kind, message, page, status, created_at, businesses ( name )")
        .order("created_at", { ascending: false })
        .limit(200);

    const feedback = (data ?? []) as unknown as FeedbackRow[];

    if (feedback.length === 0) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <p className="font-medium text-[#17233B]">Nothing yet</p>
                    <p className="mt-2 text-sm text-[#17233B]/65">
                        Feedback businesses send from their dashboard arrives here.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <ul className="space-y-4">
            {feedback.map((item) => (
                <li key={item.id}>
                    <Card>
                        <CardContent className="py-5">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={item.status === "new" ? "default" : "secondary"}>
                                    {kindLabels[item.kind] ?? item.kind}
                                </Badge>
                                <span className="text-sm font-medium text-[#17233B]">
                                    {item.businesses?.name ?? "A business"}
                                </span>
                                <span className="text-sm text-[#17233B]/55">
                                    {formatDate(item.created_at)}
                                    {item.page && ` · ${item.page}`}
                                </span>
                                {item.status !== "new" && (
                                    <Badge variant="outline" className="ml-auto">
                                        {item.status}
                                    </Badge>
                                )}
                            </div>

                            <p className="mt-3 whitespace-pre-wrap text-[#17233B]/80">{item.message}</p>

                            <div className="mt-4 flex flex-wrap gap-2">
                                {(nextStatuses[item.status] ?? []).map((option) => (
                                    <form key={option.value} action={setFeedbackStatus}>
                                        <input type="hidden" name="id" value={item.id} />
                                        <input type="hidden" name="status" value={option.value} />
                                        <Button type="submit" variant="outline" size="sm">
                                            {option.label}
                                        </Button>
                                    </form>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </li>
            ))}
        </ul>
    );
}

export default function AdminFeedbackPage() {
    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Feedback</h1>
                <p className="mt-3 max-w-2xl text-[#17233B]/65">
                    What businesses have asked for from their dashboard, newest first. Mark one planned
                    once you intend to build it, so the list stays what is still undecided.
                </p>
            </header>

            <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
                <FeedbackList />
            </Suspense>
        </div>
    );
}
