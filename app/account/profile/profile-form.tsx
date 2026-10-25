"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { FiCamera, FiCheckCircle } from "react-icons/fi";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, invalidProps } from "@/components/field-error";
import { createClient } from "@/utils/supabase/client";
import { initialsFor } from "@/lib/user-profile";
import { optionalText, requiredText } from "@/lib/validation";

type ProfileFormProps = {
    initialProfile: {
        name: string;
        city: string;
        avatarPath: string;
        email: string;
        birthMonth: number | null;
        birthDay: number | null;
    };
};

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const schema = z
    .object({
        name: requiredText("Your display name", { max: 100 }),
        city: optionalText("Town or city", 100),
        birthDay: z.string(),
        birthMonth: z.string(),
    })
    // Both or neither, and a real date (29 February is allowed).
    .refine((values) => Boolean(values.birthDay) === Boolean(values.birthMonth), {
        message: "Choose both the day and the month, or neither.",
        path: ["birthDay"],
    })
    .refine(
        (values) =>
            !values.birthDay ||
            Number(values.birthDay) <= new Date(Date.UTC(2000, Number(values.birthMonth), 0)).getUTCDate(),
        { message: "That date doesn’t exist.", path: ["birthDay"] },
    );

type Values = z.infer<typeof schema>;

const bucket = "profile-images";
const maximumFileSize = 2 * 1024 * 1024;

const imageExtensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
};

