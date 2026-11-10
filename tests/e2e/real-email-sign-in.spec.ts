import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// The one test that reads the code out of the email Supabase actually
// sent, rather than minting it with the admin API. It is the only thing
// that proves the email template carries {{ .Token }} — with a link in
// there instead, every other test still passes and nobody can sign in.
//
// It sends a real email and needs Resend's API, so it is opt-in:
//
//   E2E_REAL_EMAIL=1 npx playwright test tests/e2e/real-email-sign-in.spec.ts
//
// The address is Resend's test inbox: accepted, never delivered, so it
// cannot bounce.
test.describe("the code in the email", () => {
    test.skip(
        process.env.E2E_REAL_EMAIL !== "1" || !process.env.RESEND_API_KEY,
        "opt-in: sends a real email (E2E_REAL_EMAIL=1, with RESEND_API_KEY)",
    );

    test.use({ storageState: { cookies: [], origins: [] } });

    test("arrives, and signs you in", async ({ page }) => {
        test.setTimeout(120_000);

        const admin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false } },
        );

        const email = `delivered+real-${Date.now()}@resend.dev`;
        const { data: made, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
        expect(error).toBeNull();

        try {
            const sentAt = Date.now();

            await page.goto("/login");
            await page.locator("#login-email").fill(email);
            await page.getByRole("button", { name: "Email me a code" }).click();

            await expect(page.getByText(`We've sent a 6-digit code to ${email}`)).toBeVisible({
                timeout: 20_000,
            });

            const code = await codeFromInbox(email, sentAt);

            await page.locator("#login-code").fill(code);
            await page.getByRole("button", { name: "Sign in" }).click();

            await page.waitForURL("**/dashboard**", { timeout: 25_000 });
        } finally {
            await admin.auth.admin.deleteUser(made!.user!.id);
        }
    });
});

// Waits for the email to show up in Resend and digs the code out of it.
async function codeFromInbox(email: string, sentAt: number) {
    const headers = { Authorization: `Bearer ${process.env.RESEND_API_KEY}` };

    for (let attempt = 0; attempt < 20; attempt += 1) {
        const list = await fetch("https://api.resend.com/emails?limit=10", { headers });
        const { data = [] } = (await list.json()) as { data?: { id: string; to: string[]; created_at: string }[] };

        const sent = data.find(
            (item) => item.to.includes(email) && new Date(item.created_at).getTime() >= sentAt - 60_000,
        );

        if (sent) {
            const one = await fetch(`https://api.resend.com/emails/${sent.id}`, { headers });
            const { html = "", subject = "" } = (await one.json()) as { html?: string; subject?: string };

            // A link where the code should be is the failure this test exists for.
            expect(html, `the email to ${email} (“${subject}”) carries no sign-in link`).not.toContain(
                "/auth/v1/verify",
            );

            const code = html.match(/>\s*(\d{6})\s*</)?.[1];
            expect(code, `no six-digit code in the email to ${email} (“${subject}”)`).toBeTruthy();

            return code!;
        }

        await new Promise((resolve) => setTimeout(resolve, 3_000));
    }

    throw new Error(`No email to ${email} showed up in Resend within a minute.`);
}
