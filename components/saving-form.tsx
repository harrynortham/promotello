"use client";

import { useActionState } from "react";
import { FiAlertCircle, FiCheck } from "react-icons/fi";

// A form that saves without leaving the page.
//
// These actions used to end in a redirect to ?saved=…, which nothing
// ever rendered: the parameter was read into the page's props and never
// shown. So the navigation bought no confirmation at all, and cost the
// thing a long admin form can least afford — a redirect remounts the
// page, and anything typed into one of the other sections and not yet
// saved goes with it. Somebody filling in an address, a phone number
// and a note loses two of the three by saving one.
//
// Now the action returns what happened and the form says so in place.
// Nothing navigates, so the other sections keep what is in them.
export type SaveResult = { saved?: string; error?: string } | null;

export function SavingForm({
    action,
    className,
    children,
}: {
    action: (state: SaveResult, formData: FormData) => Promise<SaveResult>;
    className?: string;
    children: React.ReactNode;
}) {
    const [state, submit] = useActionState(action, null);

    return (
        <form action={submit} className={className}>
            {children}

            {state?.error && (
                <p
                    role="alert"
                    className="flex items-center gap-2 text-sm font-medium text-red-700"
                >
                    <FiAlertCircle aria-hidden="true" className="size-4 shrink-0" />
                    {state.error}
                </p>
            )}

            {state?.saved && !state.error && (
                // Polite rather than assertive: it is a confirmation, and
                // it should not interrupt somebody already typing in the
                // next field.
                <p
                    aria-live="polite"
                    className="flex items-center gap-2 text-sm font-medium text-emerald-700"
                >
                    <FiCheck aria-hidden="true" className="size-4 shrink-0" />
                    {state.saved}
                </p>
            )}
        </form>
    );
}
