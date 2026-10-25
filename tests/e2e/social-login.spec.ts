import { test, expect, type Page } from "@playwright/test";

// "Continue with Google / Apple". The provider itself can't be tested here,
// so these check the hand-off to Supabase and the way back.

const providers = (process.env.NEXT_PUBLIC_AUTH_PROVIDERS ?? "").split(",").map((value) => value.trim());

// Stops at Supabase's authorize URL and returns where it was sent.
async function authorizeRequest(page: Page, button: string) {
    await page.route("**/auth/v1/authorize**", (route) =>
        route.fulfill({ status: 200, contentType: "text/html", body: "<p>Provider sign-in</p>" }),
    );

    const [request] = await Promise.all([
        page.waitForRequest("**/auth/v1/authorize**"),
        page.getByRole("button", { name: button }).click(),
    ]);

    return new URL(request.url());
}

test.describe("Google sign-in", () => {
    test.skip(!providers.includes("google"), "Set NEXT_PUBLIC_AUTH_PROVIDERS=google to test Google sign-in");

    test("signing in returns to the page that asked for it", async ({ page }) => {
        // e.g. an offer someone was about to claim
        await page.goto("/login?next=/offers/some-offer");
        const url = await authorizeRequest(page, "Continue with Google");

        expect(url.searchParams.get("provider")).toBe("google");
        expect(url.searchParams.get("redirect_to")).toMatch(/\/auth\/callback\?next=%2Foffers%2Fsome-offer$/);
    });

    test("businesses signing up go on to onboarding", async ({ page }) => {
        await page.goto("/business/register");
        const url = await authorizeRequest(page, "Continue with Google");

        expect(url.searchParams.get("redirect_to")).toMatch(/\/auth\/callback\?next=%2Fonboarding$/);
    });
});

test.describe("Apple sign-in", () => {
    test.skip(!providers.includes("apple"), "Set NEXT_PUBLIC_AUTH_PROVIDERS=apple to test Apple sign-in");

    test("signing up hands over to Apple", async ({ page }) => {
        await page.goto("/signup");
        const url = await authorizeRequest(page, "Continue with Apple");

        expect(url.searchParams.get("provider")).toBe("apple");
    });
});

test("a cancelled sign-in explains what happened", async ({ page }) => {
    await page.goto("/auth/callback?error=access_denied&error_description=The+user+cancelled");
    await page.waitForURL("**/login?error=oauth");

    await expect(page.getByText("You weren’t signed in")).toBeVisible();
    await expect(page.getByText("That email link couldn’t be completed")).toHaveCount(0);
});
