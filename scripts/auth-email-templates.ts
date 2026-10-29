// Writes Supabase's sign-in email templates to supabase/templates/, in the
// same layout as the app's own emails (brandedEmail). Supabase sends these,
// not the app, so paste each file into Authentication → Emails in the
// Supabase dashboard, with the subject listed below. Re-run after changing
// the layout:
//
//   npx tsx --conditions=react-server scripts/auth-email-templates.ts
//
// The {{ .X }} placeholders are Supabase's template variables.

import { mkdirSync, writeFileSync } from "fs";

import { brandedEmail } from "@/lib/email";

const notYou = "If you didn't ask for this, you can ignore this email.";

const templates = [
    {
        file: "confirm-signup",
        dashboardName: "Confirm sign up",
        subject: "Confirm your email address",
        email: {
            eyebrow: "Welcome to Promotello",
            title: "Confirm your email address",
            paragraphs: [
                "Thanks for signing up. Confirm this is your email address to finish creating your account.",
            ],
            action: { label: "Confirm my email", url: "{{ .ConfirmationURL }}" },
            footer: `You're getting this because this address was used to sign up to Promotello. ${notYou}`,
        },
    },
    {
        file: "reset-password",
        dashboardName: "Reset password",
        subject: "Reset your Promotello password",
        email: {
            eyebrow: "Password reset",
            title: "Choose a new password",
            paragraphs: [
                "We got a request to reset the password for your Promotello account. The link only works once, and expires soon for your security.",
            ],
            action: { label: "Choose a new password", url: "{{ .ConfirmationURL }}" },
            footer: `${notYou} Your password stays the same.`,
        },
    },
    {
        file: "change-email",
        dashboardName: "Change email address",
        subject: "Confirm your new email address",
        email: {
            eyebrow: "Email change",
            title: "Confirm your new email address",
            paragraphs: [
                "We got a request to change your Promotello email address from {{ .Email }} to {{ .NewEmail }}.",
                "Confirm to make the change. Until then, keep signing in with your current address.",
            ],
            action: { label: "Confirm the change", url: "{{ .ConfirmationURL }}" },
            footer: `${notYou} Your email address stays the same.`,
        },
    },
    {
        file: "magic-link",
        dashboardName: "Magic link",
        subject: "Your Promotello sign-in link",
        email: {
            eyebrow: "Sign in",
            title: "Sign in to Promotello",
            paragraphs: ["Use this link to sign in. It only works once, and expires soon for your security."],
            action: { label: "Sign in", url: "{{ .ConfirmationURL }}" },
            footer: notYou,
        },
    },
    {
        file: "reauthentication",
        dashboardName: "Reauthentication",
        subject: "Your Promotello confirmation code",
        email: {
            eyebrow: "Confirm it's you",
            title: "Your code is {{ .Token }}",
            paragraphs: ["Enter this code in Promotello to confirm the change to your account. It expires soon for your security."],
            footer: `${notYou} Someone may be trying to change your account, so consider changing your password.`,
        },
    },
    {
        file: "password-changed",
        dashboardName: "Password changed (security notification)",
        subject: "Your Promotello password was changed",
        email: {
            eyebrow: "Security notice",
            title: "Your password was changed",
            paragraphs: [
                "The password for your Promotello account, {{ .Email }}, was just changed.",
                "If this was you, there's nothing more to do. If it wasn't, reset your password straight away and email support@promotello.com.",
            ],
            action: { label: "Reset my password", url: "{{ .SiteURL }}/forgot-password" },
            footer: "We send this whenever your password changes, to keep your account safe.",
        },
    },
    {
        file: "email-changed",
        dashboardName: "Email address changed (security notification)",
        subject: "Your Promotello email address was changed",
        email: {
            eyebrow: "Security notice",
            title: "Your email address was changed",
            paragraphs: [
                "The email address for your Promotello account was changed from {{ .OldEmail }} to {{ .Email }}.",
                "If this wasn't you, email support@promotello.com straight away so we can secure your account.",
            ],
            footer: "We send this whenever your email address changes, to keep your account safe.",
        },
    },
];

const outDir = "supabase/templates";
mkdirSync(outDir, { recursive: true });

for (const template of templates) {
    writeFileSync(`${outDir}/${template.file}.html`, brandedEmail(template.email).html);
    console.log(`${template.dashboardName}\n  subject: ${template.subject}\n  body:    ${outDir}/${template.file}.html\n`);
}
