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

export default function SignupPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setErrorMessage("");
        setSuccessMessage("");

        if (password !== confirmPassword) {
            setErrorMessage("Passwords do not match.");
            return;
        }

        if (password.length < 8) {
            setErrorMessage("Password must be at least 8 characters.");
            return;
        }

        setIsSubmitting(true);

        const supabase = createClient();

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        setIsSubmitting(false);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        setSuccessMessage(
            "Account created. Check your email to confirm your account.",
        );

        setEmail("");
        setPassword("");
        setConfirmPassword("");
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#FFF8F0] px-6 py-12">
            <Card className="w-full max-w-md border-[#17233B]/10 shadow-sm">
                <CardHeader>
                    <Button
                        render={<Link href="/" />}
                        nativeButton={false}
                        variant="link"
                        size="sm"
                        className="w-fit p-0 text-[#FF593F]"
                    >
                        ← Back to Promotello
                    </Button>

                    <CardTitle className="mt-5 text-3xl tracking-tight">
                        Create your account
                    </CardTitle>

                    <p className="text-[#17233B]/65">
                        Create an account to manage your businesses and promotions.
                    </p>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email address</Label>

                            <Input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                placeholder="you@example.com"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>

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
                                <AlertTitle>Unable to create account</AlertTitle>

                                <AlertDescription>
                                    {errorMessage}
                                </AlertDescription>
                            </Alert>
                        )}

                        {successMessage && (
                            <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
                                <AlertTitle>Account created</AlertTitle>

                                <AlertDescription>
                                    {successMessage}
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
                            {isSubmitting ? "Creating account…" : "Create account"}
                        </Button>
                    </form>

                    <Separator className="my-6" />

                    <p className="text-center text-sm text-[#17233B]/65">
                        Already have an account?{" "}
                        <Button
                            render={<Link href="/login" />}
                            nativeButton={false}
                            variant="link"
                            size="sm"
                            className="h-auto p-0 font-semibold text-[#FF593F]"
                        >
                            Sign in
                        </Button>
                    </p>
                </CardContent>
            </Card>
        </main>
    );
}