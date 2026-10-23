import { createClient } from "@supabase/supabase-js";

// Service-role client: bypasses RLS. Only use in trusted server code such as
// webhooks, never in anything that runs on behalf of a signed-in user.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
