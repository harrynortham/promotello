"use client";

import Link from "next/link";
import { useState } from "react";

import { LoyaltyCard } from "@/components/loyalty-card";
import { StampQr } from "@/components/stamp-qr";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveLoyaltyProgram } from "./actions";

export type Program = {
    id: string;
    stamps_required: number;
    reward: string;
    terms: string | null;
    is_active: boolean;
};

// A sample code, so the preview carries a real QR like the live card.
const SAMPLE_CODE = "4F8A2C91D0";

export function ProgramFields({
    businessId,
    program,
    stampsRequired,
    setStampsRequired,
    reward,
    setReward,
    terms,
    setTerms,
}: {
    businessId: string;
    program: Program | null;
    stampsRequired: number;
    setStampsRequired: (value: number) => void;
    reward: string;
    setReward: (value: string) => void;
    terms: string;
    setTerms: (value: string) => void;
}) {
    return (
        <>
            <input type="hidden" name="businessId" value={businessId} />
            {program && <input type="hidden" name="programId" value={program.id} />}

            <div className="grid gap-5 sm:grid-cols-[160px_1fr]">
                <div className="space-y-2">
                    <Label htmlFor="stamps-required">Stamps needed</Label>
                    <select
                        id="stamps-required"
                        name="stampsRequired"
                        value={stampsRequired}
                        onChange={(event) => setStampsRequired(Number(event.target.value))}
                        className="h-12 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    >
                        {Array.from({ length: 18 }, (_, index) => index + 3).map((count) => (
                            <option key={count} value={count}>
                                {count} stamps
                            </option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="reward">Reward</Label>
                    <Input
                        id="reward"
                        name="reward"
                        required
                        minLength={2}
                        maxLength={80}
                        value={reward}
                        onChange={(event) => setReward(event.target.value)}
                        placeholder="A free coffee of your choice"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="terms">Terms (optional)</Label>
                <Textarea
                    id="terms"
                    name="terms"
                    maxLength={500}
                    rows={3}
                    value={terms}
                    onChange={(event) => setTerms(event.target.value)}
                    placeholder="One stamp per visit when you spend £3 or more."
                />
            </div>
        </>
    );
}

// Saving is a Pro feature, but anyone can build the card and see it, so
// the upgrade is a decision about something they have already made.
export function LoyaltyCardBuilder({
    businessId,
    businessName,
    businessLogoUrl,
    program,
    submitLabel,
    locked = false,
}: {
    businessId: string;
    businessName: string;
    businessLogoUrl: string | null;
    program: Program | null;
    submitLabel: string;
    locked?: boolean;
}) {
    const [stampsRequired, setStampsRequired] = useState(program?.stamps_required ?? 8);
    const [reward, setReward] = useState(program?.reward ?? "");
    const [terms, setTerms] = useState(program?.terms ?? "");

    const fields = (
        <ProgramFields
            businessId={businessId}
            program={program}
            stampsRequired={stampsRequired}
            setStampsRequired={setStampsRequired}
            reward={reward}
            setReward={setReward}
            terms={terms}
            setTerms={setTerms}
        />
    );

    return (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
            <Card className="border-[#17233B]/10">
                <CardHeader>
                    <CardTitle>Set up your stamp card</CardTitle>
                </CardHeader>

                <CardContent>
                    {locked ? (
                        <div className="space-y-5">
                            {fields}

                            <div className="rounded-xl border border-[#FF593F]/30 bg-[#FFF8F0] p-5">
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#FF593F]">
                                    Pro feature
                                </p>

                                <p className="mt-2 font-semibold">
                                    Your card is ready to go live
                                </p>

                                <p className="mt-1 text-sm leading-6 text-[#17233B]/65">
                                    Publishing puts it on your business page,
                                    so customers can start collecting stamps
                                    today. It is included in Pro, with a 30-day
                                    free trial.
                                </p>

                                <Button
                                    render={<Link href={`/business/${businessId}/billing`} />}
                                    nativeButton={false}
                                    size="lg"
                                    className="mt-4 bg-[#FF593F] text-white hover:bg-[#FF593F]/90"
                                >
                                    Start free trial to publish
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <form action={saveLoyaltyProgram} className="space-y-5">
                            {fields}

                            <SubmitButton
                                size="lg"
                                pendingLabel="Saving…"
                                className="bg-[#FF593F] text-white hover:bg-[#FF593F]/90"
                            >
                                {submitLabel}
                            </SubmitButton>
                        </form>
                    )}
                </CardContent>
            </Card>

            <div className="h-fit">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#17233B]/60">
                    The card customers carry
                </p>

                <div className="mt-3">
                    <LoyaltyCard
                        businessName={businessName}
                        logoUrl={businessLogoUrl}
                        stampsRequired={stampsRequired}
                        reward={reward}
                        stamps={Math.min(3, stampsRequired - 1)}
                        terms={terms}
                        code={SAMPLE_CODE}
                        qr={<StampQr code={SAMPLE_CODE} />}
                        className="border-[#17233B]/10"
                    />
                </div>

                <p className="mt-3 text-xs leading-5 text-[#17233B]/60">
                    An example card with sample stamps. Each customer gets
                    their own code and QR when they join.
                </p>
            </div>
        </div>
    );
}

// Editing a card that is already live, without the preview column: the
// page shows the saved card beside it.
export function ProgramSettingsForm({
    businessId,
    program,
    submitLabel,
}: {
    businessId: string;
    program: Program | null;
    submitLabel: string;
}) {
    const [stampsRequired, setStampsRequired] = useState(program?.stamps_required ?? 8);
    const [reward, setReward] = useState(program?.reward ?? "");
    const [terms, setTerms] = useState(program?.terms ?? "");

    return (
        <form action={saveLoyaltyProgram} className="space-y-5">
            <ProgramFields
                businessId={businessId}
                program={program}
                stampsRequired={stampsRequired}
                setStampsRequired={setStampsRequired}
                reward={reward}
                setReward={setReward}
                terms={terms}
                setTerms={setTerms}
            />

            <SubmitButton
                size="lg"
                pendingLabel="Saving…"
                className="bg-[#FF593F] text-white hover:bg-[#FF593F]/90"
            >
                {submitLabel}
            </SubmitButton>
        </form>
    );
}
