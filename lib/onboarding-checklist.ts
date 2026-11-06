// What the setup checklist should show, as plain data so it can be
// tested without rendering anything.

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

export type ChecklistView = {
    // Nothing left to do anywhere: the card goes entirely.
    done: boolean;
    // Every required step is done, so what is left is the optional half.
    ready: boolean;
    completedCount: number;
    requiredCount: number;
    progress: number;
    // The step to lead someone to, highlighted in the list.
    nextStepId: string | null;
    // The groups to render, which is not always the groups passed in.
    groups: ChecklistGroup[];
};

// Setup is a thing you finish. While it is unfinished the whole list is
// worth showing, ticks and all, because the ticks are the progress. Once
// the required half is done the ticks stop being information and start
// being clutter at the top of the dashboard, so only what is left is
// shown — and when nothing is left, nothing is shown.
export function checklistView(groups: ChecklistGroup[]): ChecklistView {
    const required = groups.filter((group) => group.required).flatMap((group) => group.items);
    const completedCount = required.filter((item) => item.completed).length;
    const requiredCount = required.length;
    const ready = completedCount === requiredCount;
    const remaining = groups.flatMap((group) => group.items).filter((item) => !item.completed);

    const shown = ready
        ? groups
            .filter((group) => !group.required)
            .map((group) => ({ ...group, items: group.items.filter((item) => !item.completed) }))
            .filter((group) => group.items.length > 0)
        : groups;

    return {
        done: remaining.length === 0,
        ready,
        completedCount,
        requiredCount,
        progress: requiredCount ? Math.round((completedCount / requiredCount) * 100) : 100,
        nextStepId: remaining[0]?.id ?? null,
        groups: shown,
    };
}
