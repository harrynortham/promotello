"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteAccount, type DeletionOutcome } from "./actions";

export function DeleteAccount({ outcomes }: { outcomes: DeletionOutcome[] }) {
    const [state, formAction, pending] = useActionState(deleteAccount, null);
    const blockers = outcomes.filter((item) => item.outcome !== "delete");
    const deleted = outcomes.filter((item) => item.outcome === "delete");

    return (
        <div className="space-y-5">
            <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-muted-foreground">
                <li>Your profile, vouchers, loyalty cards and follows are deleted straight away.</li>
                <li>Unused vouchers stop working and can&apos;t be recovered.</li>
                <li>You&apos;ll be removed from any business teams you&apos;re part of.</li>
            </ul>

            {blockers.length > 0 && (
                <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                    <AlertTitle>First, sort out these businesses</AlertTitle>
                    <AlertDescription>
                        <ul className="mt-2 space-y-2">
                            {blockers.map((item) => (
                                <li key={item.business_id}>
                                    <strong>{item.business_name}</strong>:{" "}
                                    {item.outcome === "cancel_subscription" ? (
                                        <>
                                            cancel its subscription in{" "}
                                            <Link className="underline" href={`/business/${item.business_id}/billing`}>
                                                Billing
                                            </Link>
                                            , or hand it over to someone else.
                                        </>
                                    ) : (
                                        <>
                                            you&apos;re its only owner, so{" "}
                                            <Link className="underline" href={`/business/${item.business_id}/team#hand-over`}>
                                                hand it over
                                            </Link>{" "}
                                            to someone on the team first.
                                        </>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </AlertDescription>
                </Alert>
            )}

            {deleted.length > 0 && (
                <p className="rounded-xl bg-destructive/5 p-4 text-sm leading-6">
                    These businesses only you run will also be deleted, with their
                    promotions, loyalty cards and QR posters:{" "}
                    <strong>{deleted.map((item) => item.business_name).join(", ")}</strong>.
                </p>
            )}

            <form action={formAction} className="space-y-3">
                <div className="space-y-2">
                    <Label htmlFor="confirm-delete">Type DELETE to confirm</Label>
                    <Input
                        id="confirm-delete"
                        name="confirm"
                        autoComplete="off"
                        disabled={blockers.length > 0 || pending}
                        className="max-w-xs"
                    />
                </div>

                {state?.error && (
                    <p role="alert" className="text-sm text-destructive">
                        {state.error}
                    </p>
                )}

                <Button type="submit" variant="destructive" disabled={blockers.length > 0 || pending}>
                    {pending ? "Deleting…" : "Delete my account"}
                </Button>
            </form>
        </div>
    );
}
