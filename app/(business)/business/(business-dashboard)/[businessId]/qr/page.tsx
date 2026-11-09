import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { FiDownload, FiExternalLink, FiPlus, FiPrinter } from "react-icons/fi";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { businessHasPro } from "@/lib/billing";
import { qrLink, qrSvg } from "@/lib/qr";
import { requestOrigin } from "@/lib/request-origin";
import { createClient } from "@/utils/supabase/server";
import { qrTarget, todayInUk, type QrLoyaltyProgram, type QrOffer } from "@/lib/qr-target";
import { restoreQrCode } from "./actions";
import { DeleteQrCode } from "./delete-qr-code";
import { PointQrCode } from "./point-qr-code";
import { QrHowItWorks } from "./how-it-works";
import { PosterDesigner } from "./poster-designer";

type PageProps = {
    params: Promise<{ businessId: string }>;
    searchParams: Promise<{ error?: string; created?: string; pointed?: string; restored?: string }>;
};

type QrCode = {
    id: string;
    code: string;
    label: string;
    created_at: string;
    archived_at: string | null;
    former_target: string | null;
    loyalty_program_id: string | null;
    offers: QrOffer | QrOffer[] | null;
    loyalty_programs: QrLoyaltyProgram | QrLoyaltyProgram[] | null;
};

// PostgREST gives an embedded row either way round depending on the join.
function one<T>(value: T | T[] | null | undefined): T | null {
    if (Array.isArray(value)) return value[0] ?? null;
    return value ?? null;
}

const errorMessages: Record<string, string> = {
    label: "Give the code a name between 2 and 60 characters, like “Front window”.",
    limit: "The Free plan includes 1 QR code. Upgrade to Pro for a code in every spot.",
    approval: "A QR code can be made once your page is approved. We check every new business, usually the same day.",
    create: "We couldn't create that code. Please try again.",
    delete: "We couldn't retire that code. Please try again.",
    point: "We couldn't point that code somewhere else. Please try again.",
    restore: "We couldn't bring that code back. Please try again.",
};

function LoadingState() {
    return (
        <div>
            <div>
                <Skeleton className="h-10 w-64 rounded-lg" />
                <Skeleton className="mt-8 h-40 rounded-xl" />
                <div className="mt-8 grid gap-5 md:grid-cols-2">
                    <Skeleton className="h-72 rounded-xl" />
                    <Skeleton className="h-72 rounded-xl" />
                </div>
            </div>
        </div>
    );
}

function scanWindows() {
    const now = Date.now();

    return {
        since30: new Date(now - 30 * 86_400_000).toISOString(),
        since7: new Date(now - 7 * 86_400_000).toISOString(),
        today: todayInUk(new Date(now)),
    };
}

