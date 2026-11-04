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
