import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createClient } from "@/utils/supabase/server";

type BusinessLocation = {
    city: string | null;
    region: string | null;
};

type Business = {
    id: string;
    name: string;
    category: string | null;
    approval_status: string;
    business_locations:
    | BusinessLocation[]
    | BusinessLocation
    | null;
};

type Membership = {
    role: "owner" | "admin" | "member";
    businesses: Business | Business[] | null;
};

function LoadingState() {
    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-12">
            <div className="mx-auto max-w-5xl">
                <div className="h-10 w-72 animate-pulse rounded-md bg-[#17233B]/10" />

                <div className="mt-10 grid gap-6 md:grid-cols-2">
                    <div className="h-64 animate-pulse rounded-xl bg-white" />
                    <div className="h-64 animate-pulse rounded-xl bg-white" />
                </div>
            </div>
        </main>
    );
}

async function BusinessDashboardContent() {
    await connection();

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data, error } = await supabase
        .from("business_members")
        .select(
            `
        role,
        businesses (
          id,
          name,
          category,
          approval_status,
          business_locations (
            city,
            region
          )
        )
      `,
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

    if (error) {
        throw new Error("Unable to load your businesses.");
    }

    const businesses = ((data ?? []) as Membership[])
        .map((membership) => {
            const business = Array.isArray(membership.businesses)
                ? membership.businesses[0]
                : membership.businesses;

            if (!business) {
                return null;
            }

            return {
                ...business,
                role: membership.role,
            };
        })
        .filter(Boolean) as Array<
            Business & { role: Membership["role"] }
        >;

    if (businesses.length === 0) {
        redirect("/onboarding");
    }

    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-12">
            <div className="mx-auto max-w-5xl">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <Badge
                            variant="outline"
                            className="border-[#FF593F]/30 bg-[#FF593F]/10 text-[#FF593F]"
                        >
                            Business area
                        </Badge>

                        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#17233B]">
                            Your businesses
                        </h1>

                        <p className="mt-3 text-[#17233B]/65">
                            Choose a business to manage its promotions, team and settings.
                        </p>
                    </div>

                    <Button
                        render={<Link href="/dashboard" />}
                        nativeButton={false}
                        variant="outline"
                        size="sm"
                    >
                        Customer dashboard
                    </Button>
                </div>

                <div className="mt-10 grid gap-6 md:grid-cols-2">
                    {businesses.map((business) => {
                        const location = Array.isArray(
                            business.business_locations,
                        )
                            ? business.business_locations[0]
                            : business.business_locations;

                        const locationText = [location?.city, location?.region]
                            .filter(Boolean)
                            .join(", ");

                        const isApproved =
                            business.approval_status === "approved";

                        return (
                            <Card
                                key={business.id}
                                className="border-[#17233B]/10 shadow-sm"
                            >
                                <CardHeader>
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-sm font-medium text-[#17233B]/55">
                                                {business.category || "Business"}
                                            </p>

                                            <CardTitle className="mt-2 text-2xl">
                                                {business.name}
                                            </CardTitle>

                                            {locationText && (
                                                <p className="mt-2 text-sm text-[#17233B]/60">
                                                    {locationText}
                                                </p>
                                            )}
                                        </div>

                                        <Badge
                                            variant="outline"
                                            className={
                                                isApproved
                                                    ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                                                    : "border-amber-200 bg-amber-100 text-amber-800"
                                            }
                                        >
                                            {business.approval_status}
                                        </Badge>
                                    </div>
                                </CardHeader>

                                <CardContent>
                                    {!isApproved && (
                                        <Alert className="mb-6 border-amber-200 bg-amber-50 text-amber-800">
                                            <AlertTitle>Approval pending</AlertTitle>

                                            <AlertDescription>
                                                This business must be approved before its promotions
                                                appear publicly.
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    <Button
                                        render={
                                            <Link href={`/business/${business.id}`} />
                                        }
                                        nativeButton={false}
                                        variant="default"
                                        size="lg"
                                        className="w-full"
                                    >
                                        Manage business
                                    </Button>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                <div className="mt-8">
                    <Button
                        render={<Link href="/onboarding" />}
                        nativeButton={false}
                        variant="outline"
                        size="sm"
                    >
                        Add another business
                    </Button>
                </div>
            </div>
        </main>
    );
}

export default function BusinessDashboardPage() {
    return (
        <Suspense fallback={<LoadingState />}>
            <BusinessDashboardContent />
        </Suspense>
    );
}