import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const metadata = {
    title: { absolute: "About Promotello for Businesses" },
    description:
        "Promotello helps independent businesses turn first-time visitors into regulars with promotions, loyalty cards, QR posters and follower emails.",
};

const principles = [
    {
        number: "01",
        title: "Simple to understand",
        description:
            "Your promotion should be clear to customers and easy for your team to manage. We focus on practical tools rather than unnecessary complexity.",
    },
    {
        number: "02",
        title: "Built for local businesses",
        description:
            "Promotello is designed around the realities of running a local business: limited time, changing demand, and the need to see what is working.",
    },
    {
        number: "03",
        title: "Honest by design",
        description:
            "We want businesses to understand what they are paying for, how promotions perform, and where the platform can genuinely help.",
    },
];

const features = [
    {
        title: "Bring people in",
        description:
            "Promotions customers claim on their phone, QR posters for your window and till, and a page in the Promotello directory.",
    },
    {
        title: "Bring them back",
        description:
            "A digital loyalty card, emails to your followers about every new promotion, and on Growth, welcome, birthday and win-back rewards that send themselves.",
    },
    {
        title: "See what it's worth",
        description:
            "Views, claims, visits, scans and stamps every month, compared with the month before, so you know whether it's working.",
    },
];

export default function About() {
    return (
        <main className="min-h-screen bg-[#FFF8F0] text-[#17233B]">
            <section className="relative overflow-hidden bg-[#17233B]">
                <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full bg-[#FF593F]/20 blur-3xl" />
                <div className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-[#FF8F7D]/10 blur-3xl" />

                <div className="relative mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
                    <div className="max-w-3xl">
                        <Badge className="bg-[#FF593F] text-[#17233B] hover:bg-[#FF593F]">
                            For local businesses
                        </Badge>

                        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-6xl">
                            Helping independent businesses turn first-time
                            visitors into regulars.
                        </h1>

                        <p className="mt-6 max-w-2xl text-lg leading-8 text-white/70">
                            Big chains have apps and loyalty schemes. Promotello
                            gives independent cafés, shops, salons, studios and
                            more the same tools, without the cost or the
                            complexity.
                        </p>

                        <div className="mt-8 flex flex-wrap gap-3">
                            <Button
                                render={<Link href="/business/register" />}
                                nativeButton={false}
                                size="lg"
                                className="bg-[#FF593F] text-[#17233B] hover:bg-[#ff735e]"
                            >
                                Get started
                            </Button>

                            <Button
                                render={
                                    <Link href="/business/how-it-works" />
                                }
                                nativeButton={false}
                                size="lg"
                                variant="outline"
                                className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
                            >
                                See how it works
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
                <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C8371D]">
                            Why Promotello
                        </p>

                        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                            Growth tools without the guesswork.
                        </h2>
                    </div>

                    <div className="space-y-6 text-lg leading-8 text-[#17233B]/70">
                        <p>
                            Most independent businesses don&apos;t struggle to
                            make a good first impression. The hard part is
                            getting that first-time visitor to come back, and
                            knowing whether anything you try is working.
                        </p>

                        <p>
                            Promotello works from day one with the customers you
                            already have: a promotion to try, a loyalty card on
                            their phone, a poster that turns passers-by into
                            followers, and emails that keep you in mind. Your
                            staff need nothing but their own phones.
                        </p>

                        <p>
                            We&apos;re building it around clarity: tools that
                            are quick to set up, results you can see every
                            month, and a free plan so you can try it before
                            you pay.
                        </p>
                    </div>
                </div>
            </section>

            <section className="border-y border-[#17233B]/10 bg-white">
                <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
                    <div className="max-w-2xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C8371D]">
                            What you get
                        </p>

                        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                            Practical tools for everyday business decisions.
                        </h2>
                    </div>

                    <div className="mt-10 grid gap-6 md:grid-cols-3">
                        {features.map((feature) => (
                            <Card
                                key={feature.title}
                                className="rounded-3xl border-[#17233B]/10 shadow-none"
                            >
                                <CardHeader>
                                    <CardTitle className="text-xl">
                                        {feature.title}
                                    </CardTitle>
                                </CardHeader>

                                <CardContent>
                                    <p className="leading-7 text-[#17233B]/65">
                                        {feature.description}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
                <div className="grid gap-6 lg:grid-cols-3">
                    {principles.map((principle) => (
                        <Card
                            key={principle.number}
                            className="rounded-3xl border-[#17233B]/10 bg-transparent shadow-none"
                        >
                            <CardHeader>
                                <p className="text-sm font-semibold text-[#C8371D]">
                                    {principle.number}
                                </p>

                                <CardTitle className="mt-2 text-2xl">
                                    {principle.title}
                                </CardTitle>
                            </CardHeader>

                            <CardContent>
                                <p className="leading-7 text-[#17233B]/65">
                                    {principle.description}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            <section className="mx-auto max-w-5xl px-6 pb-20 sm:px-10">
                <div className="rounded-3xl bg-[#FF593F] px-6 py-12 text-center sm:px-12">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#17233B]/70">
                        Ready when you are
                    </p>

                    <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#17233B] sm:text-4xl">
                        Start free with one promotion.
                    </h2>

                    <p className="mx-auto mt-4 max-w-2xl leading-7 text-[#17233B]/70">
                        Set up your page, create a promotion and print your
                        QR poster. Upgrade when you can see it working.
                    </p>

                    <div className="mt-7 flex flex-wrap justify-center gap-3">
                        <Button
                            render={<Link href="/business/register" />}
                            nativeButton={false}
                            size="lg"
                            className="bg-[#17233B] text-white hover:bg-[#293b60]"
                        >
                            Create a business account
                        </Button>

                        <Button
                            render={<Link href="/business/contact" />}
                            nativeButton={false}
                            size="lg"
                            variant="outline"
                            className="border-[#17233B]/20 bg-transparent text-[#17233B] hover:bg-[#17233B]/10"
                        >
                            Talk to us
                        </Button>
                    </div>
                </div>
            </section>

            <Separator />

            <section className="mx-auto max-w-7xl px-6 py-10 text-center sm:px-10">
                <p className="text-sm text-[#17233B]/70">
                    We are building Promotello with local businesses, not just
                    for them.
                </p>
            </section>
        </main>
    );
}