import { z } from "zod";

// Signing in is a six-digit code emailed to the address someone gives us.
// Supabase sends it (the length is set in the dashboard, and 6 is both the
// default and what the forms say), and won't send another for a minute.
export const CODE_LENGTH = 6;
export const RESEND_SECONDS = 60;

export const codeField = z
    .string()
    .trim()
    // Pasted from an email, a code often brings a space with it.
    .transform((value) => value.replace(/\s+/g, ""))
    .refine(
        (value) => new RegExp(`^\\d{${CODE_LENGTH}}$`).test(value),
        `Enter the ${CODE_LENGTH}-digit code from your email.`,
    );

// What Supabase says, turned into something worth reading. `otherWay` asks
// the form to offer the other door: someone signing in who has no account,
// or signing up with an address that already has one.
export function signInProblem(message: string, mode: "sign-in" | "sign-up") {
    const text = message.toLowerCase();

    // Supabase refuses to create an account from the sign-in form, which is
    // what we asked it to do — so this means nobody has this address.
    if (/signups not allowed|user not found/.test(text)) {
        return mode === "sign-in"
            ? { message: "We couldn't find an account for that email.", otherWay: true }
            : { message: "We couldn't create your account. Please try again.", otherWay: false };
    }

    // One code a minute, per address.
    if (/rate limit|too many requests|for security purposes/.test(text)) {
        return {
            message: "That's a lot of codes. Wait a minute and try again, or use the last one we sent.",
            otherWay: false,
        };
    }

    if (/invalid|email address/.test(text) && /email/.test(text)) {
        return { message: "That email address doesn't look right.", otherWay: false };
    }

    return {
        message: message || "We couldn't send your code. Please try again.",
        otherWay: false,
    };
}
