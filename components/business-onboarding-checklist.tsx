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
import { Progress } from "@/components/ui/progress";

export type ChecklistItem = {
    id: string;
    label: string;
    description: string;
    completed: boolean;
    href: string;
};

type BusinessOnboardingChecklistProps = {
    items: ChecklistItem[];
};

export function BusinessOnboardingChecklist({
    items,
}: BusinessOnboardingChecklistProps) {
    const completedCount = items.filter((item) => item.completed).length;
    const progress =
        items.length > 0
            ? Math.round((completedCount / items.length) * 100)
            : 0;

    return (
        <Card className="rounded-3xl">
            <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <CardTitle>Get your business ready</CardTitle>

                        <CardDescription className="mt-2">
                            Complete these steps to get the most from Promotello.
                        </CardDescription>
                    </div>

                    <Badge variant={progress === 100 ? "default" : "secondary"}>
                        {completedCount} of {items.length} complete
                    </Badge>
                </div>

                <div className="pt-4">
                    <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-[#17233B]/60">
                            Setup progress
                        </span>

                        <span className="font-semibold text-[#17233B]">
                            {progress}%
                        </span>
                    </div>

                    <Progress value={progress} />
                </div>
            </CardHeader>

            <CardContent>
                <div className="space-y-3">
                    {items.map((item) => (
                        <div
                            key={item.id}
                            className="flex flex-col gap-4 rounded-2xl border border-[#17233B]/10 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                            <div className="flex gap-3">
                                <div
                                    className={
                                        item.completed
                                            ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700"
                                            : "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FFF4E8] text-sm font-bold text-[#FF593F]"
                                    }
                                >
                                    {item.completed ? "✓" : "!"}
                                </div>

                                <div>
                                    <p className="font-semibold text-[#17233B]">
                                        {item.label}
                                    </p>

                                    <p className="mt-1 text-sm leading-6 text-[#17233B]/60">
                                        {item.description}
                                    </p>
                                </div>
                            </div>

                            <Button
                                render={<Link href={item.href} />}
                                nativeButton={false}
                                variant={item.completed ? "outline" : "default"}
                                size="sm"
                                className="shrink-0"
                            >
                                {item.completed ? "View" : "Complete"}
                            </Button>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}