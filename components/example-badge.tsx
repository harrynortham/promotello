// Marks the sample businesses and offers that show how Promotello works,
// so nobody mistakes them for real ones.
export function ExampleBadge({ className = "" }: { className?: string }) {
    return (
        <span
            title="An example to show how Promotello works, not a real business"
            className={`rounded-full bg-[#17233B] px-2.5 py-1 text-xs font-semibold text-white shadow-sm ${className}`}
        >
            Example
        </span>
    );
}

// Shown at the top of a sample business's or offer's page.
export function ExampleNotice({ what }: { what: "business" | "offer" }) {
    return (
        <div role="note" className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-[#17233B]/15 bg-white px-5 py-4 text-sm text-[#17233B]">
            <ExampleBadge />
            <p className="min-w-0 flex-1">
                {what === "business"
                    ? "This is an example business, to show how Promotello works. It isn't real, so its offers can't be claimed."
                    : "This is an example offer, to show how Promotello works. The business isn't real, so it can't be claimed."}
            </p>
        </div>
    );
}
