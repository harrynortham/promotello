import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Signing in is a six-digit code emailed to the address someone gives us,
// so a test has to get hold of one. Two things make that possible without
// an inbox:
//
//  - the send itself is stubbed, so nothing is emailed to the made-up
//    addresses these tests use (a run would otherwise hard-bounce a dozen
//    messages off test.internal and spend the project's email allowance);
//  - the code is generated with the admin API, which mints exactly the
//    code the email would have carried without sending anything.
//
// Everything else is the real thing: the real form, the real verification,
// and the real session it leaves behind.

function admin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );
}

export async function codeFor(email: string) {
    const { data, error } = await admin().auth.admin.generateLink({ type: "magiclink", email });

    if (error || !data.properties?.email_otp) {
        throw new Error(`Could not mint a sign-in code for ${email}: ${error?.message ?? "no code"}`);
    }

    return data.properties.email_otp;
}

// Fills in the sign-in form on whatever page is already showing it.
export async function enterSignInCode(page: Page, email: string) {
    let asked = 0;

    await page.route(/\/auth\/v1\/otp/, async (route) => {
        asked += 1;
        await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });

    // A sign-in link can carry the address with it (?email=), and filling
    // the field before the page has hydrated leaves the two concatenated.
    // Typing it until it sticks is the reliable way in.
    const field = page.locator("#login-email");
    await field.waitFor();

    await expect(async () => {
        await field.fill(email);
        await expect(field).toHaveValue(email, { timeout: 1_000 });
    }).toPass({ timeout: 15_000 });

    await page.getByRole("button", { name: "Email me a code" }).click();

    await page.locator("#login-code").waitFor({ timeout: 15_000 });
    // If this ever stops matching, the stub has stopped working and a real
    // email went out. Better to fail here than to find out from a bounce.
    expect(asked, "the code request was intercepted").toBeGreaterThan(0);

    await page.locator("#login-code").fill(await codeFor(email));
    await page.getByRole("button", { name: "Sign in" }).click();
}

// Signs in from scratch, landing wherever `next` asks for.
export async function signInWithCode(page: Page, email: string, next?: string) {
    await page.goto(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
    await enterSignInCode(page, email);
}
