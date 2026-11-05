// A business's first letter in a tile, for the rows that switch between
// businesses. The one you're in wears the brand's coral.
export function BusinessInitial({ name, current }: { name: string; current?: boolean }) {
    return (
        <span
            aria-hidden="true"
            className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${current ? "bg-[#FF593F]/10 text-[#FF593F]" : "bg-[#17233B]/[0.06] text-[#17233B]/70"
                }`}
        >
            {name.charAt(0).toUpperCase()}
        </span>
    );
}
