import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/utils/supabase/server";
import { Skeleton } from "@/components/ui/skeleton";

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
    metadata: Record<string, unknown> | null;
    created_at: string;
    businesses:
    | { name: string }
    | { name: string }[]
    | null;
};

const pageSize = 25;

function LoadingState() {
    return (
        <div>
            <Skeleton className="h-9 w-36 rounded-md" />

            <div className="mt-8">
                <Skeleton className="h-5 w-40 rounded-md" />
                <Skeleton className="mt-3 h-12 w-64 rounded-md" />
                <Skeleton className="mt-3 h-5 w-96 max-w-full rounded-md" />
            </div>

            <div className="mt-8 rounded-xl border border-[#17233B]/10 bg-white p-6">
                <Skeleton className="h-10 w-full rounded-md" />
            </div>

            <div className="mt-10 space-y-4">
                {[1, 2, 3, 4].map((item) => (
                    <div
                        key={item}
                        className="rounded-xl border border-[#17233B]/10 bg-white p-6"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-3">
                                <Skeleton className="h-6 w-48 rounded-md" />
                                <Skeleton className="h-4 w-40 rounded-md" />
                            </div>

                            <Skeleton className="h-4 w-36 rounded-md" />
                        </div>

                        <Skeleton className="mt-5 h-4 w-64 rounded-md" />
                        <Skeleton className="mt-4 h-20 w-full rounded-xl" />
                    </div>
                ))}
            </div>
        </div>
    );
}

function getBusinessName(log: AuditLog) {
    if (Array.isArray(log.businesses)) {
        return log.businesses[0]?.name ?? "Platform activity";
    }

    return log.businesses?.name ?? "Platform activity";
}

function formatAction(action: string) {
    return action.replaceAll("_", " ");
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
        <div>

            <header>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    Audit log
                </h1>

                <p className="mt-3 text-[#17233B]/65">
                    Review important activity across Promotello.
                </p>
            </header>

            <Card className="mt-8 border-[#17233B]/10">
                <CardContent className="p-6">
                    <form method="get" className="flex flex-col gap-3 sm:flex-row">
                        <Input
                            name="search"
                            defaultValue={search}
                            placeholder="Search actions, for example approved"
                            className="flex-1"
                        />

                        <Button type="submit" variant="default">
                            Search
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {error ? (
                <Alert variant="destructive" className="mt-8">
                    <AlertTitle>Unable to load the audit log</AlertTitle>

                    <AlertDescription>
                        Please refresh the page and try again.
                    </AlertDescription>
                </Alert>
            ) : logs.length === 0 ? (
                <Alert className="mt-10 border-[#17233B]/10 bg-white">
                    <AlertTitle>No matching activity</AlertTitle>

                    <AlertDescription>
                        No audit log entries matched your search.
                    </AlertDescription>
                </Alert>
            ) : (
                <>
                    <section className="mt-10 space-y-4">
                        {logs.map((log) => {
                            const metadata = log.metadata ?? {};

                            return (
                                <Card
                                    key={log.id}
                                    className="border-[#17233B]/10 shadow-sm"
                                >
                                    <CardHeader>
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <CardTitle className="text-xl capitalize">
                                                        {formatAction(log.action)}
                                                    </CardTitle>

                                                    <Badge
                                                        variant="secondary"
                                                        className="capitalize"
                                                    >
                                                        {log.entity_type}
                                                    </Badge>
                                                </div>

                                                <p className="mt-2 text-sm text-[#17233B]/60">
                                                    {getBusinessName(log)}
                                                </p>
                                            </div>

                                            <time
                                                dateTime={log.created_at}
                                                className="text-sm text-[#17233B]/50"
                                            >
                                                {new Intl.DateTimeFormat("en-GB", {
                                                    dateStyle: "medium",
                                                    timeStyle: "short",
                                                }).format(new Date(log.created_at))}
                                            </time>
                                        </div>
                                    </CardHeader>

                                    <CardContent>
                                        <p className="text-xs text-[#17233B]/45">
                                            Entity ID: {log.entity_id}
                                        </p>

                                        {Object.keys(metadata).length > 0 && (
                                            <>
                                                <Separator className="my-4" />

                                                <pre className="overflow-x-auto rounded-xl bg-[#17233B]/5 p-4 text-xs leading-6 text-[#17233B]/70">
                                                    {JSON.stringify(metadata, null, 2)}
                                                </pre>
                                            </>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </section>

                    <nav className="mt-8 flex items-center justify-between">
                        {page > 1 ? (
                            <Button
                                render={
                                    <Link
                                        href={`/admin/audit-logs?page=${page - 1}&search=${encodeURIComponent(search)}`}
                                    />
                                }
                                nativeButton={false}
                                variant="outline"
                                size="sm"
                            >
                                Previous
                            </Button>
                        ) : (
                            <span />
                        )}

                        <span className="text-sm text-[#17233B]/55">
                            Page {page} of {totalPages}
                        </span>

                        {page < totalPages ? (
                            <Button
                                render={
                                    <Link
                                        href={`/admin/audit-logs?page=${page + 1}&search=${encodeURIComponent(search)}`}
                                    />
                                }
                                nativeButton={false}
                                variant="outline"
                                size="sm"
                            >
                                Next
                            </Button>
                        ) : (
                            <span />
                        )}
                    </nav>
                </>
            )}
        </div>
    );
}

export default function AuditLogsPage({ searchParams }: PageProps) {
    return (
        <Suspense fallback={<LoadingState />}>
            <AuditLogsContent searchParams={searchParams} />
        </Suspense>
    );
}