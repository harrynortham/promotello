import type { SupabaseClient, User } from "@supabase/supabase-js";

export type Membership = { business_id: string };

// The businesses this account helps run. One indexed read of
// business_members (business_members_user_id_idx), once, at sign-in:
// it decides where an unasked sign-in lands, and whether the customer
// welcome is theirs to get. Nothing else in the app pays for it.
export async function businessMemberships(supabase: SupabaseClient, userId: string) {
    const { data } = await supabase
        .from("business_members")
        .select("business_id")
        .eq("user_id", userId)
        .limit(2);

    return (data ?? []) as Membership[];
}

// Where someone belongs after signing in, when they didn't ask for
// anywhere in particular.
//
// Running a business is why most people have an account here at all, so
// a member lands in the dashboard rather than in the customer area with
// their own vouchers. Their customer side is still a click away in the
// account menu.
export function landingFor(user: User, memberships: Membership[]) {
    // One business goes straight to it; several need the chooser.
    if (memberships.length === 1) {
        return `/business/${memberships[0].business_id}`;
    }

    if (memberships.length > 1) {
        return "/business/dashboard";
    }

    // Signed up to run a business but never finished: they were on their
    // way to onboarding, so that is where signing in takes them.
    if (user.app_metadata?.business_signup_at) {
        return "/onboarding";
    }

    return "/dashboard";
}
