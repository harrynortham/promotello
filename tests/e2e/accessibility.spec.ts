import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Page } from "@playwright/test";
import fs from "fs";
import { BUSINESS_AUTH, CUSTOMER_AUTH, STATE_PATH } from "../global-setup";

// Automated accessibility checks (WCAG 2.1 A and AA) on the pages people use
// most. Fails on serious or critical problems. Automated checks catch about
// a third of issues, so this complements, not replaces, trying pages with
// a keyboard and a screen reader.

const state = () => JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

async function expectAccessible(page: Page, path: string) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

    const problems = results.violations
        .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
        .map((violation) => ({
            rule: violation.id,
            impact: violation.impact,
            help: violation.help,
            where: violation.nodes.slice(0, 5).map((node) => {
                // For contrast problems: the colours and ratio found.
                const data = node.any[0]?.data as { fgColor?: string; bgColor?: string; contrastRatio?: number } | undefined;
                const colours = data?.fgColor ? ` (${data.fgColor} on ${data.bgColor}, ${data.contrastRatio}:1)` : "";
                return `${node.target.join(" ")}${colours}`;
            }),
        }));

    expect(problems, `${path}\n${JSON.stringify(problems, null, 2)}`).toEqual([]);
}

test.describe("signed out", () => {
    for (const path of ["/", "/offers", "/explore/bristol", "/login", "/signup", "/business", "/business/pricing", "/business/register"]) {
        test(`${path} is accessible`, async ({ page }) => expectAccessible(page, path));
    }

    test("an offer page is accessible", async ({ page }) => expectAccessible(page, `/offers/${state().claimOfferSlug}`));
    test("a business page is accessible", async ({ page }) => expectAccessible(page, `/businesses/${state().businessSlug}`));
});

test.describe("customers", () => {
    test.use({ storageState: CUSTOMER_AUTH });
    test("the customer dashboard is accessible", async ({ page }) => expectAccessible(page, "/dashboard"));
});

test.describe("businesses", () => {
    test.use({ storageState: BUSINESS_AUTH });
    test("the business dashboard is accessible", async ({ page }) => expectAccessible(page, `/business/${state().businessId}`));
    test("creating an offer is accessible", async ({ page }) => expectAccessible(page, `/business/${state().businessId}/offers/new`));
});
