// Small daily bar chart (one series) with a hover tooltip per day. Used on
// business analytics and the admin overview.

export type DailyBar = {
    day: string;
    value: number;
    // Extra detail shown in the tooltip, after the value.
    detail?: string;
};

export function dayLabel(day: string) {
    return new Date(`${day}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function DailyBars({
    data,
    unit,
    emptyMessage,
}: {
    data: DailyBar[];
    // e.g. "views": used in the tooltip and accessible label.
    unit: string;
    emptyMessage: string;
}) {
    const max = Math.max(1, ...data.map((d) => d.value));
    const total = data.reduce((n, d) => n + d.value, 0);

    if (total === 0) {
        return (
            <p className="rounded-lg border border-dashed border-[#17233B]/15 px-4 py-10 text-center text-sm text-[#17233B]/70">
                {emptyMessage}
            </p>
        );
    }

    return (
        <div>
            <div className="relative h-40" role="img" aria-label={`Daily ${unit}, ${total} in total`}>
                <div className="absolute inset-x-0 top-0 border-t border-dashed border-[#17233B]/10" />
                <span className="absolute -top-2 right-0 bg-white pl-1 text-[10px] tabular-nums text-[#17233B]/65">{max}</span>
                <div className="absolute inset-0 flex items-end gap-[2px] border-b border-[#17233B]/15">
                    {data.map((d) => (
                        <div key={d.day} className="group relative flex h-full flex-1 items-end">
                            <div
                                className="w-full rounded-t-[4px] bg-[#FF593F]/80 group-hover:bg-[#FF593F]"
                                style={{ height: d.value > 0 ? `${Math.max((d.value / max) * 100, 3)}%` : 0 }}
                            />
                            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-[#17233B] px-2 py-1 text-xs text-white shadow group-hover:block">
                                <span className="font-semibold">{dayLabel(d.day)}</span> · {d.value} {unit}
                                {d.detail ? ` · ${d.detail}` : ""}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="mt-2 flex justify-between text-xs text-[#17233B]/65">
                <span>{data[0] ? dayLabel(data[0].day) : ""}</span>
                <span>Today</span>
            </div>
        </div>
    );
}
