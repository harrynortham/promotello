"use client";

// A heading that says the thing under it can be changed.
//
// The lead's name is an ordinary editable field, but it sits 1,276
// pixels down a 2,724 pixel page, below the address and the company —
// while the name itself is the first thing on the page, set as a
// heading, which reads as a title rather than a value. So it gets asked
// for as a missing feature.
//
// Scrolling is not enough on its own: arriving next to a field is not
// the same as being in it, so this focuses and selects, and the next
// keystroke replaces the name.
export function JumpToField({
    target,
    children,
    className,
}: {
    target: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <button
            type="button"
            className={className}
            onClick={() => {
                const field = document.getElementById(target);

                if (!(field instanceof HTMLInputElement)) return;

                field.scrollIntoView({ behavior: "smooth", block: "center" });
                field.focus({ preventScroll: true });
                field.select();
            }}
        >
            {children}
        </button>
    );
}
