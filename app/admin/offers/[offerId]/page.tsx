import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { FiArrowLeft, FiExternalLink } from "react-icons/fi";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { storedImage } from "@/lib/images";
import { isOfferKind, offerKind } from "@/lib/offer-kinds";
import { OfferKindForm } from "./offer-kind-form";

// One offer, everything we know about it: what was submitted, what has
// happened to it since, and what customers have done with it. For when a
// business asks a question about theirs.
//
// Read with the service key rather than the reader's own, because an
// admin has no row-level access to another business's claims or audit
// trail. The check above it is this page's own, not the layout's: a page
// that reads with the service key should say who it lets in.

type PageProps = { params: Promise<{ offerId: string }> };

const statusLabels: Record<string, string> = {
    pending: "Waiting for review",
    approved: "Live",
    rejected: "Rejected",
    suspended: "Suspended",
};

const statusStyles: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 hover:bg-amber-100",
    approved: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
    rejected: "bg-red-100 text-red-800 hover:bg-red-100",
    suspended: "bg-red-100 text-red-800 hover:bg-red-100",
};

const actionNames: Record<string, string> = {
    offer_created: "Submitted",
    offer_approved: "Approved",
    offer_rejected: "Rejected",
    offer_suspended: "Suspended",
};

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function when(value: string | null | undefined) {
    if (!value) return "—";

    return new Date(value).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function onlyDate(value: string | null | undefined) {
    if (!value) return "—";

    return new Date(value).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

function Facts({ rows }: { rows: [string, React.ReactNode][] }) {
    return (
        <dl className="space-y-3 text-sm">
            {rows.map(([label, value]) => (
                <div key={label} className="flex flex-wrap items-baseline justify-between gap-3">
                    <dt className="text-[#17233B]/65">{label}</dt>
                    <dd className="text-right font-medium">
                        {value === null || value === undefined || value === "" ? "—" : value}
                    </dd>
                </div>
            ))}
        </dl>
    );
}

async function Overview({ params }: PageProps) {
    await connection();

    const { offerId } = await params;

    const reader = await createClient();
    const { data: isAdmin } = await reader.rpc("is_platform_admin");

    if (!isAdmin) {
        redirect("/dashboard");
    }

    const admin = createAdminClient();

    const { data: offer } = await admin
        .from("offers")
        .select(
            `
                id, slug, public_id, title, discount, description, availability, terms,
                kind, kind_value, kind_quantity, kind_item,
                category, approval_status, created_at, updated_at, expires_at,
                max_redemptions, redemption_count, image_url, plan_paused_at,
                schedule_days, schedule_start, schedule_end, created_by,
                businesses ( id, name, slug, approval_status )
            `,
        )
        .eq("id", offerId)
        .maybeSingle();

    const business = Array.isArray(offer?.businesses) ? offer.businesses[0] : offer?.businesses;

    if (!offer || !business) {
        notFound();
    }

    const [claims, views, emails, codes, history] = await Promise.all([
        admin
            .from("offer_redemptions")
            .select("redemption_code, created_at, used_at")
            .eq("offer_id", offerId)
            .order("created_at", { ascending: false }),
        admin.from("page_views").select("id", { count: "exact", head: true }).eq("offer_id", offerId),
        admin.from("offer_email_sends").select("offer_id", { count: "exact", head: true }).eq("offer_id", offerId),
        admin.from("qr_codes").select("id, label, archived_at").eq("offer_id", offerId),
        admin
            .from("audit_logs")
            .select("action, created_at, actor_user_id, metadata")
            .eq("entity_type", "offer")
            .eq("entity_id", offerId)
            .order("created_at", { ascending: false }),
    ]);

    const claimed = claims.data ?? [];
    const used = claimed.filter((claim) => claim.used_at).length;
    const liveCodes = (codes.data ?? []).filter((code) => !code.archived_at);

    // Who submitted it, and who reviewed it. A handful of ids at most, so
    // they are looked up one by one rather than listing every user.
    const actorIds = [
        ...new Set([offer.created_by, ...(history.data ?? []).map((entry) => entry.actor_user_id)]),
    ].filter((id): id is string => Boolean(id));

    const actors = new Map(
        await Promise.all(
            actorIds.map(async (id) => {
                const { data } = await admin.auth.admin.getUserById(id);
                return [id, data.user?.email ?? "Someone"] as const;
            }),
        ),
    );

    const schedule =
        offer.schedule_days && offer.schedule_days.length > 0
            ? `${offer.schedule_days.map((day: number) => days[day]).join(", ")}${
                offer.schedule_start ? `, ${offer.schedule_start.slice(0, 5)}–${offer.schedule_end?.slice(0, 5)}` : ""
            }`
            : null;

    return (
        <div>
            <Button render={<Link href="/admin/offers" />} nativeButton={false} variant="ghost" size="sm">
                <FiArrowLeft aria-hidden="true" />
                All offers
            </Button>

            <header className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-sm font-medium text-[#FF593F]">
                        <Link href={`/admin/businesses/${business.id}`} className="hover:underline">
                            {business.name}
                        </Link>{" "}
                        · {offer.category}
                    </p>

                    <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{offer.title}</h1>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Badge className={`w-fit ${statusStyles[offer.approval_status] ?? ""}`}>
                            {statusLabels[offer.approval_status] ?? offer.approval_status}
                        </Badge>

                        {offer.plan_paused_at && <Badge variant="outline">Paused by the Free plan</Badge>}

                        {business.approval_status !== "approved" && (
                            <Badge variant="outline">Business {business.approval_status}</Badge>
                        )}

                        <span className="text-sm text-[#17233B]/65">Submitted {when(offer.created_at)}</span>
                    </div>
                </div>

                {/* A pending offer shows itself to an admin as a preview,
                    so this is worth having whatever its status. */}
                <Button
                    render={<Link href={`/offers/${offer.slug}`} target="_blank" rel="noreferrer" />}
                    nativeButton={false}
                    variant="outline"
                    size="sm"
                >
                    {offer.approval_status === "approved" ? "Public page" : "Preview the page"}
                    <FiExternalLink aria-hidden="true" />
                </Button>
            </header>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
                <Card className="border-[#17233B]/10">
                    <CardHeader><h2 className="text-lg font-semibold">The offer</h2></CardHeader>
                    <CardContent>
                        {storedImage(offer.image_url) && (
                            <div className="relative mb-5 aspect-[16/10] overflow-hidden rounded-xl bg-[#FFF4E8]">
                                <Image src={storedImage(offer.image_url)!} alt="" fill sizes="480px" className="object-cover" />
                            </div>
                        )}

                        <Facts
                            rows={[
                                ["Type", isOfferKind(offer.kind) ? offerKind(offer.kind).label : offer.kind],
                                ["Headline", offer.discount],
                                ["Availability", offer.availability],
                                ["Quiet hours", schedule],
                                ["Expires", onlyDate(offer.expires_at)],
                                ["Limit", offer.max_redemptions ? `${offer.max_redemptions} claims` : "Unlimited"],
                            ]}
                        />

                        <p className="mt-5 leading-7 text-[#17233B]/65">{offer.description}</p>

                        <p className="mt-4 text-sm leading-6 text-[#17233B]/65">{offer.terms}</p>
                    </CardContent>
                </Card>

                <Card className="border-[#17233B]/10">
                    <CardHeader>
                        <h2 className="text-lg font-semibold">Set the type</h2>

                        <p className="mt-1 text-sm text-[#17233B]/65">
                            The headline is built from the type, and the type is what
                            customers filter by. Saving rewrites the headline and doesn&apos;t
                            send the offer back for review.
                        </p>
                    </CardHeader>

                    <CardContent>
                        <OfferKindForm
                            offerId={offer.id}
                            kind={offer.kind}
                            kindValue={offer.kind_value}
                            kindQuantity={offer.kind_quantity}
                            kindItem={offer.kind_item}
                            discount={offer.discount}
                        />
                    </CardContent>
                </Card>

                <Card className="border-[#17233B]/10">
                    <CardHeader><h2 className="text-lg font-semibold">What has happened</h2></CardHeader>
                    <CardContent>
                        <Facts
                            rows={[
                                ["Claimed", claimed.length],
                                ["Redeemed in store", used],
                                ["Still to use", claimed.length - used],
                                ["Page views", views.count ?? 0],
                                ["Followers emailed", emails.count ?? 0],
                                ["QR codes pointing here", liveCodes.length],
                                ["Last changed", when(offer.updated_at)],
                            ]}
                        />
                    </CardContent>
                </Card>

                <Card className="border-[#17233B]/10">
                    <CardHeader><h2 className="text-lg font-semibold">History</h2></CardHeader>
                    <CardContent>
                        {(history.data ?? []).length === 0 ? (
                            <p className="text-sm text-[#17233B]/65">
                                Nothing recorded. Offers made before the audit log started have
                                no entries.
                            </p>
                        ) : (
                            <ol className="space-y-3 text-sm">
                                {(history.data ?? []).map((entry, index) => (
                                    <li
                                        key={`${entry.action}-${entry.created_at}-${index}`}
                                        className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[#17233B]/10 pb-3 last:border-0 last:pb-0"
                                    >
                                        <span className="font-medium">
                                            {actionNames[entry.action] ?? entry.action}
                                            {entry.actor_user_id && (
                                                <span className="block text-xs font-normal text-[#17233B]/65">
                                                    {actors.get(entry.actor_user_id)}
                                                </span>
                                            )}
                                        </span>

                                        <span className="text-right text-[#17233B]/65">{when(entry.created_at)}</span>
                                    </li>
                                ))}
                            </ol>
                        )}

                        <p className="mt-5 text-xs text-[#17233B]/65">
                            Submitted by {offer.created_by ? actors.get(offer.created_by) : "someone"} ·
                            reference {offer.public_id}
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-[#17233B]/10">
                    <CardHeader><h2 className="text-lg font-semibold">Claims</h2></CardHeader>
                    <CardContent>
                        {claimed.length === 0 ? (
                            <p className="text-sm text-[#17233B]/65">
                                Nobody has claimed this offer yet.
                            </p>
                        ) : (
                            <ol className="space-y-3 text-sm">
                                {claimed.slice(0, 15).map((claim) => (
                                    <li
                                        key={claim.redemption_code}
                                        className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[#17233B]/10 pb-3 last:border-0 last:pb-0"
                                    >
                                        <span className="font-mono text-xs">{claim.redemption_code}</span>

                                        <span className="text-right text-[#17233B]/65">
                                            Claimed {when(claim.created_at)}
                                            <span className="block text-xs">
                                                {claim.used_at ? `Used ${when(claim.used_at)}` : "Not used yet"}
                                            </span>
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        )}

                        {claimed.length > 15 && (
                            <p className="mt-4 text-xs text-[#17233B]/65">
                                Showing the 15 most recent of {claimed.length}.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default function AdminOfferPage(props: PageProps) {
    return (
        <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
            <Overview {...props} />
        </Suspense>
    );
}
