import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { FiCalendar, FiImage, FiTrash2 } from "react-icons/fi";

import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { businessTier } from "@/lib/billing";
import { EVENTS_ENABLED } from "@/lib/features";
import { formatEventTime } from "@/lib/uk-time";
import { createClient } from "@/utils/supabase/server";
import { createEvent, deleteEvent } from "./actions";

type PageProps = {
    params: Promise<{ businessId: string }>;
    searchParams: Promise<{ error?: string; saved?: string }>;
};

type BusinessEvent = {
    id: string;
    title: string;
    description: string;
    starts_at: string;
    ends_at: string | null;
    location: string | null;
    price: string | null;
};

const errorMessages: Record<string, string> = {
    invalid: "Give the event a title (3 characters or more), a date and a start time.",
    times: "The end time needs to be after the start time.",
    save: "We couldn't save the event. Events need the Growth plan, and only owners and admins can add them.",
};

function nowIso() {
    return new Date().toISOString();
}

async function EventsContent({ params, searchParams }: PageProps) {
    await connection();

    if (!EVENTS_ENABLED) {
        notFound();
    }

    const [{ businessId }, { error, saved }] = await Promise.all([params, searchParams]);
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: membership } = await supabase
        .from("business_members")
        .select("role")
        .eq("business_id", businessId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (!membership) {
        notFound();
    }

    const [tier, { data }] = await Promise.all([
        businessTier(supabase, businessId).catch(() => "free" as const),
        supabase
            .from("business_events")
            .select("id, title, description, starts_at, ends_at, location, price")
            .eq("business_id", businessId)
            .order("starts_at", { ascending: true }),
    ]);

    const now = nowIso();
    const events = (data ?? []) as BusinessEvent[];
    const upcoming = events.filter((event) => (event.ends_at ?? event.starts_at) >= now);
    const past = events.filter((event) => (event.ends_at ?? event.starts_at) < now).reverse().slice(0, 5);
    const canAdd = tier === "growth" && ["owner", "admin"].includes(membership.role);

    return (
        <main className="space-y-8 text-[#17233B]">
            <header>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C8371D]">Growth</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Events</h1>
                <p className="mt-3 max-w-2xl text-[#17233B]/65">
                    Tastings, live music, workshops, late openings. Events show on your page and in
                    Promotello&apos;s events listing, and each one gets an Instagram story image.
                </p>
            </header>

            {tier !== "growth" && (
                <Alert className="border-[#FF593F]/30 bg-[#FF593F]/5">
                    <AlertTitle>Events are part of Growth</AlertTitle>
                    <AlertDescription>
                        <Button render={<Link href={`/business/${businessId}/billing`} />} nativeButton={false} size="sm" className="mt-2">
                            See Growth
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            {error && errorMessages[error] && (
                <Alert variant="destructive">
                    <AlertTitle>Not saved</AlertTitle>
                    <AlertDescription>{errorMessages[error]}</AlertDescription>
                </Alert>
            )}

            {saved && (
                <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
                    <AlertTitle>Event added</AlertTitle>
                    <AlertDescription>It&apos;s now on your page and in the events listing.</AlertDescription>
                </Alert>
            )}

            {canAdd && (
                <Card className="border-[#17233B]/10">
                    <CardHeader>
                        <CardTitle>Add an event</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form action={createEvent} className="space-y-4">
                            <input type="hidden" name="businessId" value={businessId} />
                            <div className="space-y-2">
                                <Label htmlFor="event-title">Title</Label>
                                <Input id="event-title" name="title" required minLength={3} maxLength={120} placeholder="Wine tasting evening" />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-3">
                                <div className="space-y-2">
                                    <Label htmlFor="event-date">Date</Label>
                                    <Input id="event-date" name="date" type="date" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="event-start">Starts</Label>
                                    <Input id="event-start" name="startTime" type="time" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="event-end">Ends (optional)</Label>
                                    <Input id="event-end" name="endTime" type="time" />
                                </div>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="event-location">Where (optional)</Label>
                                    <Input id="event-location" name="location" maxLength={160} placeholder="Upstairs room" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="event-price">Price (optional)</Label>
                                    <Input id="event-price" name="price" maxLength={60} placeholder="£12, includes a drink" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="event-description">Description</Label>
                                <Textarea id="event-description" name="description" rows={4} maxLength={2000} />
                            </div>
                            <SubmitButton pendingLabel="Adding…">Add event</SubmitButton>
                        </form>
                    </CardContent>
                </Card>
            )}

            <section>
                <h2 className="text-xl font-semibold">Coming up</h2>
                {upcoming.length === 0 ? (
                    <p className="mt-3 rounded-xl border border-dashed border-[#17233B]/15 bg-white px-4 py-8 text-center text-sm text-[#17233B]/70">
                        No upcoming events.
                    </p>
                ) : (
                    <ul className="mt-4 space-y-3">
                        {upcoming.map((event) => (
                            <li key={event.id} className="flex flex-col gap-3 rounded-xl border border-[#17233B]/10 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex gap-3">
                                    <FiCalendar aria-hidden="true" className="mt-1 shrink-0 text-[#C8371D]" />
                                    <div>
                                        <Link href={`/events/${event.id}`} className="font-semibold hover:text-[#C8371D]">
                                            {event.title}
                                        </Link>
                                        <p className="text-sm text-[#17233B]/70">
                                            {formatEventTime(event.starts_at, event.ends_at)}
                                            {event.price ? ` · ${event.price}` : ""}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        render={<a href={`/events/${event.id}/story-image`} download />}
                                        nativeButton={false}
                                        variant="outline"
                                        size="sm"
                                    >
                                        <FiImage aria-hidden="true" />
                                        Instagram image
                                    </Button>
                                    {["owner", "admin"].includes(membership.role) && (
                                        <form action={deleteEvent}>
                                            <input type="hidden" name="businessId" value={businessId} />
                                            <input type="hidden" name="eventId" value={event.id} />
                                            <SubmitButton variant="outline" pendingLabel="Removing…">
                                                <FiTrash2 aria-hidden="true" />
                                                Remove
                                            </SubmitButton>
                                        </form>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {past.length > 0 && (
                <section>
                    <h2 className="text-lg font-semibold">Recent</h2>
                    <ul className="mt-3 space-y-2 text-sm text-[#17233B]/70">
                        {past.map((event) => (
                            <li key={event.id}>
                                {event.title} · {formatEventTime(event.starts_at, event.ends_at)}
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </main>
    );
}

export default function EventsPage(props: PageProps) {
    return (
        <Suspense
            fallback={
                <div className="space-y-6">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-64 rounded-2xl" />
                </div>
            }
        >
            <EventsContent {...props} />
        </Suspense>
    );
}
