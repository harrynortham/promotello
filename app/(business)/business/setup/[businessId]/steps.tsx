"use client";

import Link from "next/link";
import { useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FiArrowRight } from "react-icons/fi";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldError, invalidProps } from "@/components/field-error";
import { HoursFields } from "@/components/hours-fields";
import { ImagePicker } from "@/components/image-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocationFields } from "@/components/location-fields";
import { Textarea } from "@/components/ui/textarea";
import { hoursRowsFor, hoursSchema, type DayValues, type HoursValues } from "@/lib/business-hours";
import { uploadBusinessImage, type BusinessImageKind, isGeneratedCover } from "@/lib/business-images";
import type { CityOption } from "@/lib/locations";
import { locationShape, optionalText, postcodeInCity, requiredText } from "@/lib/validation";
import { createClient } from "@/utils/supabase/client";
import { savingProblem, tryToSave } from "@/lib/saving";

import { trackStep } from "./track";
import type { SetupDraft } from "./setup-flow";

export type BusinessLocation = {
    id: string;
    address_line_1: string;
    address_line_2: string | null;
    city: string;
    region: string | null;
    postal_code: string | null;
};

type StepProps = {
    businessId: string;
    draft: SetupDraft;
    setDraft: Dispatch<SetStateAction<SetupDraft>>;
    onDone: () => void;
    // We wrote this page from the outside, so what is already in these
    // fields is ours rather than theirs.
    ours?: boolean;
};

