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
import { Separator } from "@/components/ui/separator";

type RecentRedemption = {
    id: string;
    redemption_code: string;
    redeemed_at: string | null;
    used_at: string | null;
    offer: {
        title: string;
        discount: string;
    } | null;
    business: {
        id: string;
        name: string;
    } | null;
};

type BusinessRecentActivityProps = {
    redemptions: RecentRedemption[];
};

function formatDate(value: string | null) {
    if (!value) {
        return "Date unavailable";
    }

    return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}

export function BusinessRecentActivity({
    redemptions,
}: BusinessRecentActivityProps) {
    return (
        <Card className="mt-8 rounded-3xl">
            <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <CardTitle>Recent activity</CardTitle>
                        <CardDescription>
                            The latest customer redemptions across your businesses.
                        </CardDescription>
                    </div>

                    <Button
                        render={
                            <Link href="/business/dashboard/redemptions" />
                        }
                        nativeButton={false}
                        variant="outline"
                        size="sm"
                    >
                        View all redemptions
                    </Button>
                </div>
            </CardHeader>

            <CardContent>
                {redemptions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#17233B]/15 p-6 text-center">
                        <p className="font-medium text-[#17233B]">
                            No redemptions yet
                        </p>

                        <p className="mt-2 text-sm text-[#17233B]/70">
                            Customer activity will appear here once someone
                            redeems one of your promotions.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {redemptions.map((redemption, index) => (
                            <div key={redemption.id}>
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0">
                                        <p className="truncate font-semibold text-[#17233B]">
                                            {redemption.offer?.title ??
                                                "Promotion"}
                                        </p>

                                        <p className="mt-1 text-sm text-[#17233B]/70">
                                            {redemption.business?.name ??
                                                "Business"}{" "}
                                            ·{" "}
                                            {formatDate(
                                                redemption.redeemed_at,
                                            )}
                                        </p>

                                        <p className="mt-2 font-mono text-sm tracking-wider text-[#17233B]/70">
                                            {redemption.redemption_code}
                                        </p>
                                    </div>

                                    <Badge
                                        variant={
                                            redemption.used_at
                                                ? "secondary"
                                                : "default"
                                        }
                                    >
                                        {redemption.used_at
                                            ? "Used"
                                            : "Awaiting use"}
                                    </Badge>
                                </div>

                                {index < redemptions.length - 1 && (
                                    <Separator className="mt-4" />
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}