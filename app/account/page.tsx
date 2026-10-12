import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
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
    // Ensure authentication runs at request time
    await connection();

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#FFF8F0] px-6">
            <section className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
                <p className="text-sm font-medium text-[#FF593F]">
                    Signed in
                </p>

                <h1 className="mt-3 text-3xl font-semibold text-[#17233B]">
                    Welcome back
                </h1>

                <p className="mt-3 text-[#17233B]/65">
                    {user.email}
                </p>

                <form action={signOut} className="mt-6">
                    <button
                        type="submit"
                        className="w-full rounded-xl bg-[#FF593F] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#E94D36]"
                    >
                        Sign out
                    </button>
                </form>
            </section>

        </main>
    );
}

function AccountLoading() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-[#FFF8F0] px-6">
            <section className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
                <p className="text-[#17233B]/65">
                    Loading your account...
                </p>
            </section>
        </main>
    );
}