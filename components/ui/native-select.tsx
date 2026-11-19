import { ChevronDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";

// A plain <select>, styled to match Input.
//
// There is a Select in this folder built on @base-ui/react, which is the
// right thing for a long list that wants search or a custom row. This is
// for the short, ordinary ones — a handful of areas, a stage, a trade —
// where the browser's own control is better: it is keyboard-accessible
// for free, and on a phone it opens the native wheel rather than a list
// nobody can reach with a thumb.
//
// It exists because every one of these was being hand-styled at h-10
// while Input is h-12, so a filter bar with both in it had two heights
// in a row. The height is the reason, but the chevron is why it is worth
// a component: a native select with a border and no arrow reads as a
// text field until you click it.
function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
    return (
        <div className="relative w-full">
            <select
                data-slot="native-select"
                className={cn(
                    "h-12 w-full min-w-0 appearance-none rounded-lg border border-input bg-transparent py-1 pl-2.5 pr-9 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30",
                    className,
                )}
                {...props}
            >
                {children}
            </select>

            <ChevronDownIcon
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
        </div>
    );
}

export { NativeSelect };
