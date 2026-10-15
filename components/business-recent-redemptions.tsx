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
};

type BusinessRecentRedemptionsProps = {
    businessId: string;
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

export function BusinessRecentRedemptions({
    businessId,
    redemptions,
}: BusinessRecentRedemptionsProps) {
    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <CardTitle>Recent redemptions</CardTitle>

                        <CardDescription>
                            The latest customers using your promotions.
                        </CardDescription>
                    </div>

                    <Button
                        render={
                            <Link
                                href={`/business/${businessId}/redemptions`}
                            />
                        }
                        nativeButton={false}
                        variant="outline"
                        size="sm"
                    >
                        View all
                    </Button>
                </div>
            </CardHeader>

            <CardContent>
                {redemptions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#17233B]/15 p-6 text-center">
                        <p className="font-medium">
                            No redemptions yet
                        </p>

                        <p className="mt-2 text-sm text-[#17233B]/60">
                            Customer activity will appear here when someone
                            redeems a promotion.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {redemptions.map((redemption, index) => (
                            <div key={redemption.id}>
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="font-semibold">
                                            {redemption.offer?.title ??
                                                "Promotion"}
                                        </p>

                                        <p className="mt-1 text-sm text-[#17233B]/60">
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