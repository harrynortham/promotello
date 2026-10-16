"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/utils/supabase/client";

export default function ResetPasswordPage() {
    const router = useRouter();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setErrorMessage("");

        if (password.length < 8) {
            setErrorMessage("Password must be at least 8 characters.");
            return;
        }

        if (password !== confirmPassword) {
            setErrorMessage("Passwords do not match.");
            return;
        }

        setIsSubmitting(true);

        const supabase = createClient();

        const { error } = await supabase.auth.updateUser({
            password,
        });

        setIsSubmitting(false);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        router.replace("/dashboard");
        router.refresh();
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#FFF8F0] px-6 py-12">
            <Card className="w-full max-w-md border-[#17233B]/10 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-3xl tracking-tight">
                        Choose a new password
                    </CardTitle>

                    <p className="text-[#17233B]/65">
                        Your new password must be at least 8 characters.
                    </p>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="password">New password</Label>

                            <Input
                                id="password"
                                type="password"
                                required
                                minLength={8}
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                placeholder="At least 8 characters"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">
                                Confirm password
                            </Label>

                            <Input
                                id="confirmPassword"
                                type="password"
                                required
                                minLength={8}
                                value={confirmPassword}
                                onChange={(event) =>
                                    setConfirmPassword(event.target.value)
                                }
                                placeholder="Repeat your password"
                            />
                        </div>

                        {errorMessage && (
                            <Alert variant="destructive">
                                <AlertTitle>Unable to update password</AlertTitle>

                                <AlertDescription>
                                    {errorMessage}
                                </AlertDescription>
                            </Alert>
                        )}

                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            variant="default"
                            size="lg"
                            className="w-full"
                        >
                            {isSubmitting
                                ? "Updating password…"
                                : "Update password"}
                        </Button>
                    </form>

                    <Separator className="my-6" />

                    <Button
                        render={<Link href="/login" />}
                        nativeButton={false}
                        variant="link"
                        size="sm"
                        className="w-full text-[#FF593F]"
                    >
                        Back to sign in
                    </Button>
                </CardContent>
            </Card>
        </main>
    );
}