"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type Member = {
    user_id: string;
    role: string;
    created_at: string;
};

type Invitation = {
    id: string;
    email: string;
    role: string;
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
    const [members] = useState(initialMembers);
    const [invitations, setInvitations] = useState(initialInvitations);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [invitationLink, setInvitationLink] = useState("");

    async function handleInvite(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const form = event.currentTarget;
        const formData = new FormData(form);

        setIsSubmitting(true);
        setErrorMessage("");
        setInvitationLink("");

        const supabase = createClient();

        const { data, error } = await supabase.rpc(
            "create_business_invitation",
            {
                requested_business_id: businessId,
                invited_email: formData.get("email"),
                invited_role: formData.get("role"),
            },
        );

        setIsSubmitting(false);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        setInvitations((current) => [data, ...current]);

        const link = `${window.location.origin}/invite/${data.invitation_token}`;
        setInvitationLink(link);

        form.reset();
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
                        Invite people to help manage your business.
                    </p>
                </header>

                <section className="mt-10 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
                    <h2 className="text-2xl font-semibold">Invite a team member</h2>

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

                        {errorMessage && (
                            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                                {errorMessage}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="rounded-xl bg-[#FF593F] px-5 py-3 font-semibold transition hover:bg-[#E94D36] disabled:opacity-60"
                        >
                            {isSubmitting ? "Creating invitation…" : "Create invitation"}
                        </button>
                    </form>

                    {invitationLink && (
                        <div className="mt-6 rounded-2xl bg-emerald-50 p-5">
                            <p className="font-semibold text-emerald-800">
                                Invitation created
                            </p>

                            <p className="mt-2 break-all text-sm text-emerald-700">
                                {invitationLink}
                            </p>

                            <p className="mt-2 text-xs text-emerald-700">
                                Copy this link and send it to the invited person.
                            </p>
                        </div>
                    )}
                </section>

                <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
                    <h2 className="text-2xl font-semibold">Current members</h2>

                    <div className="mt-6 space-y-3">
                        {members.map((member) => (
                            <div
                                key={member.user_id}
                                className="flex flex-col gap-2 rounded-2xl border border-[#17233B]/10 p-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <p className="font-mono text-sm text-[#17233B]/65">
                                    {member.user_id}
                                </p>

                                <span className="w-fit rounded-full bg-[#17233B]/5 px-3 py-1 text-xs font-semibold capitalize">
                                    {member.role}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
                    <h2 className="text-2xl font-semibold">Invitations</h2>

                    <div className="mt-6 space-y-3">
                        {invitations.length === 0 ? (
                            <p className="text-sm text-[#17233B]/60">
                                No invitations have been created.
                            </p>
                        ) : (
                            invitations.map((invitation) => (
                                <div
                                    key={invitation.id}
                                    className="flex flex-col gap-2 rounded-2xl border border-[#17233B]/10 p-4 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div>
                                        <p className="font-medium">{invitation.email}</p>
                                        <p className="text-sm text-[#17233B]/55">
                                            Role: {invitation.role}
                                        </p>
                                    </div>

                                    <span className="text-sm text-[#17233B]/55">
                                        {invitation.accepted_at ? "Accepted" : "Pending"}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </div>
        </main>
    );
}