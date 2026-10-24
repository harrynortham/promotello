import { Suspense } from "react";
import { connection } from "next/server";

import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/utils/supabase/server";
import { addArea, addCity, setAreaActive, updateCity } from "./actions";

type PageProps = { searchParams: Promise<{ error?: string; saved?: string }> };

type City = {
    id: string;
    slug: string;
    name: string;
    postcode_districts: string[];
    is_live: boolean;
    latitude: number | null;
    longitude: number | null;
    radius_km: number;
    hero_image_url: string | null;
    feature_image_url: string | null;
    areas: { id: string; name: string; is_active: boolean }[];
};

// The most-asked-for towns, with "bath" and "Bath " counted together.
function byTown(entries: { town: string }[]) {
    const demand = new Map<string, number>();
    for (const entry of entries) {
        const town = entry.town.trim().replace(/\s+/g, " ");
        const key = town.charAt(0).toUpperCase() + town.slice(1).toLowerCase();
        demand.set(key, (demand.get(key) ?? 0) + 1);
    }
    return [...demand.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
}

function TownList({ towns, empty }: { towns: [string, number][]; empty: string }) {
    if (towns.length === 0) {
        return <p className="text-sm text-[#17233B]/55">{empty}</p>;
    }

    return (
        <ul className="divide-y divide-[#17233B]/5 text-sm">
            {towns.map(([town, count]) => (
                <li key={town} className="flex justify-between py-2">
                    <span>{town}</span>
                    <span className="font-semibold tabular-nums">{count}</span>
                </li>
            ))}
        </ul>
    );
}

const errors: Record<string, string> = {
    city: "Give the city a name and at least one postcode district, like BA1.",
    update: "That change didn't save.",
    area: "That area couldn't be added. It may already exist.",
};

async function CitiesContent({ searchParams }: PageProps) {
    await connection();

    const { error, saved } = await searchParams;
    const supabase = await createClient();

    const [{ data: cityRows }, { data: waitlist }, { data: locations }, { data: interest }] = await Promise.all([
        supabase
            .from("cities")
            .select("id, slug, name, postcode_districts, is_live, latitude, longitude, radius_km, hero_image_url, feature_image_url, areas ( id, name, is_active )")
            .order("name"),
        supabase.from("business_waitlist").select("town, created_at").order("created_at", { ascending: false }),
        supabase.from("business_locations").select("city_id, area_id"),
        supabase.from("city_interest").select("town"),
    ]);

    const cities = (cityRows ?? []) as City[];
    const businessesByCity = new Map<string, number>();
    const businessesByArea = new Map<string, number>();

    for (const location of locations ?? []) {
        if (location.city_id) businessesByCity.set(location.city_id, (businessesByCity.get(location.city_id) ?? 0) + 1);
        if (location.area_id) businessesByArea.set(location.area_id, (businessesByArea.get(location.area_id) ?? 0) + 1);
    }

    const topTowns = byTown(waitlist ?? []);
    const customerTowns = byTown(interest ?? []);

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Cities and areas</h1>
                <p className="mt-3 max-w-2xl text-[#17233B]/65">
                    Businesses can only add locations in live cities, in one of that city&apos;s areas, with a
                    postcode from its districts. Add a city here, check its areas, then switch it to live.
                </p>
            </header>

            {error && errors[error] && (
                <Alert variant="destructive">
                    <AlertTitle>Not saved</AlertTitle>
                    <AlertDescription>{errors[error]}</AlertDescription>
                </Alert>
            )}
            {saved && (
                <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
                    <AlertTitle>Saved</AlertTitle>
                </Alert>
            )}

            {cities.map((city) => (
                <Card key={city.id} className="border-[#17233B]/10">
                    <CardHeader>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <CardTitle className="text-xl">{city.name}</CardTitle>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline">{businessesByCity.get(city.id) ?? 0} locations</Badge>
                                <Badge className={city.is_live ? "bg-emerald-100 text-emerald-800" : "bg-[#17233B]/5 text-[#17233B]/60"}>
                                    {city.is_live ? "Live" : "Not live"}
                                </Badge>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <form action={updateCity} className="space-y-4">
                            <input type="hidden" name="cityId" value={city.id} />
                            <div className="space-y-2">
                                <Label htmlFor={`districts-${city.id}`}>Postcode districts</Label>
                                <Input id={`districts-${city.id}`} name="postcodeDistricts" defaultValue={city.postcode_districts.join(", ")} />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-3">
                                <div className="space-y-2">
                                    <Label htmlFor={`lat-${city.id}`}>Centre latitude</Label>
                                    <Input id={`lat-${city.id}`} name="latitude" inputMode="decimal" defaultValue={city.latitude ?? ""} placeholder="51.4545" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor={`lng-${city.id}`}>Centre longitude</Label>
                                    <Input id={`lng-${city.id}`} name="longitude" inputMode="decimal" defaultValue={city.longitude ?? ""} placeholder="-2.5879" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor={`radius-${city.id}`}>Radius (km)</Label>
                                    <Input id={`radius-${city.id}`} name="radiusKm" type="number" min={1} max={200} defaultValue={city.radius_km} />
                                </div>
                            </div>
                            <p className="text-xs text-[#17233B]/55">
                                Visitors within the radius of the centre see {city.name} first. Without a centre,
                                visitors are never matched to this city automatically. Photos are a path on
                                this site or a Supabase Storage link.
                            </p>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor={`hero-${city.id}`}>Home page photo</Label>
                                    <Input id={`hero-${city.id}`} name="heroImageUrl" defaultValue={city.hero_image_url ?? ""} placeholder="/images/home/hero.jpg" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor={`feature-${city.id}`}>Explore photo</Label>
                                    <Input id={`feature-${city.id}`} name="featureImageUrl" defaultValue={city.feature_image_url ?? ""} placeholder="/images/home/harbourside.jpg" />
                                </div>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                                <label className="flex items-center gap-2 text-sm font-medium">
                                    <input type="checkbox" name="isLive" defaultChecked={city.is_live} className="size-4 accent-[#FF593F]" />
                                    Live
                                </label>
                                <SubmitButton variant="outline" pendingLabel="Saving…">Save</SubmitButton>
                            </div>
                        </form>

                        <div>
                            <p className="text-sm font-medium">Areas</p>
                            <ul className="mt-3 flex flex-wrap gap-2">
                                {[...city.areas].sort((a, b) => a.name.localeCompare(b.name)).map((area) => (
                                    <li key={area.id}>
                                        <form action={setAreaActive}>
                                            <input type="hidden" name="areaId" value={area.id} />
                                            <input type="hidden" name="active" value={String(!area.is_active)} />
                                            <button
                                                type="submit"
                                                title={area.is_active ? "Click to hide from new locations" : "Click to make available again"}
                                                className={`rounded-full border px-3 py-1 text-sm ${area.is_active ? "border-[#17233B]/15 bg-white" : "border-dashed text-[#17233B]/40 line-through"}`}
                                            >
                                                {area.name}
                                                <span className="ml-1.5 text-xs text-[#17233B]/45">{businessesByArea.get(area.id) ?? 0}</span>
                                            </button>
                                        </form>
                                    </li>
                                ))}
                            </ul>
                            <form action={addArea} className="mt-4 flex max-w-md gap-2">
                                <input type="hidden" name="cityId" value={city.id} />
                                <Input name="name" required minLength={2} maxLength={80} placeholder="Add an area" aria-label={`New area in ${city.name}`} />
                                <SubmitButton variant="outline" pendingLabel="Adding…">Add</SubmitButton>
                            </form>
                        </div>
                    </CardContent>
                </Card>
            ))}

            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="border-[#17233B]/10">
                    <CardHeader>
                        <CardTitle className="text-lg">Add a city</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form action={addCity} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="new-city">Name</Label>
                                <Input id="new-city" name="name" required minLength={2} maxLength={80} placeholder="Bath" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="new-districts">Postcode districts</Label>
                                <Input id="new-districts" name="postcodeDistricts" required placeholder="BA1, BA2" />
                            </div>
                            <p className="text-xs text-[#17233B]/55">New cities start not live. Add their areas, then switch them on.</p>
                            <SubmitButton pendingLabel="Adding…">Add city</SubmitButton>
                        </form>
                    </CardContent>
                </Card>

                <Card className="border-[#17233B]/10">
                    <CardHeader>
                        <CardTitle className="text-lg">Waitlist</CardTitle>
                        <p className="text-sm text-[#17233B]/60">{waitlist?.length ?? 0} businesses waiting, by town.</p>
                    </CardHeader>
                    <CardContent>
                        <TownList towns={topTowns} empty="No one on the waitlist yet." />
                    </CardContent>
                </Card>

                <Card className="border-[#17233B]/10">
                    <CardHeader>
                        <CardTitle className="text-lg">Customers asking</CardTitle>
                        <p className="text-sm text-[#17233B]/60">
                            {interest?.length ?? 0} customers want Promotello in their town.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <TownList towns={customerTowns} empty="No requests yet." />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default function AdminCitiesPage(props: PageProps) {
    return (
        <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
            <CitiesContent {...props} />
        </Suspense>
    );
}
