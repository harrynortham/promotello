"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FiAlertTriangle, FiExternalLink } from "react-icons/fi";

import { CategorySelect } from "@/components/category-select";
import { LocationFields } from "@/components/location-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CityOption } from "@/lib/locations";
import { addLead, type PossibleMatch } from "../actions";

// Adding a lead, with a look first at anything already written down that
// might be the same shop.
//
// The unique index catches the same name typed twice. It cannot catch
// "Joe's Bakery" against "Joes Bakery", a second branch at another
// postcode, or a business already on Promotello — and writing to
// somebody already on Promotello to ask them to join it is the one a
// customer would see.
//
// So it warns and shows what it found rather than refusing: two shops
// can share a name, and only the person looking can tell. Pressing Add
// again is the answer. Nothing typed is lost while they look, which is
// why this is a client component and not a redirect.
export function AddLeadForm({ cities }: { cities: CityOption[] }) {
    const router = useRouter();
    const [matches, setMatches] = useState<PossibleMatch[] | null>(null);
    const [problem, setProblem] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setProblem("");
        setIsSaving(true);

        // Held now, because currentTarget is null by the time the await
        // comes back.
        const form = event.currentTarget;
        const data = new FormData(form);
        if (matches) data.set("confirmed", "1");

        const result = await addLead(data);

        if (result.matches) {
            setMatches(result.matches);
            setIsSaving(false);
            return;
        }

        if (result.error || !result.leadId) {
            setProblem(result.error ?? "The lead couldn't be saved.");
            setIsSaving(false);
            return;
        }

        // Emptied before we leave. These inputs are uncontrolled, and
        // coming back to this page is a soft navigation — React keeps
        // the same DOM nodes, so whatever was typed is still sitting in
        // them. Adding a second lead started with the first one's name,
        // address and contact already filled in, which is how two of the
        // same business get written down.
        form.reset();
        setMatches(null);

        router.push(`/admin/sales/${result.leadId}`);
    }

    return (
        <>
            {problem && (
                <p className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-900">
                    {problem}
                </p>
            )}

            {matches && (
                <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="flex items-center gap-2 font-medium text-amber-900">
                        <FiAlertTriangle aria-hidden="true" />
                        {matches.length === 1
                            ? "This might already be written down"
                            : `These might already be written down`}
                    </p>

                    <p className="mt-1 text-sm leading-6 text-amber-900/80">
                        Have a look, and press <strong>Add it anyway</strong> if it is a
                        different business. Nothing you have typed is lost.
                    </p>

                    <ul className="mt-3 space-y-2">
                        {matches.map((match) => (
                            <li
                                key={`${match.kind}-${match.id}`}
                                className="rounded-lg border border-amber-200 bg-white p-3 text-sm"
                            >
                                <div className="flex flex-wrap items-baseline justify-between gap-2">
                                    <p className="font-medium">{match.name}</p>
                                    <a
                                        href={
                                            match.kind === "lead"
                                                ? `/admin/sales/${match.id}`
                                                : `/admin/businesses`
                                        }
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 text-xs font-medium text-[#FF593F] hover:underline"
                                    >
                                        Open it
                                        <FiExternalLink aria-hidden="true" className="size-3" />
                                    </a>
                                </div>
                                <p className="mt-0.5 text-xs text-[#17233B]/65">{match.note}</p>
                                {match.where && (
                                    <p className="mt-0.5 text-xs text-[#17233B]/65">{match.where}</p>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <form onSubmit={onSubmit} className="space-y-8">
                <div className="space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="name">Business name</Label>
                        <Input id="name" name="name" required maxLength={120} placeholder="e.g. Little Loaf" />
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="website">Website</Label>
                            <Input id="website" name="website" type="url" placeholder="https://" />
                            <p className="text-xs text-[#17233B]/60">
                                What the crawler reads for an email and an address.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="categoryId">Category</Label>
                            <CategorySelect id="categoryId" name="categoryId" />
                        </div>
                    </div>
                </div>

                <div className="space-y-5 border-t border-[#17233B]/10 pt-6">
                    <h2 className="font-semibold">Where they are</h2>

                    <div className="space-y-2">
                        <Label htmlFor="addressLine1">Street address</Label>
                        <Input
                            id="addressLine1"
                            name="addressLine1"
                            maxLength={200}
                            placeholder="e.g. 214 Gloucester Road"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="addressLine2">Locality</Label>
                        <Input
                            id="addressLine2"
                            name="addressLine2"
                            maxLength={200}
                            placeholder="e.g. Horfield"
                        />
                        <p className="text-xs text-[#17233B]/60">
                            The line between the street and the town on an envelope. Not the
                            area below, which is where they are listed on Promotello.
                        </p>
                    </div>

                    <LocationFields cities={cities} waitlist={false} />

                    <p className="text-xs text-[#17233B]/60">
                        The postcode fixes where they are — it is looked up for the
                        coordinates and the ward, and it goes on the envelope.
                    </p>
                </div>

                <div className="space-y-5 border-t border-[#17233B]/10 pt-6">
                    <h2 className="font-semibold">How to reach them</h2>
                    <p className="text-sm leading-6 text-[#17233B]/65">
                        All optional. Leave the email out and the crawler looks for one.
                    </p>

                    <div className="space-y-2">
                        <Label htmlFor="contactName">Who to write to</Label>
                        <Input id="contactName" name="contactName" maxLength={80} placeholder="Sam" />
                        <p className="text-xs text-[#17233B]/60">
                            Their first name is the first line of the email. Left blank it
                            says &ldquo;Hi there&rdquo;.
                        </p>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" name="email" type="email" maxLength={160} placeholder="hello@theirshop.com" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input id="phone" name="phone" maxLength={40} placeholder="0117 123 4567" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="instagramHandle">Instagram</Label>
                        <Input
                            id="instagramHandle"
                            name="instagramHandle"
                            maxLength={120}
                            placeholder="@theirshop or a profile link"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3 border-t border-[#17233B]/10 pt-6">
                    {/* Disabled while it saves. Without it there was
                        no sign anything was happening, so it was
                        pressed twice and the business went in twice
                        (20270207090000, which stops the race this
                        cannot). */}
                    <Button type="submit" disabled={isSaving}>
                        {isSaving ? "Adding…" : matches ? "Add it anyway" : "Add to the pipeline"}
                    </Button>
                    <Button
                        render={<Link href="/admin/sales" />}
                        nativeButton={false}
                        variant="ghost"
                        disabled={isSaving}
                    >
                        Cancel
                    </Button>
                </div>

                <p className="text-xs leading-5 text-[#17233B]/60">
                    Nothing is sent to anybody by adding them. A lead can only be
                    emailed once Companies House says it is a limited company.
                </p>
            </form>
        </>
    );
}
