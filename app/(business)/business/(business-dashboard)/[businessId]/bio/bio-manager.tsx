"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
    FiArrowDown,
    FiArrowUp,
    FiBookOpen,
    FiCalendar,
    FiCheck,
    FiClock,
    FiCopy,
    FiGift,
    FiGlobe,
    FiImage,
    FiLink,
    FiMapPin,
    FiMessageCircle,
    FiPhone,
    FiStar,
    FiTrash2,
    FiUsers,
    FiVolume2,
} from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { moved, type BioKind, type BioSection } from "@/lib/bio-sections";
import { BioPreview } from "./bio-preview";
import { addLink, moveLink, removeLink, saveArrangement, saveBioDetails } from "./actions";

// Arranging the bio page.
//
// The thing this screen is not: a second place to write their opening
// hours. Nearly everything here already has a home in the dashboard,
// and a row that let them edit it again would be two sources of the
// same truth. So each row says what it will show and sends them to
// where that lives. What is genuinely only on this page -- the order,
// what is switched on, their own links and the notice -- is editable
// right here.

type Row = {
    kind: BioKind;
    label: string;
    icon: typeof FiGift;
    // What it will put on the page, in their words, or what is missing.
    note: string;
    // Where the content behind it actually lives.
    edit?: string;
    // Pro-only rows stay visible and say so rather than vanishing.
    locked?: string;
};

