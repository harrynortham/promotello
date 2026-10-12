import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { createClient } from "@/utils/supabase/server";

type AuditLog = {
    id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    metadata: Record<string, unknown>;
    created_at: string;
    businesses:
    | {
        name: string;
    }
    | {
        name: string;
    }[]
    | null;
};

function LoadingState() {
    return (
        <main className="mt-8">
            <div className="h-10 w-64 animate-pulse rounded bg-[#17233B]/10" />
            <div className="mt-8 h-64 animate-pulse rounded-3xl bg-white" />
        </main>
    );
}

async function AuditLogsContent() {
    await connection();

    const supabase = await createClient();

    const { data, error } = await supabase
        .from("audit_logs")
        .select(
            `
        id,
        action,
        entity_type,
        entity_id,
        metadata,
        created_at,
        businesses (
          name
        )
      `,
        )
        .order("created_at", { ascending: false })
        .limit(100);

    const logs = (data ?? []) as AuditLog[];

    return (
        <main className="mt-8">
            <Link
                href="/admin"
                className="text-sm font-semibold text-[#FF593F]"
            >
                ← Back to admin
            </Link>

            <header className="mt-8">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                    Administration
                </p>

                <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                    Audit log
                </h1>

                <p className="mt-3 text-[#17233B]/65">
                    Review important activity across Promotello.
                </p>
            </header>

            {error ? (
                <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
                    We couldn’t load the audit log.
                </div>
            ) : logs.length === 0 ? (
                <section className="mt-10 rounded-3xl bg-white p-10 text-center shadow-sm">
                    <h2 className="text-2xl font-semibold">No activity yet</h2>
                </section>
            ) : (
                <section className="mt-10 space-y-4">
                    {logs.map((log) => {
                        const business = Array.isArray(log.businesses)
                            ? log.businesses[0]
                            : log.businesses;

                        return (
                            <article
                                key={log.id}
                                className="rounded-2xl bg-white p-5 shadow-sm"
                            >
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <p className="font-semibold capitalize">
                                            {log.action.replaceAll("_", " ")}
                                        </p>

                                        <p className="mt-1 text-sm text-[#17233B]/60">
                                            {business?.name ?? "Platform activity"}
                                        </p>
                                    </div>

                                    <time className="text-sm text-[#17233B]/50">
                                        {new Intl.DateTimeFormat("en-GB", {
                                            dateStyle: "medium",
                                            timeStyle: "short",
                                        }).format(new Date(log.created_at))}
                                    </time>
                                </div>

                                <p className="mt-4 text-xs text-[#17233B]/45">
                                    {log.entity_type} · {log.entity_id}
                                </p>

                                {Object.keys(log.metadata).length > 0 && (
                                    <pre className="mt-4 overflow-x-auto rounded-xl bg-[#17233B]/5 p-4 text-xs text-[#17233B]/70">
                                        {JSON.stringify(log.metadata, null, 2)}
                                    </pre>
                                )}
                            </article>
                        );
                    })}
                </section>
            )}
        </main>
    );
}

export default function AuditLogsPage() {
    return (
        <Suspense fallback={<LoadingState />}>
            <AuditLogsContent />
        </Suspense>
    );
}