import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

const categories = [
    {
        name: "Food & drink",
        description:
            "Discover restaurants, cafés, takeaways, bars, and local food spots.",
        emoji: "🍽️",
        color: "bg-orange-100",
    },
    {
        name: "Things to do",
        description:
            "Find activities, experiences, entertainment, and days out.",
        emoji: "🎟️",
        color: "bg-blue-100",
    },
    {
        name: "Shopping",
        description:
            "Save money at independent shops, retailers, and local makers.",
        emoji: "🛍️",
        color: "bg-pink-100",
    },
    {
        name: "Health & beauty",
        description:
            "Explore salons, spas, fitness studios, and wellness services.",
        emoji: "✨",
        color: "bg-purple-100",
    },
    {
        name: "Services",
        description:
            "Find trusted local services for your home, car, family, and lifestyle.",
        emoji: "🛠️",
        color: "bg-emerald-100",
    },
    {
        name: "Travel & stays",
        description:
            "Discover local hotels, getaways, attractions, and travel experiences.",
        emoji: "🧳",
        color: "bg-cyan-100",
    },
];

export default function CategoriesPage() {
    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-12 text-[#17233B] sm:px-10">
            <div className="mx-auto max-w-7xl">
                <section className="mx-auto max-w-3xl text-center">
                    <Badge className="bg-[#FF593F] text-[#17233B] hover:bg-[#FF593F]">
                        Browse by category
                    </Badge>

                    <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
                        Find something you’ll love.
                    </h1>

                    <p className="mt-5 text-lg leading-8 text-[#17233B]/65">
                        Explore local promotions by the things you enjoy most.
                        From dinner out to new experiences, there’s always
                        something nearby to discover.
                    </p>
                </section>

                <section className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {categories.map((category) => (
                        <Card
                            key={category.name}
                            className="group flex h-full flex-col rounded-3xl border-[#17233B]/10 transition-all hover:-translate-y-1 hover:shadow-lg"
                        >
                            <CardHeader>
                                <div
                                    className={`flex h-16 w-16 items-center justify-center rounded-2xl text-3xl ${category.color}`}
                                >
                                    <span aria-hidden="true">
                                        {category.emoji}
                                    </span>
                                </div>

                                <CardTitle className="mt-4 text-2xl">
                                    {category.name}
                                </CardTitle>

                                <CardDescription className="text-base leading-7">
                                    {category.description}
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="mt-auto">
                                <Button
                                    render={
                                        <Link
                                            href={`/explore?category=${encodeURIComponent(
                                                category.name,
                                            )}`}
                                        />
                                    }
                                    nativeButton={false}
                                    variant="outline"
                                    className="w-full"
                                >
                                    Explore {category.name}
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </section>

                <section className="mt-16 rounded-3xl bg-[#17233B] px-6 py-10 text-center text-white sm:px-10">
                    <h2 className="text-3xl font-semibold tracking-tight">
                        Looking for something specific?
                    </h2>

                    <p className="mx-auto mt-3 max-w-2xl leading-7 text-white/70">
                        Search all available promotions and discover great
                        offers from local businesses.
                    </p>

                    <Button
                        render={<Link href="/explore" />}
                        nativeButton={false}
                        className="mt-7 bg-[#FF593F] text-[#17233B] hover:bg-[#ff735e]"
                    >
                        Explore all promotions
                    </Button>
                </section>
            </div>
        </main>
    );
}