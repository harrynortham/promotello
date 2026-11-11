"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/utils/supabase/client";

// Whether this person runs a business, for the links and lines that only
// mean something if they do. Somebody who made an account to claim an
// offer has no business dashboard to go to, and being offered one reads
// as a setup step they have missed.
//
// The select policy on business_members is is_business_member(...), so
// the query returns the rows of businesses you belong to and nothing
// else: a count is the whole question, with no new RPC or column.
//
// It starts false and turns true, like the platform-admin check beside
// it, so the link appears a moment late rather than flashing and going.
export function useRunsABusiness() {
    const [runsOne, setRunsOne] = useState(false);

    useEffect(() => {
        let isMounted = true;

        createClient()
            .from("business_members")
            .select("business_id", { count: "exact", head: true })
            .then(({ count }) => {
                if (isMounted) setRunsOne((count ?? 0) > 0);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    return runsOne;
}
