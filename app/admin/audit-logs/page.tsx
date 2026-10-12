import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { createClient } from "@/utils/supabase/server";

type PageProps = {
    searchParams: Promise<{
        page?: string;
        search?: string;
    }>;
};

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

const pageSize = 25;

function LoadingState() {
    return (
        <main className="mt-8">
            <div className="h-10 w-64 animate-pulse rounded bg-[#17233B]/10" />
            <div className="mt-8 h-64 animate-pulse rounded-3xl bg-white" />
        </main>
    );
}

async function AuditLogsContent({ searchParams }: PageProps) {
    await connection();

    const params = await searchParams;
    const search = params.search?.trim() ?? "";
    const requestedPage = Number(params.page ?? "1");
    const page =
        Number.isInteger(requestedPage) && requestedPage > 0
            ? requestedPage
            : 1;

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const supabase = await createClient();

    let query = supabase
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
            { count: "exact" },
        )
        .order("created_at", { ascending: false })
        .range(from, to);

    if (search) {
        query = query.ilike("action", `%${search}%`);
    }

    const { data, error, count } = await query;

    const logs = (data ?? []) as AuditLog[];
    const totalPages = Math.max(1, Math.ceil((count ?? 0) / pageSize));

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

            <form
                method="get"
                className="mt-8 flex flex-col gap-3 sm:flex-row"
            >
                <input
                    name="search"
                    defaultValue={search}
                    placeholder="Search actions, e.g. approved"
                    className="flex-1 rounded-xl border border-[#17233B]/15 bg-white px-4 py-3 text-sm outline-none focus:border-[#FF593F]"
                />

                <button
                    type="submit"
                    className="rounded-xl bg-[#FF593F] px-5 py-3 text-sm font-semibold transition hover:bg-[#E94D36]"
                >
                    Search
                </button>
            </form>

            {error ? (
                <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
                    We couldn’t load the audit log.
                </div>
            ) : logs.length === 0 ? (
                <section className="mt-10 rounded-3xl bg-white p-10 text-center shadow-sm">
                    <h2 className="text-2xl font-semibold">
                        No matching activity
                    </h2>
                </section>
            ) : (
                <>
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

                    <nav className="mt-8 flex items-center justify-between">
                        {page > 1 ? (
                            <Link
                                href={`/admin/audit-logs?page=${page - 1}&search=${encodeURIComponent(search)}`}
                                className="rounded-xl border border-[#17233B]/15 px-4 py-2 text-sm font-semibold hover:bg-[#17233B]/5"
                            >
                                Previous
                            </Link>
                        ) : (
                            <span />
                        )}

                        <span className="text-sm text-[#17233B]/55">
                            Page {page} of {totalPages}
                        </span>

                        {page < totalPages ? (
                            <Link
                                href={`/admin/audit-logs?page=${page + 1}&search=${encodeURIComponent(search)}`}
                                className="rounded-xl border border-[#17233B]/15 px-4 py-2 text-sm font-semibold hover:bg-[#17233B]/5"
                            >
                                Next
                            </Link>
                        ) : (
                            <span />
                        )}
                    </nav>
                </>
            )}
        </main>
    );
}

export default function AuditLogsPage({ searchParams }: PageProps) {
    return (
        <Suspense fallback={<LoadingState />}>
            <AuditLogsContent searchParams={searchParams} />
        </Suspense>
    );
}