import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { FiExternalLink, FiPrinter } from "react-icons/fi";

import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { businessHasPro } from "@/lib/billing";
import { qrLink, qrSvg } from "@/lib/qr";
import { requestOrigin } from "@/lib/request-origin";
import { createClient } from "@/utils/supabase/server";
import { archiveQrCode, createQrCode } from "./actions";

type PageProps = {
    params: Promise<{ businessId: string }>;
    searchParams: Promise<{ error?: string; created?: string }>;
};

type QrCode = {
    id: string;
    code: string;
    label: string;
    created_at: string;
    offers: { title: string; discount: string } | { title: string; discount: string }[] | null;
};

const errorMessages: Record<string, string> = {
    label: "Give the code a name between 2 and 60 characters, like “Front window”.",
    limit: "The Free plan includes 1 QR code. Upgrade to Pro for a code in every spot.",
    create: "We couldn't create that code. Please try again.",
    archive: "We couldn't archive that code. Please try again.",
};

function LoadingState() {
    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-12">
            <div className="mx-auto max-w-5xl">
                <Skeleton className="h-10 w-64 rounded-md" />
                <Skeleton className="mt-8 h-40 rounded-2xl" />
                <div className="mt-8 grid gap-5 md:grid-cols-2">
                    <Skeleton className="h-72 rounded-2xl" />
                    <Skeleton className="h-72 rounded-2xl" />
                </div>
            </div>
        </main>
    );
}

function scanWindows() {
    const now = Date.now();

    return {
        since30: new Date(now - 30 * 86_400_000).toISOString(),
        since7: new Date(now - 7 * 86_400_000).toISOString(),
        today: new Date(now).toISOString().slice(0, 10),
    };
}

