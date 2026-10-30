import { FiEye } from "react-icons/fi";

// Shown to a business's own team when they view its page or an offer before
// it's approved. Nobody else can load these pages until then (RLS).
export function PreviewNotice({ what }: { what: "business" | "offer" }) {
    return (
        <div role="note" className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold">
                <FiEye aria-hidden="true" />
                Preview
            </span>
            <p className="min-w-0 flex-1">
                {what === "business"
                    ? "This is how your page will look. Only you and your team can see it until our team approves it."
                    : "This is how your offer will look. Only you and your team can see it until it's approved, and it can't be claimed yet."}
            </p>
        </div>
    );
}
