"use client";

import Link from "next/link";
import { useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FiArrowRight, FiCheck, FiClock, FiSend } from "react-icons/fi";

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
import { uploadBusinessImage, type BusinessImageKind } from "@/lib/business-images";
import type { CityOption } from "@/lib/locations";
import { locationShape, optionalText, postcodeInCity, requiredText } from "@/lib/validation";
import type { SetupStep, SetupStepId } from "@/lib/setup-steps";
import { requestBusinessReview } from "@/app/(business)/business/(business-dashboard)/[businessId]/review-actions";
import { createClient } from "@/utils/supabase/client";
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

    async function save() {
        if (!file) return;

        setIsSaving(true);
        setErrorMessage("");

        try {
            const supabase = createClient();
            const type = convertToJpeg ? "image/jpeg" : file.type;
            const upload = await uploadBusinessImage(supabase, businessId, kind, new File([file], file.name, { type }));

            if ("error" in upload) {
                throw new Error(upload.error ?? `Your ${label.toLowerCase()} couldn't be uploaded.`);
            }

            const { error } = await supabase.from("businesses").update({ [column]: upload.url }).eq("id", businessId);

            if (error) throw new Error(error.message);

            onSaved(upload.url);
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Please try again.");
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
                team can see the page until you send it to us.
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

        const { error } = await createClient()
            .from("businesses")
            .update({ description: values.description.trim() })
            .eq("id", businessId);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

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
        const { error } = location
            ? await supabase.from("business_locations").update(address).eq("id", location.id).eq("business_id", businessId)
            : await supabase.from("business_locations").insert({ ...address, business_id: businessId, name: "Main location" });

        if (error) {
            setErrorMessage(error.message);
            return;
        }

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

        const { error } = await createClient()
            .from("business_hours")
            .upsert(hoursRowsFor(businessId, values.days), { onConflict: "business_id,day_of_week" });

        if (error) {
            setErrorMessage(error.message);
            return;
        }

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

export function ReviewStep({
    businessId,
    businessName,
    businessSlug,
    missing,
    sent,
    isLive,
    onGo,
}: {
    businessId: string;
    businessName: string;
    businessSlug: string | null;
    missing: SetupStep[];
    // Already asked for, so there is nothing to ask for.
    sent: boolean;
    isLive: boolean;
    onGo: (step: SetupStepId) => void;
}) {
    if (sent) {
        return (
            <StepCard
                errorTitle="Unable to send your page"
                footer={
                    <Button type="button" size="lg" onClick={() => onGo("offer")}>
                        Next: your first offer
                        <FiArrowRight aria-hidden="true" />
                    </Button>
                }
            >
                <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <FiCheck aria-hidden="true" className="size-5" />
                </span>

                <p className="mt-4 font-medium">
                    {isLive ? `${businessName} is live.` : "It's with us."}
                </p>

                <p className="mt-2 leading-7 text-[#17233B]/65">
                    {isLive
                        ? "Customers can find you in the directory."
                        : "We read every page — usually the same day — and email you when it goes live. Nothing to do but wait."}
                </p>
            </StepCard>
        );
    }

    return (
        <StepCard
            errorTitle="Unable to send your page"
            footer={
                missing.length > 0 ? (
                    <p className="text-sm text-[#17233B]/60">
                        Finish {missing.length === 1 ? "that" : "those"} and this button turns on.
                    </p>
                ) : (
                    <form action={requestBusinessReview}>
                        <input type="hidden" name="businessId" value={businessId} />
                        <input type="hidden" name="from" value="setup" />

                        <div className="flex flex-wrap items-center gap-4">
                            <Button type="submit" size="lg">
                                <FiSend aria-hidden="true" />
                                Send {businessName} for review
                            </Button>

                            {businessSlug && (
                                <Link
                                    href={`/businesses/${businessSlug}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-sm font-medium underline underline-offset-4"
                                >
                                    Read it over first
                                </Link>
                            )}
                        </div>
                    </form>
                )
            }
        >
            <p className="leading-7 text-[#17233B]/70">
                Nothing is public until you send it. We read every page — usually the same
                day — and email you when it goes live.
            </p>

            {missing.length > 0 && (
                <div className="mt-5 rounded-xl border border-dashed border-[#17233B]/20 bg-[#FFF8F0] p-4">
                    <p className="flex items-center gap-2 text-sm font-medium">
                        <FiClock aria-hidden="true" className="text-[#FF593F]" />
                        {missing.length === 1 ? "One thing first" : `${missing.length} things first`}
                    </p>

                    <ul className="mt-3 space-y-1.5">
                        {missing.map((step) => (
                            <li key={step.id}>
                                <button
                                    type="button"
                                    onClick={() => onGo(step.id)}
                                    className="cursor-pointer text-sm font-medium text-[#FF593F] underline-offset-4 hover:underline"
                                >
                                    {step.title}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </StepCard>
    );
}

export function OfferStep({ businessId }: { businessId: string }) {
    return (
        <StepCard
            errorTitle="Unable to start an offer"
            footer={
                <Button
                    render={<Link href={`/business/${businessId}/offers/new?from=setup`} />}
                    nativeButton={false}
                    size="lg"
                >
                    Create my first offer
                    <FiArrowRight aria-hidden="true" />
                </Button>
            }
        >
            <p className="leading-7 text-[#17233B]/70">
                An offer is what brings someone in the first time: a free side, 20% off, a
                coffee with any pastry. It goes on your page, and on a QR poster for your
                window that people scan to claim it.
            </p>

            <p className="mt-4 text-sm leading-6 text-[#17233B]/60">
                We read every offer before customers see it, the same way we read your page.
            </p>
        </StepCard>
    );
}
