// Writes Supabase's sign-in email templates to supabase/templates/, in the
// same layout as the app's own emails (brandedEmail). Supabase sends these,
// not the app, so paste each file into Authentication → Emails in the
// Supabase dashboard, with the subject listed below. Re-run after changing
// the layout:
//
// There is nothing here for "Reset password" or "Password changed":
// Promotello has no passwords. Whatever those two say in the dashboard,
// nothing in the product asks Supabase to send them.
//
//   npx tsx --conditions=react-server scripts/auth-email-templates.ts
//
// The {{ .X }} placeholders are Supabase's template variables.

import { mkdirSync, writeFileSync } from "fs";

import { brandedEmail } from "@/lib/email";

const notYou = "If you didn't ask for this, you can ignore this email.";

// Signing in is a six-digit code, so two templates carry one: Magic link
// for an address that already has an account, Confirm sign up for one
// that doesn't. They say the same thing because the person is doing the
// same thing, and a code that only appears in one of them would mean
// signing up quietly broke while signing in worked.
//
// Both need {{ .Token }} in the body or Supabase sends a link instead.
//
// The subject carries the code as well, because that is where it gets
// read: off a lock screen, standing at a till, without opening anything.
// Supabase's own reauthentication default does the same.
const signInCode = {
    eyebrow: "Sign in",
    title: "Your sign-in code",
    paragraphs: [
        "Type this code into Promotello to sign in. It expires in an hour and works once.",
    ],
    code: "{{ .Token }}",
    footer: `We will never ask you for this code — not by email, phone or message. ${notYou}`,
};

const templates = [
    {
        file: "confirm-signup",
        dashboardName: "Confirm sign up",
        subject: "{{ .Token }} is your Promotello code",
        email: {
            ...signInCode,
            eyebrow: "Welcome to Promotello",
            paragraphs: [
                "Type this code into Promotello to finish creating your account. It expires in an hour and works once.",
            ],
            footer: `You're getting this because this address was used to sign up to Promotello. ${signInCode.footer}`,
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
        subject: "{{ .Token }} is your Promotello code",
        email: signInCode,
    },
    {
        file: "reauthentication",
        dashboardName: "Reauthentication",
        subject: "{{ .Token }} is your Promotello confirmation code",
        email: {
            eyebrow: "Confirm it's you",
            title: "Confirm it's you",
            paragraphs: ["Type this code into Promotello to confirm the change to your account. It expires soon for your security."],
            code: "{{ .Token }}",
            footer: `${notYou} If you keep getting these, email support@promotello.com.`,
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
