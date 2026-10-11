export const instant = false;

type OfferPageProps = {
    params: Promise<{ slug: string }>;
};

export default async function OfferPage({ params }: OfferPageProps) {
    const { slug } = await params;

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#FFF8F0] px-6">
            <section className="w-full max-w-xl rounded-3xl bg-white p-8 shadow-sm">
                <p className="text-sm font-medium text-[#FF593F]">Local deal</p>

                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#17233B]">
                    Offer details
                </h1>

                <p className="mt-3 text-[#17233B]/65">
                    You’re viewing the offer: {slug}
                </p>
            </section>
        </main>
    );
}