"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    NOTE_MAX,
    noteIsRequired,
    reasonsFor,
    type ReviewAction,
    type ReviewOf,
} from "@/lib/review-reasons";

// The reason, asked for at the moment of the decision.
//
// Turning something down used to be one button. Whatever the reviewer
// knew then — the address was wrong, the discount can't be checked at
// the counter — was gone a second later, and the business got a mail
// listing what the reason might have been.
//
// So the reject dialog asks. One of a fixed set, because the email and
// the help centre have to be able to say the same thing, plus a note for
// what is true about this one in particular. The note is what the
// business reads first, and for "something else" it is the whole
// message, so the dialog won't let it through empty.

export type Decline = { reason: string; note: string };

export const emptyDecline: Decline = { reason: "", note: "" };

export function declineReady(of: ReviewOf, action: ReviewAction, decline: Decline) {
    if (decline.reason === "") return false;
    return !noteIsRequired(decline.reason) || decline.note.trim() !== "";
}

export function DeclineReason({
    of,
    action,
    value,
    onChange,
    disabled = false,
}: {
    of: ReviewOf;
    action: ReviewAction;
    value: Decline;
    onChange: (next: Decline) => void;
    disabled?: boolean;
}) {
    const reasons = reasonsFor(of, action);
    const chosen = reasons.find((reason) => reason.code === value.reason);
    const needsNote = value.reason !== "" && noteIsRequired(value.reason);

    return (
        <div className="space-y-4">
            <fieldset disabled={disabled} className="space-y-2">
                <legend className="text-sm font-medium">
                    Why not? They are told this.
                </legend>

                {/* Eight reasons, a preview and a note box is taller
                    than a laptop screen. The list scrolls so Cancel and
                    the confirm button stay where they can be pressed. */}
                <div className="mt-2 max-h-56 space-y-1.5 overflow-y-auto pr-1">
                    {reasons.map((reason) => (
                        <label
                            key={reason.code}
                            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm ${
                                value.reason === reason.code
                                    ? "border-[#FF593F] bg-[#FFF4EE]"
                                    : "border-[#17233B]/10 hover:bg-[#FFF8F0]"
                            }`}
                        >
                            <input
                                type="radio"
                                name={`decline-${of}-${action}`}
                                value={reason.code}
                                checked={value.reason === reason.code}
                                onChange={() => onChange({ ...value, reason: reason.code })}
                                className="mt-1 size-4 shrink-0 accent-[#FF593F]"
                            />

                            <span className="font-medium leading-5">{reason.label}</span>
                        </label>
                    ))}
                </div>
            </fieldset>

            {/* What they will read, in their words, before it is sent. */}
            {chosen && chosen.says !== "" && (
                <div className="rounded-xl bg-[#FFF8F0] p-3 text-sm leading-6 text-[#17233B]/75">
                    <p className="font-medium text-[#17233B]">They are sent:</p>
                    <p className="mt-1">{chosen.says}</p>
                    <p className="mt-2">{chosen.fix}</p>
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor={`decline-note-${of}-${action}`}>
                    {needsNote ? "What to tell them" : "Anything to add (optional)"}
                </Label>

                <Textarea
                    id={`decline-note-${of}-${action}`}
                    rows={3}
                    maxLength={NOTE_MAX}
                    disabled={disabled}
                    value={value.note}
                    placeholder={
                        of === "business"
                            ? "e.g. The address is a residential street with no shopfront we could find."
                            : "e.g. “Up to 50% off” reads as half price, but the terms limit it to one line of stock."
                    }
                    onChange={(event) => onChange({ ...value, note: event.target.value })}
                />

                <p className="text-xs text-[#17233B]/60">
                    {needsNote
                        ? "Required: this is the whole message."
                        : "Written in the email, the notification and on their dashboard."}
                </p>
            </div>
        </div>
    );
}
