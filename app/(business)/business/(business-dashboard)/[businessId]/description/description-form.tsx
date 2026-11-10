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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { savingProblem, tryToSave } from "@/lib/saving";
import { createClient } from "@/utils/supabase/client";

// Something is required, because this page exists to fill the step in.
// Emptying a description again is a thing the full profile page does.
const schema = z.object({
    description: z
        .string()
        .trim()
        .min(1, "Write a sentence or two about your business.")
        .max(5000, "The description can be up to 5000 characters."),
});

type Values = z.input<typeof schema>;

export default function DescriptionForm({
    businessId,
    businessName,
    initialDescription,
    isFirstTime,
}: {
    businessId: string;
    businessName: string;
    initialDescription: string;
    isFirstTime: boolean;
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
        resolver: zodResolver(schema),
        defaultValues: { description: initialDescription },
    });

    async function onSubmit(values: Values) {
        setErrorMessage("");

        const supabase = createClient();

        const saved = await tryToSave(() =>
            supabase.from("businesses").update({ description: values.description.trim() }).eq("id", businessId),
        );

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
                    {isFirstTime ? "Describe your business" : "Your description"}
                </h1>

                <p className="mt-3 text-[#17233B]/65">
                    This sits under {businessName}&apos;s name, on your page and wherever customers
                    browse. Two or three sentences is plenty.
                </p>
            </div>

            <Card className="mt-10 border-[#17233B]/10">
                <CardContent className="p-4 sm:p-8">
                    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>

                            <Textarea
                                id="description"
                                rows={7}
                                maxLength={5000}
                                autoFocus
                                placeholder="What you sell, what you're known for, and why someone should come in."
                                {...register("description")}
                                {...invalidProps("description-error", errors.description)}
                            />
                            <FieldError id="description-error" message={errors.description?.message} />
                        </div>

                        {errorMessage && (
                            <Alert variant="destructive">
                                <AlertTitle>Unable to save your description</AlertTitle>
                                <AlertDescription>{errorMessage}</AlertDescription>
                            </Alert>
                        )}

                        <Button type="submit" disabled={isSubmitting} size="lg" className="w-full">
                            {isSubmitting ? "Saving description…" : "Save description"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
