import { test, expect } from "@playwright/test";

// The legal pages are finished documents: no template placeholders or
// draft notices (Google's sign-in review reads the privacy policy).

for (const path of ["/legal/privacy", "/legal/terms", "/legal/cookies"]) {
    test(`${path} has no placeholders`, async ({ page }) => {
        await page.goto(path);
        const text = await page.locator("main").innerText();

        expect(text).not.toMatch(/\[[A-Za-z][^\]]*\]/);
        expect(text).not.toContain("Draft template");
    });
}

test("the privacy policy explains Google sign-in", async ({ page }) => {
    await page.goto("/legal/privacy");

    await expect(page.getByRole("heading", { name: "Signing in with Google" })).toBeVisible();
    await expect(page.getByText(/Limited Use requirements/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Google API Services User Data Policy" })).toBeVisible();
});
