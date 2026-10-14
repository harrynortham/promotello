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

export default function LoginPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setIsSubmitting(true);
        setErrorMessage("");

        const supabase = createClient();

        const { error } = await supabase.auth.signInWithPassword({
            email,
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
                        Welcome back
                    </CardTitle>

                    <p className="text-[#17233B]/65">
                        Sign in to manage your businesses and promotions.
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
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                placeholder="Your password"
                            />
                        </div>

                        <div className="text-right">
                            <Button
                                render={<Link href="/forgot-password" />}
                                nativeButton={false}
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-[#FF593F]"
                            >
                                Forgot password?
                            </Button>
                        </div>

                        {errorMessage && (
                            <Alert variant="destructive">
                                <AlertTitle>Unable to sign in</AlertTitle>

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
                            {isSubmitting ? "Signing in…" : "Sign in"}
                        </Button>
                    </form>

                    <Separator className="my-6" />

                    <p className="text-center text-sm text-[#17233B]/65">
                        Don’t have an account?{" "}
                        <Button
                            render={<Link href="/signup" />}
                            nativeButton={false}
                            variant="link"
                            size="sm"
                            className="h-auto p-0 font-semibold text-[#FF593F]"
                        >
                            Create one
                        </Button>
                    </p>
                </CardContent>
            </Card>
        </main>
    );
}