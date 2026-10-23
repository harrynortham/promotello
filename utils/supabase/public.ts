import { createClient } from "@supabase/supabase-js";

// Anonymous client with no cookies: sees exactly what a logged-out visitor
// or search engine sees under RLS. Use for metadata and the sitemap.
export function createPublicClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        },
    );
}
