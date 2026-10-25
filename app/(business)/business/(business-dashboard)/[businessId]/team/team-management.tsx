"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/utils/supabase/client";
import { handOverBusiness, inviteTeamMember, type InviteResult } from "./actions";

type Member = {
    user_id: string;
    email: string | null;
    role: "owner" | "admin" | "member";
    created_at: string;
};

type Invitation = {
    id: string;
    email: string;
    role: "owner" | "admin" | "member";
    expires_at: string;
    accepted_at: string | null;
    created_at: string;
};

type TeamManagementProps = {
    businessId: string;
    businessName: string;
    // Shown to Promotello staff who set a business up for its owner.
    suggestHandOver?: boolean;
    initialMembers: Member[];
    initialInvitations: Invitation[];
};

type ConfirmationAction =
    | {
        type: "member";
        id: string;
    }
    | {
        type: "invitation";
        id: string;
    }
    | null;

function roleBadgeClass(role: Member["role"]) {
    if (role === "owner") {
        return "border-purple-200 bg-purple-100 text-purple-800";
    }

    if (role === "admin") {
        return "border-blue-200 bg-blue-100 text-blue-800";
    }

    return "border-slate-200 bg-slate-100 text-slate-700";
}

export default function TeamManagement({
    businessId,
    businessName,
    suggestHandOver = false,
    initialMembers,
    initialInvitations,
}: TeamManagementProps) {
    const [members, setMembers] = useState(initialMembers);
    const [invitations, setInvitations] = useState(initialInvitations);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeId, setActiveId] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [confirmationAction, setConfirmationAction] =
        useState<ConfirmationAction>(null);
    const [shareLink, setShareLink] = useState<{ url: string; emailSent: boolean; handOver: boolean } | null>(null);
    const [isHandingOver, setIsHandingOver] = useState(false);
    const [copied, setCopied] = useState(false);

    function applyInviteResult(result: InviteResult, handOver: boolean, form: HTMLFormElement) {
        if (!result.ok) {
            setErrorMessage(result.error);
            return;
        }

        setInvitations((current) => [
            result.invitation,
            ...current.filter((invitation) => !(handOver && invitation.role === "owner")),
        ]);
        setShareLink({ url: result.inviteUrl, emailSent: result.emailSent, handOver });
        setCopied(false);
        form.reset();
    }

    async function handleHandOver(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const form = event.currentTarget;
        setIsHandingOver(true);
        setErrorMessage("");
        setSuccessMessage("");
        setShareLink(null);

        const result = await handOverBusiness(businessId, String(new FormData(form).get("ownerEmail") ?? ""));
        applyInviteResult(result, true, form);
        setIsHandingOver(false);
    }

    async function copyShareLink() {
        if (!shareLink) return;

        try {
            await navigator.clipboard.writeText(shareLink.url);
            setCopied(true);
        } catch {
            setCopied(false);
        }
    }

    async function handleInvite(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const form = event.currentTarget;
        const formData = new FormData(form);

        setIsSubmitting(true);
        setErrorMessage("");
        setSuccessMessage("");
        setShareLink(null);

        const result = await inviteTeamMember(
            businessId,
            String(formData.get("email") ?? ""),
            formData.get("role") === "admin" ? "admin" : "member",
        );

        applyInviteResult(result, false, form);
        setIsSubmitting(false);
    }

    async function changeRole(
        userId: string,
        newRole: "admin" | "member",
    ) {
        setActiveId(userId);
        setErrorMessage("");
        setSuccessMessage("");

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

        setSuccessMessage("Team member role updated.");
        setActiveId("");
    }

    async function removeMember(userId: string) {
        setActiveId(userId);
        setErrorMessage("");
        setSuccessMessage("");

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

        setSuccessMessage("Team member removed.");
        setActiveId("");
        setConfirmationAction(null);
    }

    async function revokeInvitation(invitationId: string) {
        setActiveId(invitationId);
        setErrorMessage("");
        setSuccessMessage("");

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

        setSuccessMessage("Invitation revoked.");
        setActiveId("");
        setConfirmationAction(null);
    }

    async function confirmAction() {
        if (!confirmationAction) {
            return;
        }

        if (confirmationAction.type === "member") {
            await removeMember(confirmationAction.id);
            return;
        }

        await revokeInvitation(confirmationAction.id);
    }

    const pendingInvitations = invitations.filter(
        (invitation) => !invitation.accepted_at,
    );

    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-10 text-[#17233B] sm:py-16">
            <div className="mx-auto max-w-5xl">
                <Button
                    render={<Link href="/business/dashboard" />}
                    nativeButton={false}
                    variant="outline"
                    size="sm"
                >
                    ← Back to dashboard
                </Button>

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

                <div className="mt-8 space-y-4">
                    {errorMessage && (
                        <Alert variant="destructive">
                            <AlertTitle>Something went wrong</AlertTitle>
                            <AlertDescription>{errorMessage}</AlertDescription>
                        </Alert>
                    )}

                    {shareLink && (
                        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
                            <AlertTitle>
                                {shareLink.handOver ? "Hand-over ready" : "Invitation created"}
                            </AlertTitle>
                            <AlertDescription>
                                <p>
                                    {shareLink.emailSent
                                        ? "We've emailed the link. You can also share it directly:"
                                        : "We couldn't send the email, so share this link with them directly:"}
                                </p>
                                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                                    <code className="min-w-0 flex-1 truncate rounded-md bg-white px-3 py-2 text-xs text-[#17233B]">
                                        {shareLink.url}
                                    </code>
                                    <Button type="button" variant="outline" size="sm" onClick={copyShareLink}>
                                        {copied ? "Copied" : "Copy link"}
                                    </Button>
                                </div>
                            </AlertDescription>
                        </Alert>
                    )}

                    {successMessage && (
                        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
                            <AlertTitle>Success</AlertTitle>
                            <AlertDescription>{successMessage}</AlertDescription>
                        </Alert>
                    )}
                </div>

                <Card className="mt-10 border-[#17233B]/10">
                    <CardHeader>
                        <CardTitle>Invite a team member</CardTitle>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleInvite} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email address</Label>

                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    placeholder="staff@example.com"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="role">Role</Label>

                                <Select name="role" defaultValue="member">
                                    <SelectTrigger id="role">
                                        <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>

                                    <SelectContent>
                                        <SelectItem value="member">Member</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                variant="default"
                            >
                                {isSubmitting
                                    ? "Sending invitation…"
                                    : "Send invitation"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card className="mt-8 border-[#17233B]/10">
                    <CardHeader>
                        <CardTitle>Current members</CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        {members.length === 0 ? (
                            <p className="text-sm text-[#17233B]/70">
                                No team members found.
                            </p>
                        ) : (
                            members.map((member) => (
                                <div key={member.user_id}>
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="font-medium">
                                                {member.email ?? "Email unavailable"}
                                            </p>

                                            <Badge
                                                variant="outline"
                                                className={`mt-2 capitalize ${roleBadgeClass(
                                                    member.role,
                                                )}`}
                                            >
                                                {member.role}
                                            </Badge>
                                        </div>

                                        {member.role !== "owner" && (
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Select
                                                    value={member.role}
                                                    onValueChange={(value) =>
                                                        changeRole(
                                                            member.user_id,
                                                            value as "admin" | "member",
                                                        )
                                                    }
                                                    disabled={activeId === member.user_id}
                                                >
                                                    <SelectTrigger className="w-32">
                                                        <SelectValue />
                                                    </SelectTrigger>

                                                    <SelectContent>
                                                        <SelectItem value="member">
                                                            Member
                                                        </SelectItem>

                                                        <SelectItem value="admin">
                                                            Admin
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>

                                                <Button
                                                    type="button"
                                                    disabled={activeId === member.user_id}
                                                    onClick={() =>
                                                        setConfirmationAction({
                                                            type: "member",
                                                            id: member.user_id,
                                                        })
                                                    }
                                                    variant="destructive"
                                                    size="sm"
                                                >
                                                    Remove
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    <Separator className="mt-4" />
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                <Card className="mt-8 border-[#17233B]/10">
                    <CardHeader>
                        <CardTitle>Pending invitations</CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        {pendingInvitations.length === 0 ? (
                            <p className="text-sm text-[#17233B]/70">
                                No pending invitations.
                            </p>
                        ) : (
                            pendingInvitations.map((invitation) => (
                                <div key={invitation.id}>
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="font-medium">{invitation.email}</p>

                                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                                <Badge variant="secondary" className="capitalize">
                                                    {invitation.role === "owner" ? "Hand-over" : invitation.role}
                                                </Badge>

                                                <span className="text-sm text-[#17233B]/70">
                                                    Expires{" "}
                                                    {new Date(
                                                        invitation.expires_at,
                                                    ).toLocaleDateString("en-GB")}
                                                </span>
                                            </div>
                                        </div>

                                        <Button
                                            type="button"
                                            disabled={activeId === invitation.id}
                                            onClick={() =>
                                                setConfirmationAction({
                                                    type: "invitation",
                                                    id: invitation.id,
                                                })
                                            }
                                            variant="outline"
                                            size="sm"
                                        >
                                            Revoke
                                        </Button>
                                    </div>

                                    <Separator className="mt-4" />
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                <Card
                    id="hand-over"
                    className={`mt-8 scroll-mt-28 ${suggestHandOver ? "border-[#FF593F]/40 ring-2 ring-[#FF593F]/15" : "border-[#17233B]/10"}`}
                >
                    <CardHeader>
                        <CardTitle>Hand over this business</CardTitle>
                        <p className="text-sm text-[#17233B]/65">
                            {suggestHandOver
                                ? "Finished setting this business up? Send it to the owner. When they accept, they become owner and you leave the team."
                                : "Pass ownership to someone else. When they accept, they become owner and you leave the team."}
                        </p>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleHandOver} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                            <div className="flex-1 space-y-2">
                                <Label htmlFor="ownerEmail">New owner&apos;s email</Label>
                                <Input
                                    id="ownerEmail"
                                    name="ownerEmail"
                                    type="email"
                                    required
                                    placeholder="owner@example.com"
                                />
                            </div>

                            <Button type="submit" disabled={isHandingOver}>
                                {isHandingOver ? "Creating link…" : "Send hand-over"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Dialog
                    open={confirmationAction !== null}
                    onOpenChange={(open) => {
                        if (!open) {
                            setConfirmationAction(null);
                        }
                    }}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {confirmationAction?.type === "member"
                                    ? "Remove team member?"
                                    : "Revoke invitation?"}
                            </DialogTitle>

                            <DialogDescription>
                                {confirmationAction?.type === "member"
                                    ? "This person will lose access to this business."
                                    : "This invitation will no longer be valid."}
                            </DialogDescription>
                        </DialogHeader>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setConfirmationAction(null)}
                                disabled={activeId !== ""}
                            >
                                Cancel
                            </Button>

                            <Button
                                type="button"
                                variant="destructive"
                                onClick={confirmAction}
                                disabled={activeId !== ""}
                            >
                                {activeId !== "" ? "Processing…" : "Confirm"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </main>
    );
}