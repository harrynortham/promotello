"use client";

import Link from "next/link";
import { useState } from "react";

import { LoyaltyCard } from "@/components/loyalty-card";
import { LoyaltyDesignPicker } from "@/components/loyalty-design-picker";
import { StampQr } from "@/components/stamp-qr";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    cardColourName,
    stampIcon as readStampIcon,
    type CardColour,
    type StampIcon,
} from "@/lib/loyalty-design";
import { saveLoyaltyProgram } from "./actions";

export type Program = {
    id: string;
    // What this card is called, so a business with several can tell them
    // apart and a customer can choose between them.
    name: string;
    // When it stopped being handed out. Holders carry on collecting.
    closed_at?: string | null;
    stamps_required: number;
    reward: string;
    terms: string | null;
    is_active: boolean;
    card_colour: string | null;
    stamp_icon: string | null;
};

// A sample code, so the preview carries a real QR like the live card.
const SAMPLE_CODE = "4F8A2C91D0";

export function ProgramFields({
    businessId,
    program,
    replacing = false,
    lockTerms = false,
    name,
    setName,
    stampsRequired,
    setStampsRequired,
    reward,
    setReward,
    terms,
    setTerms,
    colour,
    setColour,
    icon,
    setIcon,
}: {
    businessId: string;
    program: Program | null;
    // Saving closes the card on offer and opens this one in its place.
    replacing?: boolean;
    // Somebody holds this card, so what it promises can't move.
    lockTerms?: boolean;
    name: string;
    setName: (value: string) => void;
    stampsRequired: number;
    setStampsRequired: (value: number) => void;
    reward: string;
    setReward: (value: string) => void;
    terms: string;
    setTerms: (value: string) => void;
    colour: CardColour;
    setColour: (value: CardColour) => void;
    icon: StampIcon;
    setIcon: (value: StampIcon) => void;
}) {
    return (
        <>
            <input type="hidden" name="businessId" value={businessId} />
            {program && <input type="hidden" name="programId" value={program.id} />}
            {replacing && <input type="hidden" name="replacing" value="true" />}
            {lockTerms && <input type="hidden" name="stampsRequired" value={stampsRequired} />}

            <div className="space-y-2">
                <Label htmlFor="card-name">Card name</Label>
                <Input
                    id="card-name"
                    name="name"
                    required
                    minLength={2}
                    maxLength={60}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Coffee card"
                />
                <p className="text-xs leading-5 text-[#17233B]/65">
                    Customers see this when they choose which of your cards to
                    join, so name it after what it stamps.
                </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-[160px_1fr]">
                <div className="space-y-2">
                    <Label htmlFor="stamps-required">Stamps needed</Label>
                    <select
                        id="stamps-required"
                        name="stampsRequired"
                        value={stampsRequired}
                        onChange={(event) => setStampsRequired(Number(event.target.value))}
                        disabled={lockTerms}
                        className="h-12 w-full rounded-lg border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-70"
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
                        readOnly={lockTerms}
                        aria-readonly={lockTerms || undefined}
                        className={lockTerms ? "cursor-not-allowed opacity-70" : undefined}
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
                    readOnly={lockTerms}
                    aria-readonly={lockTerms || undefined}
                    className={lockTerms ? "cursor-not-allowed opacity-70" : undefined}
                    placeholder="One stamp per visit when you spend £3 or more."
                />
            </div>

            <div className="space-y-3">
                <p className="text-sm font-medium">How the card looks</p>

                <LoyaltyDesignPicker
                    colour={colour}
                    icon={icon}
                    onColour={setColour}
                    onIcon={setIcon}
                />
            </div>

            <input type="hidden" name="cardColour" value={colour} />
            <input type="hidden" name="stampIcon" value={icon} />
        </>
    );
}

// Saving is a Pro feature, but anyone can build the card and see it, so
// the upgrade is a decision about something they have already made.
export function LoyaltyCardBuilder({
    businessId,
    businessName,
    replacing = false,
    businessLogoUrl,
    program,
    submitLabel,
    locked = false,
}: {
    businessId: string;
    businessName: string;
    businessLogoUrl: string | null;
    program: Program | null;
    // Saving closes the card on offer and opens this one in its place.
    replacing?: boolean;
    submitLabel: string;
    locked?: boolean;
}) {
    const [name, setName] = useState(program?.name ?? "");
    const [stampsRequired, setStampsRequired] = useState(program?.stamps_required ?? 8);
    const [reward, setReward] = useState(program?.reward ?? "");
    const [terms, setTerms] = useState(program?.terms ?? "");
    const [colour, setColour] = useState<CardColour>(cardColourName(program?.card_colour));
    const [icon, setIcon] = useState<StampIcon>(readStampIcon(program?.stamp_icon));

    const fields = (
        <ProgramFields
            businessId={businessId}
            program={program}
            replacing={replacing}
            name={name}
            setName={setName}
            stampsRequired={stampsRequired}
            setStampsRequired={setStampsRequired}
            reward={reward}
            setReward={setReward}
            terms={terms}
            setTerms={setTerms}
            colour={colour}
            setColour={setColour}
            icon={icon}
            setIcon={setIcon}
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

            {/* It stays beside the form as the fields go past, the same
                as the offer and profile previews. top-24 clears the site
                header, which is sticky and 80px tall. */}
            <aside className="h-fit lg:sticky lg:top-24">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#17233B]/65">
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
                        colour={colour}
                        stampIcon={icon}
                        className="border-[#17233B]/10"
                    />
                </div>

                <p className="mt-3 text-xs leading-5 text-[#17233B]/65">
                    An example card with sample stamps. Each customer gets
                    their own code and QR when they join.
                </p>
            </aside>
        </div>
    );
}

// Editing a card that is already live, without the preview column: the
// page shows the saved card beside it.
export function ProgramSettingsForm({
    businessId,
    program,
    lockTerms = false,
    submitLabel,
}: {
    businessId: string;
    program: Program | null;
    // The stamps, the reward and the terms are the promise: once anyone
    // holds the card they are shown but not changed.
    lockTerms?: boolean;
    submitLabel: string;
}) {
    const [name, setName] = useState(program?.name ?? "");
    const [stampsRequired, setStampsRequired] = useState(program?.stamps_required ?? 8);
    const [reward, setReward] = useState(program?.reward ?? "");
    const [terms, setTerms] = useState(program?.terms ?? "");
    const [colour, setColour] = useState<CardColour>(cardColourName(program?.card_colour));
    const [icon, setIcon] = useState<StampIcon>(readStampIcon(program?.stamp_icon));

    return (
        <form action={saveLoyaltyProgram} className="space-y-5">
            <ProgramFields
                businessId={businessId}
                program={program}
                lockTerms={lockTerms}
                name={name}
                setName={setName}
                stampsRequired={stampsRequired}
                setStampsRequired={setStampsRequired}
                reward={reward}
                setReward={setReward}
                terms={terms}
                setTerms={setTerms}
                colour={colour}
                setColour={setColour}
                icon={icon}
                setIcon={setIcon}
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
