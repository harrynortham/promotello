import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { areaQuery, searchArea } from "@/lib/places-import";
import { createClient } from "@/utils/supabase/server";
import { addLeads } from "../actions";

export const metadata: Metadata = { title: "Import an area", robots: { index: false } };

type PageProps = {
    searchParams: Promise<{ city?: string; area?: string; what?: string; error?: string }>;
};

async function Import({ searchParams }: PageProps) {
    await connection();

    const supabase = await createClient();
    const { data: isAdmin } = await supabase.rpc("is_platform_admin");

    if (!isAdmin) redirect("/admin");

    const params = await searchParams;

    const { data: cities } = await supabase
        .from("cities")
        .select("id, name, slug")
        .order("name");

    const { data: areas } = await supabase
        .from("areas")
        .select("id, name, city_id")
        .order("name");

    const city = (cities ?? []).find((row) => row.id === params.city) ?? null;
    const area = (areas ?? []).find((row) => row.id === params.area) ?? null;
    const what = params.what?.trim() || "";

    const search =
        city && area && what ? await searchArea(areaQuery(what, area.name, city.name)) : null;

    // Already on the list, matched on the one thing from Google we keep.
    const ids = search?.ok ? search.results.map((place) => place.place_id) : [];
    const { data: known } = ids.length
        ? await supabase.from("leads").select("place_id").in("place_id", ids)
        : { data: [] };

    const alreadyHave = new Set((known ?? []).map((lead) => lead.place_id));

    return (
        <div className="text-[#17233B]">
            <Button render={<Link href="/admin/sales" />} nativeButton={false} variant="ghost" size="sm">
                ← The pipeline
            </Button>

            <h1 className="mt-6 text-3xl font-semibold tracking-tight">Import an area</h1>

            <p className="mt-3 max-w-2xl leading-7 text-[#17233B]/65">
                Ask Google who is trading on a street, then choose who is worth a
                row. Nothing is kept but what you pick, and the place id that stops
                the same shop arriving twice.
            </p>

            <form method="get" className="mt-8 grid gap-3 sm:grid-cols-4">
                <select name="city" defaultValue={params.city ?? ""} className="h-11 rounded-lg border border-input bg-background px-3 text-sm">
                    <option value="">City</option>
                    {(cities ?? []).map((row) => (
                        <option key={row.id} value={row.id}>{row.name}</option>
                    ))}
                </select>

                <select name="area" defaultValue={params.area ?? ""} className="h-11 rounded-lg border border-input bg-background px-3 text-sm">
                    <option value="">Area</option>
                    {(areas ?? [])
                        .filter((row) => !params.city || row.city_id === params.city)
                        .map((row) => (
                            <option key={row.id} value={row.id}>{row.name}</option>
                        ))}
                </select>

                <input
                    name="what"
                    defaultValue={what}
                    placeholder="Bakeries, barbers, cafés"
                    className="h-11 rounded-lg border border-input bg-background px-3 text-sm"
                />

                <Button type="submit" className="h-11">Search</Button>
            </form>

            {params.error && (
                <Alert variant="destructive" className="mt-6">
                    <AlertTitle>That didn&apos;t work</AlertTitle>
                    <AlertDescription>{params.error.replace(/_/g, " ")}</AlertDescription>
                </Alert>
            )}

            {search && !search.ok && (
                <Alert className="mt-6 border-amber-200 bg-amber-50">
                    <AlertTitle>
                        {search.reason === "no_key" ? "No Places key" : "Google could not be reached"}
                    </AlertTitle>
                    <AlertDescription>
                        {search.reason === "no_key"
                            ? "Set GOOGLE_PLACES_API_KEY and this page starts working. Everything else in the pipeline works without it — a lead can be added by hand."
                            : `The search failed${search.detail ? ` (${search.detail})` : ""}. Worth trying again.`}
                    </AlertDescription>
                </Alert>
            )}

            {search?.ok && (
                <form action={addLeads} className="mt-8">
                    <input type="hidden" name="cityId" value={city?.id ?? ""} />
                    <input type="hidden" name="areaId" value={area?.id ?? ""} />

                    <Card className="border-[#17233B]/10">
                        <CardHeader>
                            <CardTitle className="text-base">
                                {search.results.length} found in {area?.name}
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="space-y-3">
                            {search.results.length === 0 && (
                                <p className="text-sm text-[#17233B]/65">
                                    Nothing came back. A different word for the trade often helps.
                                </p>
                            )}

                            {search.results.map((place) => {
                                const have = alreadyHave.has(place.place_id);

                                return (
                                    <label
                                        key={place.place_id}
                                        className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${have ? "border-[#17233B]/10 bg-[#17233B]/[0.03] text-[#17233B]/50" : "border-[#17233B]/15"}`}
                                    >
                                        <input
                                            type="checkbox"
                                            name="place"
                                            value={JSON.stringify(place)}
                                            disabled={have}
                                            defaultChecked={!have}
                                            className="mt-1"
                                        />

                                        <span>
                                            <span className="font-medium">{place.name}</span>
                                            {have && <span className="ml-2 text-xs">already a lead</span>}
                                            {place.address && (
                                                <span className="block text-xs text-[#17233B]/60">{place.address}</span>
                                            )}
                                            {place.website && (
                                                <span className="block text-xs text-[#17233B]/60">
                                                    {place.website.replace(/^https?:\/\//, "").slice(0, 48)}
                                                </span>
                                            )}
                                        </span>
                                    </label>
                                );
                            })}
                        </CardContent>
                    </Card>

                    {search.results.length > 0 && (
                        <Button type="submit" size="lg" className="mt-6">
                            Add the ticked ones
                        </Button>
                    )}
                </form>
            )}
        </div>
    );
}

export default function ImportPage(props: PageProps) {
    return (
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <Import {...props} />
        </Suspense>
    );
}
