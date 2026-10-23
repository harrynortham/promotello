"use server";

import { handOverEmail, teamInvitationEmail } from "@/lib/account-emails";
import { sendEmails } from "@/lib/email";
import { absoluteUrl } from "@/lib/site";
import { createClient } from "@/utils/supabase/server";

export type PendingInvitation = {
    id: string;
    email: string;
    role: "owner" | "admin" | "member";
    expires_at: string;
    accepted_at: string | null;
    created_at: string;
};

export type InviteResult =
    | { ok: true; inviteUrl: string; emailSent: boolean; invitation: PendingInvitation }
    | { ok: false; error: string };

function pending(invitation: PendingInvitation): PendingInvitation {
    const { id, email, role, expires_at, accepted_at, created_at } = invitation;
    return { id, email, role, expires_at, accepted_at, created_at };
}

async function businessName(supabase: Awaited<ReturnType<typeof createClient>>, businessId: string) {
    const { data } = await supabase.from("businesses").select("name").eq("id", businessId).single();
    return data?.name ?? "your business";
}

export async function inviteTeamMember(
    businessId: string,
    email: string,
    role: "admin" | "member",
): Promise<InviteResult> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { ok: false, error: "Please sign in again." };
    }

    // Checks the caller is an owner, validates the email and rate-limits.
    const { data: invitation, error } = await supabase.rpc("create_business_invitation", {
        requested_business_id: businessId,
        invited_email: email,
        invited_role: role,
    });

    if (error || !invitation) {
        return { ok: false, error: error?.message ?? "We couldn't create the invitation." };
    }

    const { sent } = await sendEmails([
        teamInvitationEmail({
            to: invitation.email,
            token: invitation.invitation_token,
            businessName: await businessName(supabase, businessId),
            inviterName: user.user_metadata?.full_name || user.email || "A team owner",
            role,
        }),
    ]);

    return {
        ok: true,
        inviteUrl: absoluteUrl(`/invite/${invitation.invitation_token}`),
        emailSent: sent > 0,
        invitation: pending(invitation),
    };
}

export async function handOverBusiness(businessId: string, email: string): Promise<InviteResult> {
    const supabase = await createClient();

    const { data: invitation, error } = await supabase.rpc("create_business_handover", {
        requested_business_id: businessId,
        owner_email: email,
    });

    if (error || !invitation) {
        return { ok: false, error: error?.message ?? "We couldn't create the hand-over." };
    }

    const { sent } = await sendEmails([
        handOverEmail({
            to: invitation.email,
            token: invitation.invitation_token,
            businessName: await businessName(supabase, businessId),
        }),
    ]);

    return {
        ok: true,
        inviteUrl: absoluteUrl(`/invite/${invitation.invitation_token}`),
        emailSent: sent > 0,
        invitation: pending(invitation),
    };
}
