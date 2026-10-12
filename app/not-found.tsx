import Link from "next/link";

export default function NotFound() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-[#FFF8F0] px-6">
            <section className="w-full max-w-lg rounded-3xl bg-white p-10 text-center shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                    404
                </p>

                <h1 className="mt-4 text-3xl font-semibold">
                    Page not found
                </h1>

                <p className="mt-3 leading-7 text-[#17233B]/65">
                    The page you’re looking for doesn’t exist or is no longer available.
                </p>

                <Link
                    href="/"
                    className="mt-8 inline-flex rounded-xl bg-[#FF593F] px-6 py-3 font-semibold transition hover:bg-[#E94D36]"
                >
                    Return home
                </Link>
            </section>
        </main>
    );
}