// Every step is the same card: one thing, one button, and a way past it.
function StepCard({
    children,
    error,
    errorTitle,
    footer,
}: {
    children: ReactNode;
    error?: string;
    errorTitle: string;
    footer?: ReactNode;
}) {
    return (
        <div className="rounded-2xl border border-[#17233B]/10 bg-white p-6 shadow-sm sm:p-8">
            {children}

            {error && (
                <Alert variant="destructive" className="mt-5">
                    <AlertTitle>{errorTitle}</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {footer && <div className="mt-6">{footer}</div>}
        </div>
    );
}

// Said where the answer in front of them is ours rather than theirs. A
// page we built is mostly guesses, and this is the moment to say so.
function OurGuess({ show, children }: { show: boolean; children: ReactNode }) {
    if (!show) return null;

    return (
        <p className="mb-4 rounded-xl bg-[#FFF8F0] px-4 py-3 text-sm leading-6 text-[#17233B]/70">
            {children}
        </p>
    );
}

function SkipLink({ onSkip, children }: { onSkip: () => void; children: ReactNode }) {
    return (
        <button
            type="button"
            onClick={onSkip}
            className="cursor-pointer text-sm font-medium text-[#17233B]/60 underline-offset-4 hover:text-[#17233B] hover:underline"
        >
            {children}
        </button>
    );
}

// Shared by the logo and the cover photo: choose, crop, upload, save.
function ImageStep({
    businessId,
    kind,
    businessName,
    label,
    hint,
    aspect,
    allowSpace,
    maxSize,
    convertToJpeg,
    column,
    currentUrl,
    onSaved,
    onSkip,
    skipLabel,
    ourNote,
}: {
    businessId: string;
    kind: BusinessImageKind;
    businessName: string;
    label: string;
    hint: string;
    aspect: number;
    allowSpace: boolean;
    maxSize: number;
    convertToJpeg: boolean;
    column: "logo_url" | "cover_image_url";
    currentUrl: string | null | undefined;
    onSaved: (url: string) => void;
    onSkip: () => void;
    skipLabel: string;
    ourNote?: ReactNode;
}) {
    const [file, setFile] = useState<File | null>(null);
    const [errorMessage, setErrorMessage] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const step = column === "logo_url" ? "logo" : "cover";

    async function save() {
        if (!file) return;

        setIsSaving(true);
        setErrorMessage("");

        try {
            const supabase = createClient();
            // The picker already cropped and encoded it. Relabelling the
            // type here only ever disagreed with the bytes.
            const upload = await uploadBusinessImage(supabase, businessId, kind, file);

            if ("error" in upload) {
                throw new Error(upload.error ?? `Your ${label.toLowerCase()} couldn't be uploaded.`);
            }

            const saved = await tryToSave(() =>
                supabase.from("businesses").update({ [column]: upload.url }).eq("id", businessId),
            );

            if (saved.error) throw new Error(savingProblem(saved));

            trackStep(businessId, step, "step_completed");
            onSaved(upload.url);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Please try again.";

            trackStep(businessId, step, "step_failed", { message });
            setErrorMessage(message);
            setIsSaving(false);
        }
    }

    return (
        <StepCard
            error={errorMessage}
            errorTitle={`Unable to save your ${label.toLowerCase()}`}
            footer={
                <div className="flex flex-wrap items-center gap-4">
                    <Button type="button" size="lg" disabled={!file || isSaving} onClick={save}>
                        {isSaving ? "Saving…" : `Save ${label.toLowerCase()}`}
                        <FiArrowRight aria-hidden="true" />
                    </Button>

                    <SkipLink onSkip={onSkip}>{skipLabel}</SkipLink>
                </div>
            }
        >
            <OurGuess show={Boolean(ourNote && currentUrl)}>{ourNote}</OurGuess>

            <ImagePicker
                id={`setup-${kind}`}
                label={label}
                hint={hint}
                aspect={aspect}
                allowSpace={allowSpace}
                maxSize={maxSize}
                convertToJpeg={convertToJpeg}
                imageUrl={currentUrl ?? null}
                modal
                disabled={isSaving}
                onChange={(chosen) => setFile(chosen)}
            />

            <p className="mt-4 text-xs leading-6 text-[#17233B]/60">
                It appears on {businessName}&apos;s page straight away — but nobody outside your
                team can see the page until we have checked it.
            </p>
        </StepCard>
    );
}

export function LogoStep({
    businessId,
    businessName,
    draft,
    setDraft,
    onDone,
    onSkip,
    ours,
}: StepProps & { businessName: string; onSkip: () => void }) {
    return (
        <ImageStep
            businessId={businessId}
            kind="logo"
            businessName={businessName}
            label="Logo"
            hint="PNG, JPG or WebP. You can zoom and reposition it next."
            aspect={1}
            allowSpace
            maxSize={1024}
            convertToJpeg={false}
            column="logo_url"
            currentUrl={draft.logoUrl}
            onSaved={(url) => {
                setDraft((current) => ({ ...current, logoUrl: url }));
                onDone();
            }}
            onSkip={onSkip}
            skipLabel="I'll add it later"
            ourNote={
                ours
                    ? "We found this one. If it isn't the logo you'd choose, replace it here."
                    : undefined
            }
        />
    );
}

export function CoverStep({
    businessId,
    businessName,
    draft,
    setDraft,
    onDone,
    onSkip,
}: StepProps & { businessName: string; onSkip: () => void }) {
    return (
        <ImageStep
            businessId={businessId}
            kind="cover"
            businessName={businessName}
            label="Cover photo"
            hint="A landscape JPG, PNG or WebP photo. You can zoom and reposition it next."
            aspect={16 / 9}
            allowSpace={false}
            maxSize={1600}
            convertToJpeg
            column="cover_image_url"
            currentUrl={draft.coverImageUrl}
            onSaved={(url) => {
                setDraft((current) => ({ ...current, coverImageUrl: url }));
                onDone();
            }}
            onSkip={onSkip}
            skipLabel="I'll add one later"
            // A cover we drew sits in the box looking like a job already
            // done, while the step it belongs to stays unticked. Saying
            // which it is costs a sentence and stops the two
            // contradicting each other.
            ourNote={
                isGeneratedCover(draft.coverImageUrl)
                    ? "This one is a stand-in we made from your colours. A photo of the place — the front, the counter, a dish — does more."
                    : undefined
            }
        />
    );
}

const descriptionSchema = z.object({
    description: z
        .string()
        .trim()
        .min(1, "Write a sentence or two about your business.")
        .max(5000, "The description can be up to 5000 characters."),
});

export function DescriptionStep({ businessId, draft, setDraft, onDone, ours }: StepProps) {
    const [errorMessage, setErrorMessage] = useState("");

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<z.input<typeof descriptionSchema>>({
        resolver: zodResolver(descriptionSchema),
        defaultValues: { description: draft.description ?? "" },
    });

    async function save(values: z.input<typeof descriptionSchema>) {
        setErrorMessage("");

        const supabase = createClient();

        const saved = await tryToSave(() =>
            supabase.from("businesses").update({ description: values.description.trim() }).eq("id", businessId),
        );

        if (saved.error) {
            trackStep(businessId, "description", "step_failed", { message: savingProblem(saved) });
            setErrorMessage(savingProblem(saved));
            return;
        }

        trackStep(businessId, "description", "step_completed");
        onDone();
    }

    return (
        <form onSubmit={handleSubmit(save)} noValidate>
            <StepCard
                error={errorMessage}
                errorTitle="Unable to save your description"
                footer={
                    <Button type="submit" size="lg" disabled={isSubmitting}>
                        {isSubmitting ? "Saving…" : "Save and continue"}
                        <FiArrowRight aria-hidden="true" />
                    </Button>
                }
            >
                <OurGuess show={Boolean(ours && draft.description)}>
                    We wrote this from the outside, so read it over — it&apos;s yours to
                    change, and customers see it as it is here.
                </OurGuess>

                <div className="space-y-2">
                    <Label htmlFor="setup-description">Description</Label>

                    <Textarea
                        id="setup-description"
                        rows={6}
                        maxLength={5000}
                        autoFocus
                        placeholder="What you sell, what you're known for, and why someone should come in."
                        {...register("description", {
                            // The preview beside this fills in as they type.
                            onChange: (event) =>
                                setDraft((current) => ({ ...current, description: event.target.value })),
                        })}
                        {...invalidProps("setup-description-error", errors.description)}
                    />

                    <FieldError id="setup-description-error" message={errors.description?.message} />
                </div>
            </StepCard>
        </form>
    );
}

function addressSchemaFor(cities: CityOption[]) {
    return z
        .object({
            addressLine1: requiredText("The street address", { min: 2, max: 200 }),
            addressLine2: optionalText("Address line 2", 200),
            ...locationShape,
        })
        .superRefine(postcodeInCity(cities));
}

export function AddressStep({
    businessId,
    cities,
    location,
    setDraft,
    onDone,
    ours,
}: Omit<StepProps, "draft"> & { cities: CityOption[]; location: BusinessLocation | null }) {
    const [errorMessage, setErrorMessage] = useState("");

    type Values = z.input<ReturnType<typeof addressSchemaFor>>;

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<Values>({
        resolver: zodResolver(addressSchemaFor(cities)),
        defaultValues: {
            addressLine1: location?.address_line_1 ?? "",
            addressLine2: location?.address_line_2 ?? "",
            city: location?.city ?? cities[0]?.name ?? "",
            region: location?.region ?? "",
            postalCode: location?.postal_code ?? "",
        },
    });

    async function save(values: Values) {
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

        // The database resolves the names to a city and an area, and
        // refuses a postcode that isn't in the city.
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
            trackStep(businessId, "address", "step_failed", { message: savingProblem(saved) });
            setErrorMessage(savingProblem(saved));
            return;
        }

        trackStep(businessId, "address", "step_completed");
        setDraft((current) => ({ ...current, area: values.region, city: values.city }));
        onDone();
    }

    return (
        <form onSubmit={handleSubmit(save)} noValidate>
            <StepCard
                error={errorMessage}
                errorTitle="Unable to save your address"
                footer={
                    <Button type="submit" size="lg" disabled={isSubmitting}>
                        {isSubmitting ? "Saving…" : "Save and continue"}
                        <FiArrowRight aria-hidden="true" />
                    </Button>
                }
            >
                <OurGuess show={Boolean(ours && location)}>
                    This is the address we found for you. Correct anything that isn&apos;t
                    right — it&apos;s what customers use to get directions.
                </OurGuess>

                <div className="space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="setup-address-1">Address line 1</Label>

                        <Input
                            id="setup-address-1"
                            maxLength={200}
                            autoComplete="address-line1"
                            {...register("addressLine1")}
                            {...invalidProps("setup-address-1-error", errors.addressLine1)}
                        />
                        <FieldError id="setup-address-1-error" message={errors.addressLine1?.message} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="setup-address-2">Address line 2</Label>

                        <Input
                            id="setup-address-2"
                            maxLength={200}
                            autoComplete="address-line2"
                            {...register("addressLine2")}
                        />
                    </div>

                    <LocationFields
                        cities={cities}
                        defaults={{ city: location?.city, area: location?.region, postalCode: location?.postal_code }}
                        fields={{ city: register("city"), region: register("region"), postalCode: register("postalCode") }}
                        errors={errors}
                    />
                </div>
            </StepCard>
        </form>
    );
}

export function HoursStep({
    businessId,
    days,
    onDone,
}: {
    businessId: string;
    days: DayValues[];
    onDone: () => void;
}) {
    const [errorMessage, setErrorMessage] = useState("");

    const {
        register,
        handleSubmit,
        control,
        setValue,
        formState: { errors, isSubmitting, isSubmitted },
    } = useForm<HoursValues>({
        resolver: zodResolver(hoursSchema),
        defaultValues: { days },
    });

    async function save(values: HoursValues) {
        setErrorMessage("");

        const supabase = createClient();

        const saved = await tryToSave(() =>
            supabase
                .from("business_hours")
                .upsert(hoursRowsFor(businessId, values.days), { onConflict: "business_id,day_of_week" }),
        );

        if (saved.error) {
            trackStep(businessId, "hours", "step_failed", { message: savingProblem(saved) });
            setErrorMessage(savingProblem(saved));
            return;
        }

        trackStep(businessId, "hours", "step_completed");
        onDone();
    }

    return (
        <form onSubmit={handleSubmit(save)} noValidate>
            <StepCard
                error={errorMessage}
                errorTitle="Unable to save your hours"
                footer={
                    <Button type="submit" size="lg" disabled={isSubmitting}>
                        {isSubmitting ? "Saving…" : "Save and continue"}
                        <FiArrowRight aria-hidden="true" />
                    </Button>
                }
            >
                <HoursFields
                    control={control}
                    register={register}
                    setValue={setValue}
                    errors={errors.days}
                    revalidate={isSubmitted}
                />

                {errors.days && (
                    <p role="alert" className="mt-4 text-sm text-destructive">
                        Finish the highlighted days to save.
                    </p>
                )}
            </StepCard>
        </form>
    );
}

export function OfferStep({
    businessId,
    starterOffer,
}: {
    businessId: string;
    starterOffer: string | null;
}) {
    // Somebody who came from a preview email was shown one specific offer,
    // on the page, on the poster and on the card. Sending them to an empty
    // form here asks them to invent the thing they already said yes to —
    // the disconnect docs/LAUNCH-FUNNEL.md is about. The dashboard has
    // handed it back since 20270112; this is the path the welcome screen
    // pushes people down, so it hands it back too.
    const fromEmail = starterOffer !== null;

    return (
        <StepCard
            errorTitle="Unable to start an offer"
            footer={
                <Button
                    render={
                        <Link
                            href={`/business/${businessId}/offers/new?from=${fromEmail ? "email" : "setup"}`}
                        />
                    }
                    nativeButton={false}
                    size="lg"
                >
                    {fromEmail ? "Use the offer from your email" : "Create my first offer"}
                    <FiArrowRight aria-hidden="true" />
                </Button>
            }
        >
            {fromEmail ? (
                <>
                    <p className="leading-7 text-[#17233B]/70">
                        The offer we showed you is still here, and nothing is live yet. It
                        opens filled in, so you can change it or publish it as it is.
                    </p>

                    <p className="mt-4 rounded-xl bg-[#FFF8F0] px-4 py-3 font-medium text-[#17233B]">
                        {starterOffer}
                    </p>
                </>
            ) : (
                <p className="leading-7 text-[#17233B]/70">
                    An offer is what brings someone in the first time: a free side, 20% off, a
                    coffee with any pastry. It goes on your page, and on a QR poster for your
                    window that people scan to claim it.
                </p>
            )}

            <p className="mt-4 text-sm leading-6 text-[#17233B]/60">
                We check every offer before customers see it, the same way we check your page.
            </p>
        </StepCard>
    );
}
