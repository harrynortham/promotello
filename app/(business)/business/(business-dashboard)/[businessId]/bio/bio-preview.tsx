"use client";

import type { IconType } from "react-icons";

import { inkOn, type BioKind, type BioSection } from "@/lib/bio-sections";

// Their page, as they are arranging it.
//
// Not an iframe of the real thing: a preview that reloads on every tap
// of an arrow is a preview nobody watches. This redraws from the same
// state the list is holding, so the page moves as they move it.
//
// It is a likeness rather than the page itself, and it says so. The
// rows carry the real words -- their offer, their reward, their notice
// -- because a preview full of placeholder text answers the one
// question it exists to answer with a lie.

export function BioPreview({
    accent,
    businessName,
    sections,
    rows,
    names,
    icons,
    links,
    notice,
}: {
    accent: string;
    businessName: string;
    sections: BioSection[];
    rows: Record<string, { note: string; empty?: boolean }>;
    names: Record<BioKind, string>;
    icons: Record<BioKind, IconType>;
    links: { id: string; label: string }[];
    notice: string;
}) {
    // What the page will actually draw: switched on, and with something
    // to show. A section with nothing in it is hidden out there, so it
    // has to be hidden in here too or the preview is a different page.
    const showing = sections.filter(
        (section) => section.enabled && !rows[section.kind]?.empty,
    );

    // The first row is the loud one, exactly as the page does it.
    const loud = showing.find((section) => section.kind === "offers" || section.kind === "loyalty");

    return (
        <div className="lg:sticky lg:top-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#17233B]/55">
                How it looks
            </p>

            <div className="mt-3 rounded-[2rem] border-4 border-[#17233B]/15 bg-[#FFF8F0] p-4">
                <div className="mx-auto max-w-[17rem]">
                    <div className="flex flex-col items-center">
                        <span
                            className="flex size-12 items-center justify-center rounded-2xl bg-white text-lg font-semibold"
                            style={{ color: accent }}
                        >
                            {businessName.charAt(0).toUpperCase()}
                        </span>
                        <p className="mt-2 text-center text-sm font-semibold leading-5">
                            {businessName}
                        </p>
                    </div>

                    <div className="mt-4 space-y-2">
                        {showing.length === 0 && (
                            <p className="rounded-xl border border-dashed border-[#17233B]/20 px-3 py-6 text-center text-xs leading-5 text-[#17233B]/55">
                                Everything is switched off, so there is nothing on your page but
                                your name.
                            </p>
                        )}

                        {showing.map((section) => {
                            if (section.kind === "notice") {
                                return (
                                    <p
                                        key={section.kind}
                                        className="rounded-xl border px-3 py-2 text-center text-[11px] font-medium leading-4"
                                        style={{
                                            borderColor: `${accent}40`,
                                            backgroundColor: `${accent}10`,
                                        }}
                                    >
                                        {notice}
                                    </p>
                                );
                            }

                            if (section.kind === "links") {
                                return (
                                    <div key={section.kind} className="space-y-2">
                                        {links.map((link) => (
                                            <Row
                                                key={link.id}
                                                icon={icons.links}
                                                label={link.label}
                                                accent={accent}
                                            />
                                        ))}
                                    </div>
                                );
                            }

                            return (
                                <Row
                                    key={section.kind}
                                    icon={icons[section.kind]}
                                    label={names[section.kind]}
                                    note={rows[section.kind]?.note}
                                    loud={section.kind === loud?.kind}
                                    accent={accent}
                                />
                            );
                        })}
                    </div>

                    <p className="mt-5 text-center text-[10px] text-[#17233B]/45">
                        {businessName} on Promotello
                    </p>
                </div>
            </div>

            <p className="mt-3 text-xs leading-5 text-[#17233B]/55">
                A likeness, not the page. Your photos, colours and the real wording are on the page
                itself.
            </p>
        </div>
    );
}

function Row({
    icon: Icon,
    label,
    note,
    loud = false,
    accent,
}: {
    icon: IconType;
    label: string;
    note?: string;
    loud?: boolean;
    accent: string;
}) {
    return (
        <div
            className={`flex items-center gap-2 rounded-xl px-3 py-2 ${
                loud ? "" : "border border-[#17233B]/10 bg-white text-[#17233B]"
            }`}
            style={loud ? { backgroundColor: accent, color: inkOn(accent) } : undefined}
        >
            <Icon
                aria-hidden="true"
                className="size-3.5 shrink-0"
                style={loud ? undefined : { color: accent }}
            />
            <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-semibold leading-4">{label}</span>
                {note && (
                    <span
                        className={`block truncate text-[10px] leading-4 ${
                            loud ? "text-white/85" : "text-[#17233B]/60"
                        }`}
                    >
                        {note}
                    </span>
                )}
            </span>
        </div>
    );
}
