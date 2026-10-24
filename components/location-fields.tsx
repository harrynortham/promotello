"use client";

import Link from "next/link";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalisePostcode, type CityOption } from "@/lib/locations";

const selectClass = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

// City, area and postcode for a business location. Submits `city` and
// `region` as names (the database matches them to its lists) and
// `postalCode`. The database enforces the same rules.
export function LocationFields({
    cities,
    defaults,
}: {
    cities: CityOption[];
    defaults?: { city?: string | null; area?: string | null; postalCode?: string | null };
}) {
    const [cityName, setCityName] = useState(
        cities.find((city) => city.name === defaults?.city)?.name ?? cities[0]?.name ?? "",
    );
    const city = cities.find((option) => option.name === cityName);
    const [postcodeError, setPostcodeError] = useState("");

    function checkPostcode(input: HTMLInputElement) {
        const postcode = normalisePostcode(input.value);
        const message = !input.value.trim()
            ? ""
            : !postcode
                ? "Enter a full postcode, like BS7 8AA."
                : city && !city.postcodeDistricts.includes(postcode.split(" ")[0])
                    ? `That postcode isn't in ${city.name}.`
                    : "";

        input.setCustomValidity(message);
        setPostcodeError(message);
    }

    if (cities.length === 0) {
        return <p className="text-sm text-red-700">No cities are open yet.</p>;
    }

    return (
        <div className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="city">Town or city</Label>
                    {cities.length === 1 ? (
                        <>
                            <Input id="city" value={cities[0].name} readOnly className="bg-muted/40" />
                            <input type="hidden" name="city" value={cities[0].name} />
                        </>
                    ) : (
                        <select
                            id="city"
                            name="city"
                            required
                            value={cityName}
                            onChange={(event) => setCityName(event.target.value)}
                            className={selectClass}
                        >
                            {cities.map((option) => (
                                <option key={option.id} value={option.name}>
                                    {option.name}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="region">Neighbourhood or area</Label>
                    <select
                        id="region"
                        name="region"
                        required
                        key={cityName}
                        defaultValue={city?.areas.some((area) => area.name === defaults?.area) ? defaults?.area ?? "" : ""}
                        className={selectClass}
                    >
                        <option value="" disabled>
                            Choose your area
                        </option>
                        {city?.areas.map((area) => (
                            <option key={area.id} value={area.name}>
                                {area.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="postalCode">Postcode</Label>
                <Input
                    id="postalCode"
                    name="postalCode"
                    required
                    maxLength={10}
                    defaultValue={defaults?.postalCode ?? ""}
                    placeholder="e.g. BS7 8AA"
                    autoComplete="postal-code"
                    className="max-w-48"
                    onChange={(event) => checkPostcode(event.currentTarget)}
                    onBlur={(event) => checkPostcode(event.currentTarget)}
                />
                {postcodeError && <p className="text-xs text-red-700">{postcodeError}</p>}
            </div>

            <p className="text-xs text-[#17233B]/55">
                Promotello is in {cities.map((option) => option.name).join(", ")} for now.{" "}
                <Link href="/business/waitlist" className="font-medium text-[#FF593F] underline underline-offset-2">
                    Somewhere else? Join the waitlist
                </Link>
            </p>
        </div>
    );
}
