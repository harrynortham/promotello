import { test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Rows a test made, deleted whether the test finishes or not.
//
// A `finally` only runs once its `try` has been entered, and a seed
// helper that creates a business and then asserts on the next insert
// throws before that happens. The business outlives the run — which is
// how nine of them ended up in the live directory, including one
// approved and publicly visible, and the suite runs against production
// until there is a second Supabase project (README, stage 2).
//
// So nothing is trusted to clean up after itself. A row is registered
// the moment it exists, and an afterEach removes it whatever became of
// the test. The existing `finally` blocks can stay: deleting an id that
// has already gone is a no-op.
//
// Businesses only, because everything else worth removing hangs off one
// by a cascading foreign key.
export function throwawayBusinesses() {
    const ids = new Set<string>();

    test.afterEach(async () => {
        if (ids.size === 0) return;

        const admin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } },
        );

        for (const id of ids) {
            const { error } = await admin.from("businesses").delete().eq("id", id);

            // Reported rather than thrown: a cleanup failure must not
            // turn a passing test red, and a row left behind is worth
            // seeing in the output.
            if (error) {
                console.error(`Could not remove the test business ${id}: ${error.message}`);
            }
        }

        ids.clear();
    });

    // Call it the moment the insert returns, before anything that could
    // throw. Returns the id so it reads as part of the seed.
    return function remember(id: string) {
        ids.add(id);
        return id;
    };
}
