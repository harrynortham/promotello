import Link from "next/link";
import { FiArrowRight, FiCheck } from "react-icons/fi";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export type ChecklistItem = {
    id: string;
    label: string;
    description: string;
    completed: boolean;
    href: string;
    // What the button says while the step is still to do, e.g. "Add your logo".
    action: string;
    pro?: boolean;
};

export type ChecklistGroup = {
    title: string;
    description: string;
    items: ChecklistItem[];
    // Only required groups count towards setup progress.
    required: boolean;
};

export function BusinessOnboardingChecklist({ groups }: { groups: ChecklistGroup[] }) {
    const required = groups.filter((group) => group.required).flatMap((group) => group.items);
    const completedCount = required.filter((item) => item.completed).length;
    const progress = required.length ? Math.round((completedCount / required.length) * 100) : 100;
    const nextStep = groups.flatMap((group) => group.items).find((item) => !item.completed);
    const ready = completedCount === required.length;

    return (
        <Card className="rounded-3xl">
            <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <CardTitle>{ready ? "You're ready to go live" : "Get your business ready"}</CardTitle>
                        <CardDescription className="mt-2">
                            {ready
                                ? "Your profile is complete. Now bring customers in with posters and a loyalty card."
                                : "A complete profile with an offer gets far more visits. Here's what's left."}
                        </CardDescription>
                    </div>

                    <Badge variant={ready ? "default" : "secondary"}>
                        {completedCount} of {required.length} done
                    </Badge>
                </div>

                <div className="pt-4">
                    <Progress value={progress} aria-label={`Setup ${progress}% complete`} />
                </div>
            </CardHeader>

            <CardContent className="space-y-8">
                {groups.map((group) => (
                    <section key={group.title}>
                        <div className="mb-3">
                            <h3 className="font-semibold text-[#17233B]">{group.title}</h3>
                            <p className="text-sm text-[#17233B]/60">{group.description}</p>
                        </div>

                        <ul className="space-y-2.5">
                            {group.items.map((item) => {
                                const isNext = item.id === nextStep?.id;

                                return (
                                    <li
                                        key={item.id}
                                        className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${isNext
                                            ? "border-[#FF593F] bg-[#FF593F]/5"
                                            : "border-[#17233B]/10"
                                            }`}
                                    >
                                        <div className="flex gap-3">
                                            <span
                                                className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ${item.completed
                                                    ? "bg-emerald-100 text-emerald-700"
                                                    : "border-2 border-[#17233B]/15"
                                                    }`}
                                            >
                                                {item.completed && <FiCheck aria-hidden="true" className="size-3.5" />}
                                            </span>

                                            <div>
                                                <p className={`font-medium ${item.completed ? "text-[#17233B]/55 line-through decoration-[#17233B]/25" : "text-[#17233B]"}`}>
                                                    {item.label}
                                                    {item.pro && (
                                                        <Badge variant="outline" className="ml-2 border-[#FF593F]/30 text-[10px] text-[#FF593F]">
                                                            Pro
                                                        </Badge>
                                                    )}
                                                </p>
                                                {!item.completed && (
                                                    <p className="mt-0.5 text-sm leading-6 text-[#17233B]/60">{item.description}</p>
                                                )}
                                                {item.completed && <span className="sr-only">Done</span>}
                                            </div>
                                        </div>

                                        {item.completed ? (
                                            <Button render={<Link href={item.href} />} nativeButton={false} variant="ghost" size="sm" className="shrink-0 text-[#17233B]/60">
                                                Edit
                                            </Button>
                                        ) : (
                                            <Button
                                                render={<Link href={item.href} />}
                                                nativeButton={false}
                                                variant={isNext ? "default" : "outline"}
                                                size="sm"
                                                className="shrink-0"
                                            >
                                                {item.action}
                                                {isNext && <FiArrowRight aria-hidden="true" />}
                                            </Button>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                ))}
            </CardContent>
        </Card>
    );
}