async function QrContent({ params, searchParams }: PageProps) {
    await connection();

    const [{ businessId }, { error, created, pointed, restored }] = await Promise.all([params, searchParams]);
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

    const [{ data: codes }, { data: offers }, { data: business }, { data: loyalty }, hasPro, origin] = await Promise.all([
        supabase
            .from("qr_codes")
            .select(
                "id, code, label, created_at, archived_at, former_target, loyalty_program_id, offers ( title, discount, approval_status, expires_at, plan_paused_at ), loyalty_programs ( name, is_active, closed_at )",
            )
            .eq("business_id", businessId)
            // Retired codes come too: the poster is still in a window, so
            // it still resolves and still counts, and the business is the
            // only one who can take it down.
            .order("created_at", { ascending: true }),
        supabase
            .from("offers")
            .select("id, title, discount, description, approval_status")
            .eq("business_id", businessId)
            .in("approval_status", ["approved", "pending"])
            .gte("expires_at", today)
            .is("plan_paused_at", null)
            .order("created_at", { ascending: false }),
        supabase
            .from("businesses")
            .select("name, slug, logo_url, approval_status, business_locations ( region, city )")
            .eq("id", businessId)
            .maybeSingle(),
        // The card being handed out, for a poster by the till.
        supabase
            .from("loyalty_programs")
            .select("id, name, stamps_required, reward, terms")
            .eq("business_id", businessId)
            .eq("is_active", true)
            .is("closed_at", null)
            .maybeSingle(),
        businessHasPro(supabase, businessId),
        requestOrigin(),
    ]);

    const allCodes = (codes ?? []) as unknown as QrCode[];
    const qrCodes = allCodes.filter((code) => !code.archived_at);
    const codeIds = allCodes.map((code) => code.id);

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

    // A retired code nobody scans is simply gone. One that is still being
    // scanned is a poster someone forgot to take down, which is worth saying.
    const retiredInUse = allCodes.filter(
        (code) =>
            code.archived_at &&
            (recentScans ?? []).some((scan) => scan.qr_code_id === code.id),
    );

    const totalById = Object.fromEntries(totals);
    const svgs = await Promise.all(qrCodes.map((code) => qrSvg(qrLink(origin, code.code))));
    const atFreeLimit = !hasPro && qrCodes.length >= 1;

    // The poster preview: their own branding, their newest offer, and a
    // code that opens their page, so it is the real thing in miniature.
    const location = Array.isArray(business?.business_locations)
        ? business.business_locations[0]
        : business?.business_locations;
    // A code can only be made once the business is live, and can only
    // point at an offer that is. Both are shown either way, so it is
    // clear what is coming rather than simply missing.
    const isLive = business?.approval_status === "approved";
    const previewLink = business?.slug ? `${origin}/businesses/${business.slug}` : origin;
    const previewSvg = await qrSvg(previewLink);

    return (
        <div className="text-[#17233B]">
            <div>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                            QR posters
                        </p>
                        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                            Turn passers-by into customers
                        </h1>
                        <p className="mt-3 max-w-2xl text-[#17233B]/65">
                            Put a QR poster in your window, by the till or on
                            tables. Customers scan it to see your offers, and
                            you see how many scans each spot gets.
                        </p>
                    </div>

                    <div className="shrink-0">
                        <QrHowItWorks />
                    </div>
                </div>

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

                {pointed && !error && (
                    <Alert className="mt-8 border-emerald-200 bg-emerald-50 text-emerald-900">
                        <AlertTitle>That poster works again</AlertTitle>
                        <AlertDescription>
                            The code now opens what you picked. Nothing to reprint &mdash; the
                            poster in your window is already pointing at it.
                        </AlertDescription>
                    </Alert>
                )}

                {restored && !error && (
                    <Alert className="mt-8 border-emerald-200 bg-emerald-50 text-emerald-900">
                        <AlertTitle>Poster brought back</AlertTitle>
                        <AlertDescription>
                            It is back in your posters below, and you can point it at
                            something else from there.
                        </AlertDescription>
                    </Alert>
                )}

                {!hasPro && (
                    <Alert className="mt-8 border-[#FF593F]/30 bg-[#FF593F]/5">
                        <AlertTitle>Free plan · {qrCodes.length} of 1 QR code used</AlertTitle>
                        <AlertDescription>
                            Get a code in every spot, and compare which
                            placements bring people in.{" "}
                            <Link
                                href={`/business/${businessId}/billing`}
                                className="font-medium text-[#FF593F]"
                            >
                                Upgrade to Pro
                            </Link>
                        </AlertDescription>
                    </Alert>
                )}

                {canManage && !isLive && (
                    <Alert className="mt-8 border-amber-200 bg-amber-50">
                        <AlertTitle>Your page is still being checked</AlertTitle>
                        <AlertDescription>
                            A QR code sends people to your page, so it can be
                            made once that page is live — usually the same
                            day. We will email you as soon as it is, and
                            everything here is waiting for you.
                        </AlertDescription>
                    </Alert>
                )}

                {/* overflow-visible: a card clips its contents by default,
                    and a clipped parent is where a sticky child stops
                    sticking. */}
                {/* The first code is made here, because there is nothing
                    else on the page to look at. After that the page is the
                    list, and the form has /qr/new to itself. */}
                {canManage && isLive && !atFreeLimit && qrCodes.length === 0 && (
                    <Card id="create-qr" className="mt-8 overflow-visible scroll-mt-8 border-[#17233B]/10">
                        <CardHeader>
                            <CardTitle>Create a QR code</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <PosterDesigner
                                businessId={businessId}
                                businessName={business?.name ?? "Your business"}
                                place={location?.region || location?.city}
                                logoUrl={business?.logo_url}
                                offers={offers ?? []}
                                loyalty={loyalty}
                                previewSvg={previewSvg}
                                previewLink={previewLink}
                            />
                        </CardContent>
                    </Card>
                )}

                <section className="mt-10">
                    {qrCodes.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-[#17233B]/20 bg-white px-6 py-14 text-center">
                            <h2 className="text-xl font-semibold">No QR codes yet</h2>
                            <p className="mx-auto mt-2 max-w-md text-[#17233B]/65">
                                {isLive
                                    ? "Create your first code above, print the poster and put it in your window."
                                    : "Once your page is approved you can create one here, print the poster and put it in your window."}
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-5 md:grid-cols-2">
                            {canManage && isLive && (
                                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#17233B]/20 bg-white p-8 text-center">
                                    <span className="flex size-12 items-center justify-center rounded-full bg-[#FF593F]/10 text-[#FF593F]">
                                        <FiPlus aria-hidden="true" className="size-5" />
                                    </span>

                                    {atFreeLimit ? (
                                        <>
                                            <h2 className="mt-4 text-lg font-semibold">
                                                Add another QR code
                                            </h2>

                                            <p className="mt-2 max-w-xs text-sm leading-6 text-[#17233B]/65">
                                                The Free plan includes one code. Pro gives
                                                you a code for every spot, so you can see
                                                which placement brings people in.
                                            </p>

                                            <Button
                                                render={<Link href={`/business/${businessId}/billing`} />}
                                                nativeButton={false}
                                                size="lg"
                                                className="mt-5 bg-[#FF593F] text-white hover:bg-[#FF593F]/90"
                                            >
                                                Upgrade to Pro
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <h2 className="mt-4 text-lg font-semibold">
                                                Add another QR code
                                            </h2>

                                            <p className="mt-2 max-w-xs text-sm leading-6 text-[#17233B]/65">
                                                One per spot: your window, the till, the
                                                tables. Each one counts its own scans.
                                            </p>

                                            <Button
                                                render={<Link href={`/business/${businessId}/qr/new`} />}
                                                nativeButton={false}
                                                size="lg"
                                                className="mt-5 bg-[#FF593F] text-white hover:bg-[#FF593F]/90"
                                            >
                                                Create a QR code
                                            </Button>
                                        </>
                                    )}
                                </div>
                            )}
                            {qrCodes.map((code, index) => {
                                const target = qrTarget(
                                    {
                                        former_target: code.former_target,
                                        offers: one(code.offers),
                                        loyalty_programs: one(code.loyalty_programs),
                                    },
                                    today,
                                );
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
                                                    Opens{" "}
                                                    {target.kind === "offer" && target.name
                                                        ? `“${target.name}”`
                                                        : target.kind === "card"
                                                            ? "your loyalty card"
                                                            : "your business page"}
                                                </p>

                                                {/* The poster is already printed and already up. It
                                                    can't be fixed by changing the poster, so it is
                                                    fixed by changing what the code opens. */}
                                                {!target.live && (
                                                    <div className="mt-3 rounded-lg border border-[#FF593F]/30 bg-[#FFF4E8] p-3">
                                                        <p className="text-sm font-medium text-[#17233B]">
                                                            {target.problem}
                                                        </p>
                                                        <p className="mt-1 text-xs leading-5 text-[#17233B]/70">
                                                            Nobody hits a dead end: a scan lands on your
                                                            business page with a note that the poster is out
                                                            of date.{" "}
                                                            {scans.length > 0
                                                                ? `It has been scanned ${scans.length} ${scans.length === 1 ? "time" : "times"} in the last 30 days.`
                                                                : "It hasn't been scanned in the last 30 days."}{" "}
                                                            Point it at something else and the poster works
                                                            again, with no reprint.
                                                        </p>

                                                        {canManage && (
                                                            <PointQrCode
                                                                businessId={businessId}
                                                                codeId={code.id}
                                                                offers={offers ?? []}
                                                                loyalty={loyalty}
                                                            />
                                                        )}
                                                    </div>
                                                )}
                                                <a
                                                    href={link}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="mt-1 inline-flex items-center gap-1 text-xs text-[#17233B]/65 hover:text-[#FF593F]"
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

                                                    {/* The code on its own, for a menu, a leaflet or a
                                                        sticker. A plain link, so the browser saves the
                                                        file rather than opening it. */}
                                                    <Button
                                                        render={
                                                            <a
                                                                href={`/business/${businessId}/qr/${code.id}/image`}
                                                                download
                                                            />
                                                        }
                                                        nativeButton={false}
                                                        variant="outline"
                                                        size="sm"
                                                    >
                                                        <FiDownload aria-hidden="true" />
                                                        Download code
                                                    </Button>

                                                    <Button
                                                        render={
                                                            <a
                                                                href={`/business/${businessId}/qr/${code.id}/image?format=svg`}
                                                                download
                                                            />
                                                        }
                                                        nativeButton={false}
                                                        variant="ghost"
                                                        size="sm"
                                                        title="Vector file, for a print shop"
                                                    >
                                                        SVG
                                                    </Button>

                                                    {canManage && (
                                                        <DeleteQrCode
                                                            businessId={businessId}
                                                            codeId={code.id}
                                                            label={code.label}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}

                        </div>
                    )}

                    {retiredInUse.length > 0 && (
                        <div className="mt-12">
                            <h2 className="text-xl font-semibold tracking-tight">
                                Retired posters still being scanned
                            </h2>
                            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#17233B]/70">
                                You retired {retiredInUse.length === 1 ? "this code" : "these codes"}, but
                                {retiredInUse.length === 1 ? " someone is" : " people are"} still scanning
                                {retiredInUse.length === 1 ? " it" : " them"}, so the poster is still
                                somewhere. Scans land on your business page. Bring it back to point it at
                                something new, or go and take it down.
                            </p>

                            <div className="mt-4 grid gap-4">
                                {retiredInUse.map((code) => {
                                    const scans = (recentScans ?? []).filter(
                                        (scan) => scan.qr_code_id === code.id,
                                    );

                                    return (
                                        <Card key={code.id} className="border-[#17233B]/10">
                                            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="min-w-0">
                                                    <h3 className="font-semibold">{code.label}</h3>
                                                    <p className="mt-1 text-sm text-[#17233B]/70">
                                                        {scans.length} {scans.length === 1 ? "scan" : "scans"} in the
                                                        last 30 days
                                                        {code.former_target ? ` · printed for “${code.former_target}”` : ""}
                                                    </p>
                                                </div>

                                                {canManage && (
                                                    <form action={restoreQrCode} className="shrink-0">
                                                        <input type="hidden" name="businessId" value={businessId} />
                                                        <input type="hidden" name="codeId" value={code.id} />

                                                        <Button type="submit" size="sm" variant="outline">
                                                            Bring it back
                                                        </Button>
                                                    </form>
                                                )}
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

export default function QrPage(props: PageProps) {
    return (
        <Suspense fallback={<LoadingState />}>
            <QrContent {...props} />
        </Suspense>
    );
}
