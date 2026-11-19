"use client";

import { useEffect, useState } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";

import { getCategoryGroups, type CategoryGroup } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";

type CategorySelectProps = {
    id: string;
    name: string;
    defaultValue?: string | null;
    required?: boolean;
    placeholder?: string;
    className?: string;
    // In a react-hook-form form: register("category").
    registration?: UseFormRegisterReturn;
    invalid?: { "aria-invalid"?: true; "aria-describedby"?: string };
    // Lets somebody say they are none of these. The form that asks is
    // the one that takes the words
    // (20261231090000_a_business_we_have_no_category_for.sql).
    allowOther?: boolean;
};

// What the select submits when nothing on the list fits. Not a uuid
// and not a slug, so the database finds no category for it and keeps
// the words instead — which is exactly what should happen.
export const OTHER_CATEGORY = "other";

// A native select dressed like our Input, shared with the other native
// selects on the offer form so they don't drift apart.
export const nativeSelectClassName =
    "h-12 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm";

// Subcategories grouped under their top-level category. Submits the
// subcategory id.
export function CategorySelect({
    id,
    name,
    defaultValue,
    required,
    placeholder = "Choose a category",
    className,
    registration,
    invalid,
    allowOther = false,
}: CategorySelectProps) {
    const [groups, setGroups] = useState<CategoryGroup[] | null>(null);
    const [failed, setFailed] = useState(false);
    // Bumped to ask again. A failed load used to be the end of it: the
    // select stayed disabled for as long as the page was open, with no
    // way back but a manual refresh. That is an annoyance in admin and a
    // dead end on business signup, where the category is required and
    // the person has no idea what went wrong or that reloading would
    // fix it.
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let live = true;

        setFailed(false);

        getCategoryGroups(createClient())
            .then((loaded) => {
                if (live) setGroups(loaded);
            })
            .catch((error: unknown) => {
                if (!live) return;

                // Said out loud. This went wrong in production for
                // everyone holding a stale bundle after a column was
                // dropped, and the only evidence was a greyed-out box:
                // nothing in the console, nothing anywhere.
                console.error("[CategorySelect] categories failed to load", error);
                setFailed(true);
            });

        return () => {
            live = false;
        };
    }, [attempt]);

    return (
        <div className="space-y-1.5">
            <select
            // Remount once options load so defaultValue is applied.
            key={groups ? "loaded" : "loading"}
            id={id}
            name={name}
            required={required}
            defaultValue={defaultValue ?? ""}
            disabled={!groups}
            {...registration}
            {...invalid}
            className={cn(nativeSelectClassName, className)}
        >
            <option value="" disabled>
                {failed
                    ? "Categories couldn't load. Refresh to try again."
                    : groups
                      ? placeholder
                      : "Loading categories…"}
            </option>

            {groups?.map((group) => (
                <optgroup key={group.id} label={group.name}>
                    {group.subcategories.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                            {sub.name}
                        </option>
                    ))}
                </optgroup>
            ))}

            {/* Last, where somebody looks once they have read the rest
                and found themselves missing. */}
            {allowOther && groups && (
                <option value={OTHER_CATEGORY}>Something else</option>
            )}
            </select>

            {/* Only when it has actually failed. While it is loading
                there is nothing to try again. */}
            {failed && (
                <p className="text-xs leading-5 text-[#17233B]/70">
                    Categories didn&apos;t load.{" "}
                    <button
                        type="button"
                        onClick={() => setAttempt((count) => count + 1)}
                        className="font-medium text-[#FF593F] underline underline-offset-2"
                    >
                        Try again
                    </button>
                </p>
            )}
        </div>
    );
}
