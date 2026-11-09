import Link from "next/link";
import { FiArrowRight, FiCheck } from "react-icons/fi";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { checklistView, type ChecklistGroup } from "@/lib/onboarding-checklist";

export type { ChecklistGroup, ChecklistItem } from "@/lib/onboarding-checklist";

export function BusinessOnboardingChecklist({ groups }: { groups: ChecklistGroup[] }) {
    const view = checklistView(groups);

    // Finished: the card has nothing to say, and said it above the
    // numbers that do.
    if (view.done) {
        return null;
    }

    const { ready, completedCount, requiredCount, progress } = view;

    return (
        <Card className="rounded-xl">
            <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <CardTitle>{ready ? "What's next" : "Get your business ready"}</CardTitle>
                        <CardDescription className="mt-2">
                            {ready
                                ? "Your profile is done. These are the things that bring people in."
                                : "A complete profile with an offer gets far more visits. Here's what's left."}
                        </CardDescription>
                    </div>

                    {!ready && (
                        <Badge variant="secondary">
                            {completedCount} of {requiredCount} done
                        </Badge>
                    )}
                </div>

                {/* The bar measures setup. Once setup is finished there
                    is nothing for it to measure. */}
                {!ready && (
                    <div className="pt-4">
                        <Progress value={progress} aria-label={`Setup ${progress}% complete`} />
                    </div>
                )}
            </CardHeader>

            <CardContent className="space-y-8">
                {view.groups.map((group) => (
                    <section key={group.title}>
                        <div className="mb-3">
                            <h3 className="font-semibold text-[#17233B]">{group.title}</h3>
                            <p className="text-sm text-[#17233B]/70">{group.description}</p>
                        </div>

                        <ul className="space-y-2.5">
                            {group.items.map((item) => {
                                const isNext = item.id === view.nextStepId;

                                return (
                                    <li
                                        key={item.id}
                                        className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${isNext
                                            ? "border-[#FF593F] bg-[#FF593F]/5"
                                            : item.locked
                                                ? "border-dashed border-[#17233B]/15"
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
                                                <p className={`font-medium ${item.completed ? "text-[#17233B]/70 line-through decoration-[#17233B]/25" : "text-[#17233B]"}`}>
                                                    {item.label}
                                                    {item.pro && (
                                                        <Badge variant="outline" className="ml-2 border-[#FF593F]/30 text-[10px] text-[#FF593F]">
                                                            Pro
                                                        </Badge>
                                                    )}
                                                </p>
                                                {!item.completed && (
                                                    <p className="mt-0.5 text-sm leading-6 text-[#17233B]/70">
                                                        {item.locked && item.lockedReason ? item.lockedReason : item.description}
                                                    </p>
                                                )}
                                                {item.completed && <span className="sr-only">Done</span>}
                                            </div>
                                        </div>

                                        {item.completed ? (
                                            <Button render={<Link href={item.href} />} nativeButton={false} variant="ghost" size="sm" className="shrink-0 text-[#17233B]/70">
                                                Edit
                                            </Button>
                                        ) : item.locked ? (
                                            <Button type="button" variant="outline" size="sm" className="shrink-0" disabled>
                                                {item.action}
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
