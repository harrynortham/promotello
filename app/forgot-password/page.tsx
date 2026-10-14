"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/utils/supabase/client";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setIsSubmitting(true);
        setMessage("");
        setErrorMessage("");

        const supabase = createClient();

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        });

        setIsSubmitting(false);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        setMessage("Check your email for a password reset link.");
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#FFF8F0] px-6 py-12">
            <Card className="w-full max-w-md border-[#17233B]/10 shadow-sm">
                <CardHeader>
                    <Button
                        render={<Link href="/login" />}
                        nativeButton={false}
                        variant="link"
                        size="sm"
                        className="w-fit p-0 text-[#FF593F]"
                    >
                        ← Back to sign in
                    </Button>

                    <CardTitle className="mt-5 text-3xl tracking-tight">
                        Reset your password
                    </CardTitle>

                    <p className="text-[#17233B]/65">
                        Enter your email and we’ll send you a reset link.
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

                        {errorMessage && (
                            <Alert variant="destructive">
                                <AlertTitle>Unable to send reset link</AlertTitle>

                                <AlertDescription>
                                    {errorMessage}
                                </AlertDescription>
                            </Alert>
                        )}

                        {message && (
                            <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
                                <AlertTitle>Reset link sent</AlertTitle>

                                <AlertDescription>{message}</AlertDescription>
                            </Alert>
                        )}

                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            variant="default"
                            size="lg"
                            className="w-full"
                        >
                            {isSubmitting ? "Sending link…" : "Send reset link"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </main>
    );
}