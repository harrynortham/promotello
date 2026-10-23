import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

// Load .env.local so NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
// are available in globalSetup, which runs outside the Next.js server process.
config({ path: ".env.local" });

export default defineConfig({
    testDir: "./tests",
    fullyParallel: false,
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    reporter: [["html", { open: "never" }]],
    use: {
        baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
        trace: "on-first-retry",
    },
    projects: [
        { name: "setup", testMatch: /auth\.setup\.ts/ },
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
            dependencies: ["setup"],
        },
    ],
    globalSetup: "./tests/global-setup.ts",
    globalTeardown: "./tests/global-teardown.ts",
    webServer: {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 60_000,
    },
});
