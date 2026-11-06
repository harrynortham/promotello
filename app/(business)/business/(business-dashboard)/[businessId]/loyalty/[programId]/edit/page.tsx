import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { SharePanel } from "@/components/share-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { loyaltyShareCaption, shareLink } from "@/lib/share";
import { loadLoyaltyEditor } from "../../loyalty-data";
import { ProgramSettingsForm, type Program } from "../../program-form";
import { setLoyaltyProgramActive } from "../../actions";
import { CardDesign } from "../../card-design";

// One card, to change or pause. Changing the stamps changes everyone's
// card, which is why this says so where the button is.

type PageProps = { params: Promise<{ businessId: string; programId: string }> };

function LoadingState() {
    return (
        <div>
            <Skeleton className="h-10 w-48 rounded-lg" />
            <Skeleton className="mt-8 h-[28rem] rounded-xl" />
        </div>
    );
}

async function EditLoyaltyCard({ params }: PageProps) {
    await connection();

    const { businessId, programId } = await params;
    const editor = await loadLoyaltyEditor(businessId);
    const back = `/business/${businessId}/loyalty`;

    if (!editor.canManage) {
        redirect(back);
    }

    const { data } = await editor.supabase
        .from("loyalty_programs")
        .select("id, name, stamps_required, reward, terms, is_active, card_colour, stamp_icon")
        .eq("id", programId)
        .eq("business_id", businessId)
        .maybeSingle();

    if (!data) {
        notFound();
    }

    const program = data as Program;

    return (
        <div className="text-[#17233B]">
            <Button render={<Link href={back} />} nativeButton={false} variant="ghost" size="sm">
                <FiArrowLeft aria-hidden="true" />
                Loyalty cards
            </Button>

            <header className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                        {program.is_active ? "Live card" : "Paused card"}
                    </p>

                    <h1 className="mt-3 text-4xl font-semibold tracking-tight">{program.name}</h1>

                    <p className="mt-3 max-w-2xl text-[#17233B]/65">
                        Collect {program.stamps_required} stamps, get{" "}
                        {program.reward.charAt(0).toLowerCase() + program.reward.slice(1)}.
                    </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-3">
                    <CardDesign
                        businessId={businessId}
                        programId={program.id}
                        businessName={editor.businessName}
                        businessLogoUrl={editor.businessLogoUrl}
                        stampsRequired={program.stamps_required}
                        reward={program.reward}
                        terms={program.terms}
                        colour={program.card_colour}
                        stampIcon={program.stamp_icon}
                    />

                    {program.is_active && editor.businessSlug && editor.isApproved && (
                        <SharePanel
                            title="Share this loyalty card"
                            url={shareLink(`/businesses/${editor.businessSlug}`)}
                            caption={loyaltyShareCaption({
                                stampsRequired: program.stamps_required,
                                reward: program.reward,
                                businessName: editor.businessName,
                            })}
                            images={[
                                {
                                    label: "Instagram story",
                                    href: `/businesses/${editor.businessSlug}/story-image`,
                                    filename: `${editor.businessSlug}-loyalty-story.png`,
                                    aspect: "aspect-[9/16]",
                                },
                                {
                                    label: "Post",
                                    href: `/businesses/${editor.businessSlug}/post-image`,
                                    filename: `${editor.businessSlug}-loyalty-post.png`,
                                    aspect: "aspect-square",
                                },
                            ]}
                            triggerLabel="Share card"
                        />
                    )}

                    <form action={setLoyaltyProgramActive}>
                        <input type="hidden" name="businessId" value={businessId} />
                        <input type="hidden" name="programId" value={program.id} />
                        <input type="hidden" name="active" value={String(!program.is_active)} />
                        <Button type="submit" variant="outline">
                            {program.is_active ? "Pause this card" : "Resume this card"}
                        </Button>
                    </form>
                </div>
            </header>

            <Card className="mt-8 border-[#17233B]/10">
                <CardHeader>
                    <CardTitle>Card settings</CardTitle>
                </CardHeader>

                <CardContent>
                    <ProgramSettingsForm
                        businessId={businessId}
                        program={program}
                        submitLabel="Save changes"
                    />

                    <p className="mt-4 text-xs text-[#17233B]/70">
                        Changing the number of stamps applies to everyone&apos;s card
                        straight away.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

export default function EditLoyaltyCardPage(props: PageProps) {
    return (
        <Suspense fallback={<LoadingState />}>
            <EditLoyaltyCard {...props} />
        </Suspense>
    );
}
