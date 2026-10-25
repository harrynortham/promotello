import { z } from "zod";

import { normalisePostcode, type CityOption } from "@/lib/locations";

// Shared rules for forms (react-hook-form + Zod). Messages are shown under
// the field, so they say what to do, not what went wrong.

export const email = z
    .string()
    .trim()
    .min(1, "Enter your email address.")
    .max(320, "That email address is too long.")
    .email("Enter an email address like name@example.com.");

export const password = z
    .string()
    .min(8, "Choose a password with at least 8 characters.")
    .max(72, "Choose a password of 72 characters or fewer.");

// For a password and its confirmation:
//   z.object({ password, confirmPassword: z.string() }).refine(passwordsMatch, passwordsMatchError)
export function passwordsMatch(values: { password: string; confirmPassword: string }) {
    return values.password === values.confirmPassword;
}

export const passwordsMatchError = { message: "Your passwords do not match.", path: ["confirmPassword"] };

export function requiredText(label: string, { min = 1, max = 200 }: { min?: number; max?: number } = {}) {
    return z
        .string()
        .trim()
        .min(min, min > 1 ? `${label} needs at least ${min} characters.` : `Enter ${label.toLowerCase()}.`)
        .max(max, `${label} can be up to ${max} characters.`);
}

export function optionalText(label: string, max = 500) {
    return z.string().trim().max(max, `${label} can be up to ${max} characters.`);
}

// A web address with a real-looking host. (Chrome's URL parser accepts
// spaces in host names, so URL.canParse alone isn't enough.)
function isWebAddress(value: string) {
    if (/\s/.test(value) || !URL.canParse(value)) return false;
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) && /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(url.hostname);
}

// Empty, or a full web address. "example.com" gets https:// added.
export const optionalUrl = z
    .string()
    .trim()
    .transform((value) => (value && !/^https?:\/\//i.test(value) ? `https://${value}` : value))
    .refine((value) => !value || isWebAddress(value), "Enter a web address like https://example.com.");

export const optionalEmail = z
    .string()
    .trim()
    .refine((value) => !value || z.email().safeParse(value).success, "Enter an email address like name@example.com.");

// A full UK postcode, e.g. BS7 8AA. (The database checks it's in a live city.)
export const ukPostcode = z
    .string()
    .trim()
    .min(1, "Enter the postcode.")
    .refine(
        (value) => /^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$/.test(value.toUpperCase().replace(/\s/g, "")),
        "Enter a full postcode, like BS7 8AA.",
    );

// A business location's city, area and postcode (see LocationFields).
export const locationShape = {
    city: z.string().min(1, "Choose the town or city."),
    region: z.string().min(1, "Choose your area."),
    postalCode: ukPostcode,
};

// The postcode must be in the chosen city's districts, as the database
// insists. Use in .superRefine() on a schema that includes locationShape.
export function postcodeInCity(cities: CityOption[]) {
    return (values: { city: string; postalCode: string }, ctx: z.RefinementCtx) => {
        const city = cities.find((option) => option.name === values.city);
        const postcode = normalisePostcode(values.postalCode);

        if (city && postcode && !city.postcodeDistricts.includes(postcode.split(" ")[0])) {
            ctx.addIssue({ code: "custom", path: ["postalCode"], message: `That postcode isn't in ${city.name}.` });
        }
    };
}