export default function ProfileForm({
    initialProfile,
}: ProfileFormProps) {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const busyRef = useRef(false);

    const {
        register,
        handleSubmit,
        reset,
        control,
        formState: { errors, isSubmitting: isSaving },
    } = useForm<Values>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: initialProfile.name,
            city: initialProfile.city,
            birthDay: initialProfile.birthDay ? String(initialProfile.birthDay) : "",
            birthMonth: initialProfile.birthMonth ? String(initialProfile.birthMonth) : "",
        },
    });

    const name = useWatch({ control, name: "name" });

    const [avatarPath, setAvatarPath] = useState(
        initialProfile.avatarPath,
    );

    const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const isBusy = isSaving || isUpdatingPhoto;

    const supabase = createClient();

    const avatarUrl = avatarPath
        ? supabase.storage.from(bucket).getPublicUrl(avatarPath).data.publicUrl
        : "";

    function clearMessages() {
        setErrorMessage("");
        setSuccessMessage("");
    }

    async function removeStoredImage(path: string) {
        if (!path) return;

        const { error } = await supabase.storage
            .from(bucket)
            .remove([path]);

        if (error) {
            console.error("Unable to remove previous profile image", error);
        }
    }

    async function saveProfile(values: Values) {
        if (isUpdatingPhoto) return;

        clearMessages();

        try {
            const { error } = await supabase.auth.updateUser({
                data: { full_name: values.name, city: values.city },
            });

            if (error) throw error;

            // Birthday (day and month only) lives in its own table, for
            // birthday treats from businesses the customer follows.
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                const { error: birthdayError } = values.birthMonth && values.birthDay
                    ? await supabase.from("customer_birthdays").upsert({
                        user_id: user.id,
                        birth_month: Number(values.birthMonth),
                        birth_day: Number(values.birthDay),
                        updated_at: new Date().toISOString(),
                    })
                    : await supabase.from("customer_birthdays").delete().eq("user_id", user.id);

                if (birthdayError) throw birthdayError;
            }

            reset(values);
            setSuccessMessage("Your profile details have been saved.");
            router.refresh();
        } catch {
            setErrorMessage(
                "We couldn’t save your profile. Please try again.",
            );
        }
    }

    async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];

        event.target.value = "";

        if (!file || busyRef.current || isSaving) return;

        clearMessages();

        const extension = imageExtensions[file.type];

        if (!extension) {
            setErrorMessage("Choose a JPG, PNG, or WebP image.");
            return;
        }

        if (file.size > maximumFileSize) {
            setErrorMessage("Your photo must be smaller than 2 MB.");
            return;
        }

        busyRef.current = true;
        setIsUpdatingPhoto(true);

        let uploadedPath = "";

        try {
            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();

            if (userError || !user) {
                throw new Error("Please sign in again.");
            }

            const path =
                `${user.id}/${crypto.randomUUID()}.${extension}`;

            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(path, file, {
                    contentType: file.type,
                    cacheControl: "3600",
                    upsert: false,
                });

            if (uploadError) throw uploadError;

            uploadedPath = path;

            const publicUrl = supabase.storage
                .from(bucket)
                .getPublicUrl(path).data.publicUrl;

            const { error: updateError } = await supabase.auth.updateUser({
                data: {
                    avatar_path: path,
                    avatar_url: publicUrl,
                },
            });

            if (updateError) throw updateError;

            const previousPath = avatarPath;

            // Metadata now references the new image.
            uploadedPath = "";
            setAvatarPath(path);

            await removeStoredImage(previousPath);

            setSuccessMessage("Your profile photo has been updated.");
            router.refresh();
        } catch {
            if (uploadedPath) {
                await removeStoredImage(uploadedPath);
            }

            setErrorMessage(
                "We couldn’t upload your photo. Please try again.",
            );
        } finally {
            busyRef.current = false;
            setIsUpdatingPhoto(false);
        }
    }

    async function removePhoto() {
        if (busyRef.current || !avatarPath) return;

        clearMessages();
        busyRef.current = true;
        setIsUpdatingPhoto(true);

        try {
            const { error } = await supabase.auth.updateUser({
                data: {
                    avatar_path: null,
                    avatar_url: null,
                },
            });

            if (error) throw error;

            const previousPath = avatarPath;

            setAvatarPath("");
            await removeStoredImage(previousPath);

            setSuccessMessage("Your profile photo has been removed.");
            router.refresh();
        } catch {
            setErrorMessage(
                "We couldn’t remove your photo. Please try again.",
            );
        } finally {
            busyRef.current = false;
            setIsUpdatingPhoto(false);
        }
    }

    return (
        <section className="space-y-6">
            <div>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    Your profile
                </h1>

                <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
                    A few details to make your account feel like yours.
                    Your profile is shared across the customer and business
                    areas of Promotello.
                </p>
            </div>

            <div aria-live="polite" aria-atomic="true">
                {errorMessage && (
                    <Alert variant="destructive">
                        <AlertTitle>Something needs checking</AlertTitle>
                        <AlertDescription>
                            {errorMessage}
                        </AlertDescription>
                    </Alert>
                )}

                {successMessage && (
                    <Alert>
                        <FiCheckCircle aria-hidden="true" />
                        <AlertTitle>All saved</AlertTitle>
                        <AlertDescription>
                            {successMessage}
                        </AlertDescription>
                    </Alert>
                )}
            </div>

            <Card className="rounded-2xl shadow-none">
                <CardHeader>
                    <CardTitle>Profile photo</CardTitle>
                    <CardDescription>
                        Optional. You can use your initials instead.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                        <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-2xl font-semibold text-primary">
                            {avatarUrl ? (
                                <Image
                                    src={avatarUrl}
                                    alt="Your profile photo"
                                    width={96}
                                    height={96}
                                    className="size-24 object-cover"
                                />
                            ) : (
                                <span aria-label="Your initials">
                                    {initialsFor(name, initialProfile.email)}
                                </span>
                            )}
                        </div>

                        <div>
                            <div className="flex flex-wrap gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={isBusy}
                                    onClick={() =>
                                        fileInputRef.current?.click()
                                    }
                                >
                                    <FiCamera aria-hidden="true" />
                                    {isUpdatingPhoto
                                        ? "Updating…"
                                        : avatarPath
                                            ? "Change photo"
                                            : "Upload photo"}
                                </Button>

                                {avatarPath && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        disabled={isBusy}
                                        onClick={removePhoto}
                                    >
                                        Remove
                                    </Button>
                                )}
                            </div>

                            <p className="mt-3 text-xs leading-6 text-muted-foreground">
                                JPG, PNG, or WebP. Maximum 2 MB.
                                Photos are publicly accessible by URL.
                            </p>
                        </div>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        aria-label="Choose a profile photo"
                        className="hidden"
                        disabled={isBusy}
                        onChange={uploadPhoto}
                    />
                </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-none">
                <CardHeader>
                    <CardTitle>Personal details</CardTitle>
                    <CardDescription>
                        Your profile details don’t change your business
                        information.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form
                        onSubmit={handleSubmit(saveProfile)}
                        noValidate
                        className="space-y-6"
                        aria-busy={isSaving}
                    >
                        <div className="space-y-2">
                            <Label htmlFor="profile-name">
                                Display name
                            </Label>
                            <Input
                                id="profile-name"
                                autoComplete="name"
                                placeholder="Your name"
                                maxLength={100}
                                readOnly={isBusy}
                                {...register("name")}
                                {...invalidProps("profile-name-error", errors.name)}
                            />
                            <FieldError id="profile-name-error" message={errors.name?.message} />
                            <p className="text-xs leading-6 text-muted-foreground">
                                The name shown in your account menu.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="profile-city">
                                Town or city (optional)
                            </Label>
                            <Input
                                id="profile-city"
                                autoComplete="address-level2"
                                placeholder="For example, Bristol"
                                maxLength={100}
                                readOnly={isBusy}
                                {...register("city")}
                                {...invalidProps("profile-city-error", errors.city)}
                            />
                            <FieldError id="profile-city-error" message={errors.city?.message} />
                            <p className="text-xs leading-6 text-muted-foreground">
                                Save your preferred town or city.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="profile-birth-day">
                                Birthday (optional)
                            </Label>
                            <div className="grid max-w-sm grid-cols-[6rem_1fr] gap-3">
                                <select
                                    id="profile-birth-day"
                                    aria-label="Birthday day"
                                    {...register("birthDay")}
                                    {...invalidProps("profile-birthday-error", errors.birthDay)}
                                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                                >
                                    <option value="">Day</option>
                                    {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => (
                                        <option key={day} value={day}>{day}</option>
                                    ))}
                                </select>
                                <select
                                    aria-label="Birthday month"
                                    {...register("birthMonth")}
                                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                                >
                                    <option value="">Month</option>
                                    {monthNames.map((month, index) => (
                                        <option key={month} value={index + 1}>{month}</option>
                                    ))}
                                </select>
                            </div>
                            <FieldError id="profile-birthday-error" message={errors.birthDay?.message} />
                            <p className="text-xs leading-6 text-muted-foreground">
                                Businesses you follow may send you a birthday treat. We never ask for the year.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="profile-email">
                                Login email
                            </Label>
                            <Input
                                id="profile-email"
                                type="email"
                                value={initialProfile.email}
                                readOnly
                                className="bg-muted/40"
                            />
                            <p className="text-sm leading-6 text-muted-foreground">
                                Manage email changes in{" "}
                                <Link
                                    href="/account/security"
                                    className="font-medium text-foreground underline underline-offset-4"
                                >
                                    Security settings
                                </Link>
                                .
                            </p>
                        </div>

                        <div className="border-t pt-6">
                            <Button type="submit" disabled={isBusy}>
                                {isSaving
                                    ? "Saving changes…"
                                    : "Save changes"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </section>
    );
}