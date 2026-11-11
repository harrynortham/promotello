"use client";

import { useState, type ChangeEvent, type FocusEvent } from "react";

// The six-digit code, as six boxes.
//
// It is still one text field underneath, lying under the boxes with no
// colour: six real inputs would break pasting a code, the one-time-code
// keyboard suggestion on a phone, and anything that reads the form aloud.
// So the input keeps the label, the validation and the autofill, and the
// boxes are a drawing of what it holds.

export function CodeInput({
    id,
    name,
    length,
    value,
    disabled = false,
    invalid = false,
    describedBy,
    autoFocus = false,
    onChange,
    onBlur,
    inputRef,
}: {
    id: string;
    name: string;
    length: number;
    value: string;
    disabled?: boolean;
    invalid?: boolean;
    describedBy?: string;
    autoFocus?: boolean;
    onChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onBlur: (event: FocusEvent<HTMLInputElement>) => void;
    inputRef: (element: HTMLInputElement | null) => void;
}) {
    const [element, setElement] = useState<HTMLInputElement | null>(null);
    const [focused, setFocused] = useState(false);

    const digits = value.replace(/\D/g, "").slice(0, length);
    // Which box the next digit goes in, which is the last one once it's full.
    const at = Math.min(digits.length, length - 1);

    return (
        <div className="relative">
            <input
                id={id}
                name={name}
                type="text"
                // A phone offers the code from the email above the keyboard.
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={length}
                autoFocus={autoFocus}
                readOnly={disabled}
                aria-invalid={invalid || undefined}
                aria-describedby={describedBy}
                value={value}
                onChange={(event) => {
                    // Typed, pasted or filled in by the phone: only the
                    // digits, and only as many as there are boxes.
                    event.target.value = event.target.value.replace(/\D/g, "").slice(0, length);
                    onChange(event);
                }}
                onFocus={() => setFocused(true)}
                onBlur={(event) => {
                    setFocused(false);
                    onBlur(event);
                }}
                // Over the boxes and invisible: the caret is drawn below,
                // in the box the next digit goes in.
                className="absolute inset-0 z-10 w-full cursor-pointer text-transparent opacity-0 outline-none"
                ref={(node) => {
                    setElement(node);
                    inputRef(node);
                }}
            />

            <div aria-hidden="true" className="flex items-center justify-between gap-2 sm:gap-3">
                {Array.from({ length }, (_, index) => {
                    const digit = digits[index] ?? "";
                    const here = focused && index === at;

                    return (
                        <div
                            key={index}
                            onMouseDown={(event) => {
                                // Keep the caret at the end wherever they
                                // press: a code is typed left to right.
                                event.preventDefault();
                                element?.focus();
                                element?.setSelectionRange(digits.length, digits.length);
                            }}
                            className={`flex h-14 flex-1 items-center justify-center rounded-xl border bg-white text-2xl font-semibold tabular-nums transition ${
                                invalid
                                    ? "border-destructive text-destructive"
                                    : here
                                      ? "border-[#FF593F] ring-2 ring-[#FF593F]/20"
                                      : digit
                                        ? "border-[#17233B]/25"
                                        : "border-[#17233B]/15"
                            } ${disabled ? "opacity-60" : ""}`}
                        >
                            {digit || (here ? <Caret /> : null)}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function Caret() {
    return <span className="h-7 w-px animate-pulse bg-[#17233B]/50" />;
}
