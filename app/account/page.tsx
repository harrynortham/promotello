import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/utils/supabase/server";
import { signOut } from "./actions";

export default function AccountPage() {
    return (
        <Suspense fallback={<AccountLoading />}>
            <AccountContent />
        </Suspense>
    );
}

async function AccountContent() {
    await connection();

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#FFF8F0] px-6 py-12">
            <Card className="w-full max-w-md border-[#17233B]/10 text-center shadow-sm">
                <CardHeader>
                    <Badge
                        variant="outline"
                        className="mx-auto border-emerald-200 bg-emerald-100 text-emerald-800"
                    >
                        Signed in
                    </Badge>

                    <CardTitle className="mt-3 text-3xl text-[#17233B]">
                        Welcome back
                    </CardTitle>

                    <p className="text-[#17233B]/65">{user.email}</p>
                </CardHeader>

                <CardContent>
                    <div className="flex flex-col gap-3">
                        <Button
                            render={<Link href="/dashboard" />}
                            nativeButton={false}
                            variant="default"
                            size="lg"
                        >
                            Customer dashboard
                        </Button>

                        <Button
                            render={<Link href="/business/dashboard" />}
                            nativeButton={false}
                            variant="outline"
                            size="lg"
                        >
                            Business dashboard
                        </Button>

                        <Button
                            render={<Link href="/forgot-password" />}
                            nativeButton={false}
                            variant="outline"
                            size="lg"
                        >
                            Change password
                        </Button>
                    </div>

                    <Separator className="my-6" />

                    <form action={signOut}>
                        <Button
                            type="submit"
                            variant="destructive"
                            size="lg"
                            className="w-full"
                        >
                            Sign out
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </main>
    );
}

function AccountLoading() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-[#FFF8F0] px-6">
            <Card className="w-full max-w-md border-[#17233B]/10 text-center">
                <CardContent className="p-8">
                    <p className="text-[#17233B]/65">
                        Loading your account...
                    </p>
                </CardContent>
            </Card>
        </main>
    );
}