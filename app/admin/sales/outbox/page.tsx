import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { OUTREACH_FROM, outreachSender } from "@/lib/outreach-queue";
import { createClient } from "@/utils/supabase/server";
import { cancelOutreach, sendOutreach } from "../actions";

export const metadata: Metadata = { title: "Outbox", robots: { index: false } };

type PageProps = { searchParams: Promise<{ error?: string }> };

async function Outbox({ searchParams }: PageProps) {
    await connection();

    const supabase = await createClient();
    const { data: isAdmin } = await supabase.rpc("is_platform_admin");

    if (!isAdmin) redirect("/admin");

    const params = await searchParams;
    const sender = outreachSender();

    const { data: queued } = await supabase
        .from("outreach_messages")
        .select("id, kind, to_email, subject, body, queued_at, leads ( id, name )")
        .eq("status", "queued")
        .order("queued_at");

    const { data: recent } = await supabase
        .from("outreach_messages")
        .select("id, kind, to_email, sent_at, leads ( name )")
        .eq("status", "sent")
        .order("sent_at", { ascending: false })
        .limit(10);

    return (
        <div className="text-[#17233B]">
            <Button render={<Link href="/admin/sales" />} nativeButton={false} variant="ghost" size="sm">
                ← The pipeline
            </Button>

            <h1 className="mt-6 text-3xl font-semibold tracking-tight">The outbox</h1>

            <p className="mt-3 max-w-2xl leading-7 text-[#17233B]/65">
                Every one of these was drafted from a preview and is waiting for you
                to read it. Nothing goes until you press send.
            </p>

            {!sender && (
                <Alert className="mt-6 border-amber-200 bg-amber-50">
                    <AlertTitle>Outreach has no sender yet</AlertTitle>
                    <AlertDescription>
                        Set <code>{OUTREACH_FROM}</code> to an address on its own
                        subdomain, verified in Resend. Cold email is kept off the
                        address that carries vouchers and receipts on purpose: a
                        complaint against outreach should not be able to stop a
                        customer getting what they claimed. Drafting works without
                        it; sending does not.
                    </AlertDescription>
                </Alert>
            )}

            {params.error === "no_sender" && (
                <Alert variant="destructive" className="mt-6">
                    <AlertTitle>Nothing was sent</AlertTitle>
                    <AlertDescription>
                        There is no outreach sender configured, so the message is still
                        waiting.
                    </AlertDescription>
                </Alert>
            )}

            {(queued ?? []).length === 0 ? (
                <Card className="mt-8 border-[#17233B]/10">
                    <CardContent className="p-10 text-center">
                        <h2 className="text-lg font-semibold">Nothing waiting</h2>
                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#17233B]/65">
                            Queue an email from a lead once it has an address, a preview,
                            and a company number.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="mt-8 space-y-4">
                    {(queued ?? []).map((message) => {
                        const lead = Array.isArray(message.leads) ? message.leads[0] : message.leads;

                        return (
                            <Card key={message.id} className="border-[#17233B]/10">
                                <CardHeader className="pb-3">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <CardTitle className="text-base">
                                                {lead?.name ?? "A lead"}
                                                <span className="ml-2 text-xs font-normal text-[#17233B]/55">
                                                    {message.kind === "first" ? "first email" : "follow-up"}
                                                </span>
                                            </CardTitle>
                                            <p className="mt-1 text-xs text-[#17233B]/60">to {message.to_email}</p>
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent>
                                    <p className="text-sm font-medium">{message.subject}</p>

                                    {/* The whole thing, not a preview of it: the point
                                        of the queue is that somebody read what went. */}
                                    <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-[#FFF8F0] p-4 text-xs leading-6 text-[#17233B]/80">
                                        {message.body}
                                    </pre>

                                    <div className="mt-4 flex flex-wrap items-center gap-3">
                                        <form action={sendOutreach}>
                                            <input type="hidden" name="messageId" value={message.id} />
                                            <Button type="submit" size="sm" disabled={!sender}>
                                                Send it
                                            </Button>
                                        </form>

                                        <form action={cancelOutreach}>
                                            <input type="hidden" name="messageId" value={message.id} />
                                            <Button type="submit" size="sm" variant="outline">
                                                Cancel
                                            </Button>
                                        </form>

                                        {lead && (
                                            <Link
                                                href={`/admin/sales/${lead.id}`}
                                                className="text-sm text-[#17233B]/65 underline underline-offset-4"
                                            >
                                                Open the lead
                                            </Link>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {(recent ?? []).length > 0 && (
                <section className="mt-12">
                    <h2 className="text-lg font-semibold">Lately sent</h2>

                    <div className="mt-4 space-y-2 text-sm">
                        {(recent ?? []).map((message) => {
                            const lead = Array.isArray(message.leads) ? message.leads[0] : message.leads;

                            return (
                                <p key={message.id} className="text-[#17233B]/70">
                                    {lead?.name ?? "A lead"} · {message.kind === "first" ? "first email" : "follow-up"} · {message.to_email}
                                </p>
                            );
                        })}
                    </div>
                </section>
            )}
        </div>
    );
}

export default function OutboxPage(props: PageProps) {
    return (
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <Outbox {...props} />
        </Suspense>
    );
}