async function QrContent({ params, searchParams }: PageProps) {
    await connection();

    const [{ businessId }, { error, created }] = await Promise.all([params, searchParams]);
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login?next=/business/dashboard");
    }

    const { data: membership } = await supabase
        .from("business_members")
        .select("role, businesses ( name )")
        .eq("business_id", businessId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (!membership) {
        notFound();
    }

    const canManage = ["owner", "admin"].includes(membership.role);
    const { since30, since7, today } = scanWindows();

    const [{ data: codes }, { data: offers }, hasPro, origin] = await Promise.all([
        supabase
            .from("qr_codes")
            .select("id, code, label, created_at, offers ( title, discount )")
            .eq("business_id", businessId)
            .is("archived_at", null)
            .order("created_at", { ascending: true }),
        supabase
            .from("offers")
            .select("id, title")
            .eq("business_id", businessId)
            .eq("approval_status", "approved")
            .gte("expires_at", today)
            .is("plan_paused_at", null)
            .order("created_at", { ascending: false }),
        businessHasPro(supabase, businessId),
        requestOrigin(),
    ]);

    const qrCodes = (codes ?? []) as unknown as QrCode[];
    const codeIds = qrCodes.map((code) => code.id);

    // Recent scans for the 7 and 30 day counts, plus an all-time count per code.
    const [{ data: recentScans }, totals] = await Promise.all([
        codeIds.length
            ? supabase.from("qr_scans").select("qr_code_id, scanned_at").in("qr_code_id", codeIds).gte("scanned_at", since30)
            : Promise.resolve({ data: [] as { qr_code_id: string; scanned_at: string }[] }),
        Promise.all(
            codeIds.map(async (id) => {
                const { count } = await supabase
                    .from("qr_scans")
                    .select("id", { count: "exact", head: true })
                    .eq("qr_code_id", id);
                return [id, count ?? 0] as const;
            }),
        ),
    ]);

    const totalById = Object.fromEntries(totals);
    const svgs = await Promise.all(qrCodes.map((code) => qrSvg(qrLink(origin, code.code))));
    const atFreeLimit = !hasPro && qrCodes.length >= 1;

    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-10 text-[#17233B] sm:py-14">
            <div className="mx-auto max-w-5xl">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C8371D]">
                    QR posters
                </p>
                <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                    Turn passers-by into customers
                </h1>
                <p className="mt-3 max-w-2xl text-[#17233B]/65">
                    Put a QR poster in your window, by the till or on tables.
                    Customers scan it to see your offers, and you see how many
                    scans each spot gets.
                </p>

                {error && errorMessages[error] && (
                    <Alert variant="destructive" className="mt-8">
                        <AlertTitle>Something went wrong</AlertTitle>
                        <AlertDescription>{errorMessages[error]}</AlertDescription>
                    </Alert>
                )}

                {created && !error && (
                    <Alert className="mt-8 border-emerald-200 bg-emerald-50 text-emerald-900">
                        <AlertTitle>QR code created</AlertTitle>
                        <AlertDescription>
                            Print its poster below and put it where customers will see it.
                        </AlertDescription>
                    </Alert>
                )}

                {!hasPro && (
                    <Alert className="mt-8 border-[#FF593F]/30 bg-white">
                        <AlertTitle>Free plan · {qrCodes.length} of 1 QR code used</AlertTitle>
                        <AlertDescription>
                            <p>Upgrade to Pro for a code in every spot, and compare which placements bring people in.</p>
                            <Button
                                render={<Link href={`/business/${businessId}/billing`} />}
                                nativeButton={false}
                                size="sm"
                                className="mt-3 bg-[#C8371D] text-white hover:bg-[#C8371D]/90"
                            >
                                Upgrade to Pro
                            </Button>
                        </AlertDescription>
                    </Alert>
                )}

                {canManage && !atFreeLimit && (
                    <Card className="mt-8 border-[#17233B]/10">
                        <CardHeader>
                            <CardTitle>Create a QR code</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form action={createQrCode} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                                <input type="hidden" name="businessId" value={businessId} />

                                <div className="space-y-2">
                                    <Label htmlFor="qr-label">Where will it go?</Label>
                                    <Input id="qr-label" name="label" required minLength={2} maxLength={60} placeholder="Front window" />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="qr-target">What should it open?</Label>
                                    <select
                                        id="qr-target"
                                        name="target"
                                        defaultValue="business"
                                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                                    >
                                        <option value="business">Your business page</option>
                                        {(offers ?? []).map((offer) => (
                                            <option key={offer.id} value={offer.id}>
                                                Offer: {offer.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <SubmitButton pendingLabel="Creating…" className="bg-[#C8371D] text-white hover:bg-[#C8371D]/90">
                                    Create QR code
                                </SubmitButton>
                            </form>
                        </CardContent>
                    </Card>
                )}

                <section className="mt-10">
                    {qrCodes.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-[#17233B]/20 bg-white px-6 py-14 text-center">
                            <h2 className="text-xl font-semibold">No QR codes yet</h2>
                            <p className="mx-auto mt-2 max-w-md text-[#17233B]/65">
                                Create your first code above, print the poster and put it in your window.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-5 md:grid-cols-2">
                            {qrCodes.map((code, index) => {
                                const offer = Array.isArray(code.offers) ? code.offers[0] : code.offers;
                                const scans = (recentScans ?? []).filter((scan) => scan.qr_code_id === code.id);
                                const last7 = scans.filter((scan) => scan.scanned_at >= since7).length;
                                const link = qrLink(origin, code.code);

                                return (
                                    <Card key={code.id} className="border-[#17233B]/10">
                                        <CardContent className="flex flex-col gap-5 p-6 sm:flex-row">
                                            <div
                                                className="size-32 shrink-0 rounded-xl border border-[#17233B]/10 bg-white p-2 [&>svg]:h-full [&>svg]:w-full"
                                                dangerouslySetInnerHTML={{ __html: svgs[index] }}
                                            />

                                            <div className="min-w-0 flex-1">
                                                <h2 className="text-lg font-semibold">{code.label}</h2>
                                                <p className="mt-1 text-sm text-[#17233B]/70">
                                                    Opens {offer ? `“${offer.title}”` : "your business page"}
                                                </p>
                                                <a
                                                    href={link}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="mt-1 inline-flex items-center gap-1 text-xs text-[#17233B]/65 hover:text-[#C8371D]"
                                                >
                                                    {link.replace(/^https?:\/\//, "")}
                                                    <FiExternalLink aria-hidden="true" className="size-3" />
                                                </a>

                                                <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                                                    {[
                                                        ["7 days", last7],
                                                        ["30 days", scans.length],
                                                        ["All time", totalById[code.id] ?? 0],
                                                    ].map(([label, value]) => (
                                                        <div key={label} className="rounded-lg bg-[#FFF8F0] px-2 py-2">
                                                            <dt className="text-[11px] text-[#17233B]/70">{label}</dt>
                                                            <dd className="text-lg font-semibold">{value}</dd>
                                                        </div>
                                                    ))}
                                                </dl>

                                                <div className="mt-4 flex flex-wrap gap-2">
                                                    <Button
                                                        render={<Link href={`/poster/${code.id}`} target="_blank" />}
                                                        nativeButton={false}
                                                        size="sm"
                                                    >
                                                        <FiPrinter aria-hidden="true" />
                                                        Print poster
                                                    </Button>

                                                    {canManage && (
                                                        <form action={archiveQrCode}>
                                                            <input type="hidden" name="businessId" value={businessId} />
                                                            <input type="hidden" name="codeId" value={code.id} />
                                                            <Button type="submit" variant="outline" size="sm">
                                                                Archive
                                                            </Button>
                                                        </form>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}

export default function QrPage(props: PageProps) {
    return (
        <Suspense fallback={<LoadingState />}>
            <QrContent {...props} />
        </Suspense>
    );
}
