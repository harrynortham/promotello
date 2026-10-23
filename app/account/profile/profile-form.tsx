"use client";

import Image from "next/image";
import Link from "next/link";
import {
    useRef,
    useState,
    type ChangeEvent,
    type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
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
import { createClient } from "@/utils/supabase/client";
import { initialsFor } from "@/lib/user-profile";

type ProfileFormProps = {
    initialProfile: {
        name: string;
        city: string;
        avatarPath: string;
        email: string;
    };
};

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

    const [name, setName] = useState(initialProfile.name);
    const [city, setCity] = useState(initialProfile.city);
    const [avatarPath, setAvatarPath] = useState(
        initialProfile.avatarPath,
    );

    const [isSaving, setIsSaving] = useState(false);
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

    async function saveProfile(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (busyRef.current) return;

        clearMessages();

        if (!name.trim()) {
            setErrorMessage("Please enter your display name.");
            return;
        }

        busyRef.current = true;
        setIsSaving(true);

        try {
            const { error } = await supabase.auth.updateUser({
                data: {
                    full_name: name.trim(),
                    city: city.trim(),
                },
            });

            if (error) throw error;

            setName(name.trim());
            setCity(city.trim());
            setSuccessMessage("Your profile details have been saved.");
            router.refresh();
        } catch {
            setErrorMessage(
                "We couldn’t save your profile. Please try again.",
            );
        } finally {
            busyRef.current = false;
            setIsSaving(false);
        }
    }

    async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];

        event.target.value = "";

        if (!file || busyRef.current) return;

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
                        onSubmit={saveProfile}
                        className="space-y-6"
                        aria-busy={isSaving}
                    >
                        <div className="space-y-2">
                            <Label htmlFor="profile-name">
                                Display name
                            </Label>
                            <Input
                                id="profile-name"
                                name="name"
                                value={name}
                                onChange={(event) =>
                                    setName(event.target.value)
                                }
                                autoComplete="name"
                                placeholder="Your name"
                                required
                                maxLength={100}
                                disabled={isBusy}
                            />
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
                                name="city"
                                value={city}
                                onChange={(event) =>
                                    setCity(event.target.value)
                                }
                                autoComplete="address-level2"
                                placeholder="For example, Bristol"
                                maxLength={100}
                                disabled={isBusy}
                            />
                            <p className="text-xs leading-6 text-muted-foreground">
                                Save your preferred town or city.
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