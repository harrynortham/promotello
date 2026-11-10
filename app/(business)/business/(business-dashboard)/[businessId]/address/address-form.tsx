"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldError, invalidProps } from "@/components/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocationFields } from "@/components/location-fields";
import type { CityOption } from "@/lib/locations";
import { locationShape, optionalText, postcodeInCity, requiredText } from "@/lib/validation";
import { savingProblem, tryToSave } from "@/lib/saving";
import { createClient } from "@/utils/supabase/client";

export type BusinessLocation = {
    id: string;
    name: string;
    address_line_1: string;
    address_line_2: string | null;
    city: string;
    region: string | null;
    postal_code: string | null;
};

// The city, area and postcode rules are the database's, repeated here so
// the answer comes before the save (see lib/validation).
function schemaFor(cities: CityOption[]) {
    return z
        .object({
            addressLine1: requiredText("The street address", { min: 2, max: 200 }),
            addressLine2: optionalText("Address line 2", 200),
            ...locationShape,
        })
        .superRefine(postcodeInCity(cities));
}

type Values = z.input<ReturnType<typeof schemaFor>>;

export default function AddressForm({
    businessId,
    businessName,
    cities,
    location,
}: {
    businessId: string;
    businessName: string;
    cities: CityOption[];
    // Null for a business that has never had one.
    location: BusinessLocation | null;
}) {
    const router = useRouter();
    // Straight back to the overview, where the step ticks itself off.
    const back = `/business/${businessId}`;
    const [errorMessage, setErrorMessage] = useState("");

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<Values>({
        resolver: zodResolver(schemaFor(cities)),
        defaultValues: {
            addressLine1: location?.address_line_1 ?? "",
            addressLine2: location?.address_line_2 ?? "",
            city: location?.city ?? cities[0]?.name ?? "",
            region: location?.region ?? "",
            postalCode: location?.postal_code ?? "",
        },
    });

    async function onSubmit(values: Values) {
        setErrorMessage("");

        const supabase = createClient();

        const address = {
            address_line_1: values.addressLine1,
            address_line_2: values.addressLine2 || null,
            city: values.city,
            region: values.region,
            postal_code: values.postalCode,
            country_code: "GB",
        };

        // The database resolves the city and area names to their ids, and
        // refuses a postcode that isn't in the city, so its message is the
        // one worth showing.
        const saved = location
            ? await tryToSave(() =>
                  supabase
                      .from("business_locations")
                      .update(address)
                      .eq("id", location.id)
                      .eq("business_id", businessId),
              )
            : await supabase
                .from("business_locations")
                .insert({ ...address, business_id: businessId, name: "Main location" });

        if (saved.error) {
            setErrorMessage(savingProblem(saved));
            return;
        }

        router.push(back);
        router.refresh();
    }

    return (
        <div className="text-[#17233B]">
            <BackButton href={back} />

            <div className="mt-8">
                <h1 className="text-4xl font-semibold tracking-tight">
                    {location ? "Your address" : "Add your address"}
                </h1>

                <p className="mt-3 text-[#17233B]/65">
                    Shown on {businessName}&apos;s page so customers can find you and get
                    directions, and it is how you are filed by area.
                </p>
            </div>

            <Card className="mt-10 border-[#17233B]/10">
                <CardContent className="p-4 sm:p-8">
                    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="addressLine1">Address line 1</Label>

                            <Input
                                id="addressLine1"
                                maxLength={200}
                                autoComplete="address-line1"
                                {...register("addressLine1")}
                                {...invalidProps("addressLine1-error", errors.addressLine1)}
                            />
                            <FieldError id="addressLine1-error" message={errors.addressLine1?.message} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="addressLine2">Address line 2</Label>

                            <Input
                                id="addressLine2"
                                maxLength={200}
                                autoComplete="address-line2"
                                {...register("addressLine2")}
                            />
                        </div>

                        <LocationFields
                            cities={cities}
                            defaults={{
                                city: location?.city,
                                area: location?.region,
                                postalCode: location?.postal_code,
                            }}
                            fields={{
                                city: register("city"),
                                region: register("region"),
                                postalCode: register("postalCode"),
                            }}
                            errors={errors}
                        />

                        {errorMessage && (
                            <Alert variant="destructive">
                                <AlertTitle>Unable to save your address</AlertTitle>
                                <AlertDescription>{errorMessage}</AlertDescription>
                            </Alert>
                        )}

                        <Button type="submit" disabled={isSubmitting} size="lg" className="w-full">
                            {isSubmitting ? "Saving address…" : "Save address"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