export function BioManager({
    businessId,
    businessName,
    bioUrl,
    initialSections,
    rows,
    links,
    notice,
    noticeUntil,
    whatsapp,
    taps,
}: {
    businessId: string;
    businessName: string;
    bioUrl: string;
    initialSections: BioSection[];
    rows: Record<string, { note: string; edit?: string; locked?: string; empty?: boolean }>;
    links: { id: string; label: string; url: string }[];
    notice: string;
    noticeUntil: string;
    whatsapp: string;
    taps: Record<string, number>;
}) {
    const router = useRouter();
    const [sections, setSections] = useState(initialSections);
    const [saving, startSaving] = useTransition();
    const [problem, setProblem] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const icons: Record<BioKind, typeof FiGift> = {
        notice: FiVolume2,
        offers: FiGift,
        loyalty: FiGift,
        links: FiLink,
        booking: FiCalendar,
        menu: FiBookOpen,
        hours: FiClock,
        find_us: FiMapPin,
        call: FiPhone,
        whatsapp: FiMessageCircle,
        website: FiGlobe,
        review: FiStar,
        photos: FiImage,
        socials: FiUsers,
    };

    const names: Record<BioKind, string> = {
        notice: "A notice",
        offers: "Your offers",
        loyalty: "Your loyalty card",
        links: "Your own links",
        booking: "Book with us",
        menu: "See the menu",
        hours: "Opening hours",
        find_us: "Find us",
        call: "Call us",
        whatsapp: "WhatsApp",
        website: "Your website",
        review: "Leave us a review",
        photos: "Photos",
        socials: "Social links",
    };

    // Saved on every change rather than behind a Save button: this is a
    // list of switches and an order, and a page that quietly forgets
    // what you dragged is worse than one that saves too often.
    function commit(next: BioSection[]) {
        setSections(next);
        setProblem(null);

        startSaving(async () => {
            const result = await saveArrangement(businessId, next);
            if (result.error) setProblem(result.error);
            else router.refresh();
        });
    }

    async function copy() {
        try {
            await navigator.clipboard.writeText(bioUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    }

    return (
        <div className="space-y-8">
            <div className="rounded-2xl border border-[#17233B]/10 bg-white p-5">
                <h2 className="font-semibold">Your link</h2>
                <p className="mt-1 text-sm leading-6 text-[#17233B]/65">
                    One address for your Instagram bio. Everything below is what people find on it.
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                    <code className="min-w-0 flex-1 truncate rounded-lg border bg-[#FFF8F0] px-3 py-2 text-sm">
                        {bioUrl}
                    </code>
                    <Button type="button" variant="outline" size="sm" onClick={copy}>
                        {copied ? <FiCheck aria-hidden="true" /> : <FiCopy aria-hidden="true" />}
                        {copied ? "Copied" : "Copy"}
                    </Button>
                    <Button
                        render={<a href={bioUrl} target="_blank" rel="noopener noreferrer" />}
                        nativeButton={false}
                        variant="outline"
                        size="sm"
                    >
                        Open it
                    </Button>
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-[1fr_18rem]">
            <section aria-labelledby="sections-heading">
                <div className="flex items-end justify-between gap-4">
                    <div>
                        <h2 id="sections-heading" className="font-semibold">
                            What is on it, and in what order
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-[#17233B]/65">
                            Move the things people ask for most to the top. A section with nothing
                            in it yet stays hidden until there is.
                        </p>
                    </div>

                    {saving && <p className="shrink-0 text-xs text-[#17233B]/55">Saving…</p>}
                </div>

                {problem && (
                    <p role="alert" className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                        {problem}
                    </p>
                )}

                <ul className="mt-4 space-y-2">
                    {sections.map((section, index) => {
                        const Icon = icons[section.kind];
                        const row = rows[section.kind] ?? { note: "" };
                        const count = taps[section.kind] ?? 0;

                        return (
                            <li
                                key={section.kind}
                                className="flex items-center gap-3 rounded-xl border border-[#17233B]/10 bg-white px-4 py-3"
                            >
                                <div className="flex shrink-0 flex-col">
                                    <button
                                        type="button"
                                        aria-label={`Move ${names[section.kind]} up`}
                                        disabled={index === 0 || saving}
                                        onClick={() => commit(moved(sections, section.kind, -1))}
                                        className="rounded p-1 text-[#17233B]/50 hover:text-[#FF593F] disabled:opacity-30"
                                    >
                                        <FiArrowUp aria-hidden="true" className="size-4" />
                                    </button>
                                    <button
                                        type="button"
                                        aria-label={`Move ${names[section.kind]} down`}
                                        disabled={index === sections.length - 1 || saving}
                                        onClick={() => commit(moved(sections, section.kind, 1))}
                                        className="rounded p-1 text-[#17233B]/50 hover:text-[#FF593F] disabled:opacity-30"
                                    >
                                        <FiArrowDown aria-hidden="true" className="size-4" />
                                    </button>
                                </div>

                                <Icon aria-hidden="true" className="size-5 shrink-0 text-[#FF593F]" />

                                <div className="min-w-0 flex-1">
                                    <p className="font-medium leading-6">{names[section.kind]}</p>
                                    <p className="text-sm leading-5 text-[#17233B]/60">
                                        {row.locked ?? row.note}
                                    </p>
                                </div>

                                {count > 0 && (
                                    <p className="shrink-0 text-xs text-[#17233B]/55">
                                        {count} {count === 1 ? "tap" : "taps"}
                                    </p>
                                )}

                                {row.edit && (
                                    <Link
                                        href={row.edit}
                                        className="shrink-0 text-sm font-medium text-[#FF593F] underline underline-offset-4"
                                    >
                                        Edit
                                    </Link>
                                )}

                                <Switch
                                    checked={section.enabled}
                                    disabled={saving}
                                    aria-label={`Show ${names[section.kind]}`}
                                    onCheckedChange={(on: boolean) =>
                                        commit(
                                            sections.map((item) =>
                                                item.kind === section.kind
                                                    ? { ...item, enabled: on }
                                                    : item,
                                            ),
                                        )
                                    }
                                />
                            </li>
                        );
                    })}
                </ul>
            </section>

            <BioPreview
                businessName={businessName}
                sections={sections}
                rows={rows}
                names={names}
                icons={icons}
                links={links}
                notice={notice}
            />
            </div>

            <LinksEditor businessId={businessId} links={links} />

            <DetailsEditor
                businessId={businessId}
                notice={notice}
                noticeUntil={noticeUntil}
                whatsapp={whatsapp}
            />
        </div>
    );
}

function LinksEditor({
    businessId,
    links,
}: {
    businessId: string;
    links: { id: string; label: string; url: string }[];
}) {
    const router = useRouter();
    const [busy, startBusy] = useTransition();
    const [problem, setProblem] = useState<string | null>(null);

    function run(action: () => Promise<{ error?: string }>) {
        setProblem(null);
        startBusy(async () => {
            const result = await action();
            if (result.error) setProblem(result.error);
            else router.refresh();
        });
    }

    return (
        <section aria-labelledby="links-heading">
            <h2 id="links-heading" className="font-semibold">
                Your own links
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#17233B]/65">
                Anything else worth a row: a wholesale order form, a job you are hiring for, a
                fundraiser. They show where &ldquo;Your own links&rdquo; sits above.
            </p>

            {problem && (
                <p role="alert" className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                    {problem}
                </p>
            )}

            {links.length > 0 && (
                <ul className="mt-4 space-y-2">
                    {links.map((link, index) => (
                        <li
                            key={link.id}
                            className="flex items-center gap-3 rounded-xl border border-[#17233B]/10 bg-white px-4 py-3"
                        >
                            <div className="flex shrink-0 flex-col">
                                <button
                                    type="button"
                                    aria-label={`Move ${link.label} up`}
                                    disabled={index === 0 || busy}
                                    onClick={() => run(() => moveLink(businessId, link.id, -1))}
                                    className="rounded p-1 text-[#17233B]/50 hover:text-[#FF593F] disabled:opacity-30"
                                >
                                    <FiArrowUp aria-hidden="true" className="size-4" />
                                </button>
                                <button
                                    type="button"
                                    aria-label={`Move ${link.label} down`}
                                    disabled={index === links.length - 1 || busy}
                                    onClick={() => run(() => moveLink(businessId, link.id, 1))}
                                    className="rounded p-1 text-[#17233B]/50 hover:text-[#FF593F] disabled:opacity-30"
                                >
                                    <FiArrowDown aria-hidden="true" className="size-4" />
                                </button>
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="font-medium leading-6">{link.label}</p>
                                <p className="truncate text-sm leading-5 text-[#17233B]/60">
                                    {link.url}
                                </p>
                            </div>

                            <button
                                type="button"
                                aria-label={`Remove ${link.label}`}
                                disabled={busy}
                                onClick={() => run(() => removeLink(businessId, link.id))}
                                className="shrink-0 rounded p-2 text-[#17233B]/50 hover:text-red-600 disabled:opacity-30"
                            >
                                <FiTrash2 aria-hidden="true" className="size-4" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <form
                action={(formData) => run(() => addLink(businessId, formData))}
                className="mt-4 grid gap-3 rounded-xl border border-dashed border-[#17233B]/20 p-4 sm:grid-cols-[1fr_1fr_auto]"
            >
                <div className="space-y-1.5">
                    <Label htmlFor="link-label">What it says</Label>
                    <Input id="link-label" name="label" maxLength={40} placeholder="Order a wholesale bag" />
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="link-url">Where it goes</Label>
                    <Input id="link-url" name="url" placeholder="yourshop.co.uk/wholesale" />
                </div>

                <div className="flex items-end">
                    <Button type="submit" variant="outline" disabled={busy}>
                        Add it
                    </Button>
                </div>
            </form>
        </section>
    );
}

function DetailsEditor({
    businessId,
    notice,
    noticeUntil,
    whatsapp,
}: {
    businessId: string;
    notice: string;
    noticeUntil: string;
    whatsapp: string;
}) {
    const router = useRouter();
    const [busy, startBusy] = useTransition();
    const [problem, setProblem] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    return (
        <section aria-labelledby="details-heading">
            <h2 id="details-heading" className="font-semibold">
                A notice, and WhatsApp
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#17233B]/65">
                A notice sits at the top of the page until the date you give it, then takes itself
                down. Leave the date empty and it stays until you remove it.
            </p>

            {problem && (
                <p role="alert" className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                    {problem}
                </p>
            )}

            <form
                action={(formData) => {
                    setProblem(null);
                    setSaved(false);
                    startBusy(async () => {
                        const result = await saveBioDetails(businessId, formData);
                        if (result.error) setProblem(result.error);
                        else {
                            setSaved(true);
                            router.refresh();
                        }
                    });
                }}
                className="mt-4 space-y-4 rounded-xl border border-[#17233B]/10 bg-white p-5"
            >
                <div className="space-y-1.5">
                    <Label htmlFor="notice">What it says</Label>
                    <Input
                        id="notice"
                        name="notice"
                        defaultValue={notice}
                        maxLength={140}
                        placeholder="Closed Sunday 29th for a private party"
                    />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="noticeUntil">Up until</Label>
                        <Input id="noticeUntil" name="noticeUntil" type="date" defaultValue={noticeUntil} />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="whatsapp">WhatsApp number</Label>
                        <Input
                            id="whatsapp"
                            name="whatsapp"
                            defaultValue={whatsapp}
                            placeholder="07700 900123"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button type="submit" variant="outline" disabled={busy}>
                        {busy ? "Saving…" : "Save"}
                    </Button>
                    {saved && !busy && <p className="text-sm text-[#17233B]/60">Saved.</p>}
                </div>
            </form>
        </section>
    );
}
