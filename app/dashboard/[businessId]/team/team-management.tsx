"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type Member = {
    user_id: string;
    email: string | null;
    role: "owner" | "admin" | "member";
    created_at: string;
};

type Invitation = {
    id: string;
    email: string;
    role: "admin" | "member";
    expires_at: string;
    accepted_at: string | null;
    created_at: string;
};

type TeamManagementProps = {
    businessId: string;
    businessName: string;
    initialMembers: Member[];
    initialInvitations: Invitation[];
};

export default function TeamManagement({
    businessId,
    businessName,
    initialMembers,
    initialInvitations,
}: TeamManagementProps) {
    const [members, setMembers] = useState(initialMembers);
    const [invitations, setInvitations] = useState(initialInvitations);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeId, setActiveId] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    async function handleInvite(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const form = event.currentTarget;
        const formData = new FormData(form);

        setIsSubmitting(true);
        setErrorMessage("");
        setSuccessMessage("");

        const supabase = createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            setErrorMessage("Please sign in before creating an invitation.");
            setIsSubmitting(false);
            return;
        }

        const { error } = await supabase.functions.invoke(
            "send-business-invitation",
            {
                body: {
                    business_id: businessId,
                    email: formData.get("email"),
                    role: formData.get("role"),
                },
            },
        );

        setIsSubmitting(false);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        setSuccessMessage("Invitation email sent successfully.");
        form.reset();
        window.location.reload();
    }

    async function changeRole(
        userId: string,
        newRole: "admin" | "member",
    ) {
        setActiveId(userId);
        setErrorMessage("");

        const supabase = createClient();

        const { data, error } = await supabase.rpc(
            "update_business_member_role",
            {
                requested_business_id: businessId,
                requested_user_id: userId,
                new_role: newRole,
            },
        );

        if (error) {
            setErrorMessage(error.message);
            setActiveId("");
            return;
        }

        setMembers((current) =>
            current.map((member) =>
                member.user_id === userId
                    ? { ...member, role: data.role }
                    : member,
            ),
        );

        setActiveId("");
    }

    async function removeMember(userId: string) {
        if (!window.confirm("Remove this team member?")) {
            return;
        }

        setActiveId(userId);
        setErrorMessage("");

        const supabase = createClient();

        const { error } = await supabase.rpc("remove_business_member", {
            requested_business_id: businessId,
            requested_user_id: userId,
        });

        if (error) {
            setErrorMessage(error.message);
            setActiveId("");
            return;
        }

        setMembers((current) =>
            current.filter((member) => member.user_id !== userId),
        );

        setActiveId("");
    }

    async function revokeInvitation(invitationId: string) {
        if (!window.confirm("Revoke this invitation?")) {
            return;
        }

        setActiveId(invitationId);
        setErrorMessage("");

        const supabase = createClient();

        const { error } = await supabase.rpc(
            "revoke_business_invitation",
            {
                requested_business_id: businessId,
                requested_invitation_id: invitationId,
            },
        );

        if (error) {
            setErrorMessage(error.message);
            setActiveId("");
            return;
        }

        setInvitations((current) =>
            current.filter((invitation) => invitation.id !== invitationId),
        );

        setActiveId("");
    }

    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-10 text-[#17233B] sm:py-16">
            <div className="mx-auto max-w-4xl">
                <Link
                    href="/dashboard"
                    className="text-sm font-semibold text-[#FF593F]"
                >
                    ← Back to dashboard
                </Link>

                <header className="mt-8">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                        Team management
                    </p>

                    <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                        {businessName} team
                    </h1>

                    <p className="mt-3 text-[#17233B]/65">
                        Invite and manage people who help run your business.
                    </p>
                </header>

                {errorMessage && (
                    <p className="mt-8 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                        {errorMessage}
                    </p>
                )}

                {successMessage && (
                    <p className="mt-8 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                        {successMessage}
                    </p>
                )}

                <section className="mt-10 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
                    <h2 className="text-2xl font-semibold">
                        Invite a team member
                    </h2>

                    <form onSubmit={handleInvite} className="mt-6 space-y-5">
                        <label className="block text-sm font-medium">
                            Email address
                            <input
                                name="email"
                                type="email"
                                required
                                className="mt-2 w-full rounded-xl border border-[#17233B]/15 px-4 py-3 outline-none focus:border-[#FF593F]"
                                placeholder="staff@example.com"
                            />
                        </label>

                        <label className="block text-sm font-medium">
                            Role
                            <select
                                name="role"
                                defaultValue="member"
                                className="mt-2 w-full rounded-xl border border-[#17233B]/15 bg-white px-4 py-3 outline-none focus:border-[#FF593F]"
                            >
                                <option value="member">Member</option>
                                <option value="admin">Admin</option>
                            </select>
                        </label>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="rounded-xl bg-[#FF593F] px-5 py-3 font-semibold transition hover:bg-[#E94D36] disabled:opacity-60"
                        >
                            {isSubmitting
                                ? "Sending invitation…"
                                : "Send invitation"}
                        </button>
                    </form>
                </section>

                <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
                    <h2 className="text-2xl font-semibold">Current members</h2>

                    <div className="mt-6 space-y-3">
                        {members.map((member) => (
                            <div
                                key={member.user_id}
                                className="flex flex-col gap-4 rounded-2xl border border-[#17233B]/10 p-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div>
                                    <p className="text-sm font-medium">
                                        {member.email ?? "Email unavailable"}
                                    </p>

                                    <span className="mt-2 inline-flex rounded-full bg-[#17233B]/5 px-3 py-1 text-xs font-semibold capitalize">
                                        {member.role}
                                    </span>
                                </div>

                                {member.role !== "owner" && (
                                    <div className="flex flex-wrap gap-2">
                                        <select
                                            value={member.role}
                                            disabled={activeId === member.user_id}
                                            onChange={(event) =>
                                                changeRole(
                                                    member.user_id,
                                                    event.target.value as "admin" | "member",
                                                )
                                            }
                                            className="rounded-xl border border-[#17233B]/15 bg-white px-3 py-2 text-sm"
                                        >
                                            <option value="member">Member</option>
                                            <option value="admin">Admin</option>
                                        </select>

                                        <button
                                            type="button"
                                            disabled={activeId === member.user_id}
                                            onClick={() => removeMember(member.user_id)}
                                            className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
                    <h2 className="text-2xl font-semibold">
                        Pending invitations
                    </h2>

                    <div className="mt-6 space-y-3">
                        {invitations.filter(
                            (invitation) => !invitation.accepted_at,
                        ).length === 0 ? (
                            <p className="text-sm text-[#17233B]/60">
                                No pending invitations.
                            </p>
                        ) : (
                            invitations
                                .filter((invitation) => !invitation.accepted_at)
                                .map((invitation) => (
                                    <div
                                        key={invitation.id}
                                        className="flex flex-col gap-4 rounded-2xl border border-[#17233B]/10 p-4 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div>
                                            <p className="font-medium">
                                                {invitation.email}
                                            </p>

                                            <p className="text-sm capitalize text-[#17233B]/55">
                                                Role: {invitation.role}
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            disabled={activeId === invitation.id}
                                            onClick={() =>
                                                revokeInvitation(invitation.id)
                                            }
                                            className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                                        >
                                            Revoke
                                        </button>
                                    </div>
                                ))
                        )}
                    </div>
                </section>
            </div>
        </main>
    );
}