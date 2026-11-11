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
};

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
}: CategorySelectProps) {
    const [groups, setGroups] = useState<CategoryGroup[] | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        getCategoryGroups(createClient())
            .then(setGroups)
            .catch(() => setFailed(true));
    }, []);

    return (
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
        </select>
    );
}
