import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { FiExternalLink } from "react-icons/fi";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
    STAGES,
    STAGE_LABELS,
    dueDate,
    eventLabel,
    followUpDue,
    leadAddress,
    letterDue,
    whenSaid,
} from "@/lib/sales-pipeline";
import { createClient } from "@/utils/supabase/server";
import { JumpToField } from "@/components/jump-to-field";
import { SavingForm } from "@/components/saving-form";
import { SubmitButton } from "@/components/submit-button";
import { businessPath } from "@/lib/slugs";
import { whyNotIndexed } from "@/lib/indexing";
import { NativeSelect } from "@/components/ui/native-select";
import { CopyButton } from "@/components/copy-button";
import { LetterCard } from "./letter-card";
import { LocationFields } from "@/components/location-fields";
import { getCityOptions } from "@/lib/locations";
import { foundingPlacesLeft } from "@/lib/founding-places";
import { LETTER_COST, letterAddress, letterDestination, lettersConfigured, STANNP_KEY } from "@/lib/letters";
import {
    followUpSubject,
    instagramDmUrl,
    instagramHandle,
    outreachDm,
    outreachFollowUp,
    outreachMessage,
    outreachSubject,
    previewColumns,
    senderName,
    type PreviewRow,
} from "@/lib/preview-email";
import { neighboursIn } from "@/lib/neighbours";
import { previewLink } from "@/lib/previews";
import { DEFAULT_STAMPS, STAMPS_MAX, STAMPS_MIN } from "@/lib/starter";
import { createAdminClient } from "@/utils/supabase/admin";
import { absoluteUrl } from "@/lib/site";
import { CategorySelect } from "@/components/category-select";
import {
    checkCompany,
    deleteLead,
    deleteLeadPreview,
    enrichLead,
    moveLead,
    queueOutreach,
    recordDm,
    saveLeadAddress,
    saveLeadCompany,
    saveLeadDetails,
    saveLeadNotes,
    declinePageClaim,
    fillInLeadPage,
    publishLeadPage,
    releasePageClaim,
    saveLeadPreviewSamples,
    unpublishLeadPage,
} from "../actions";

// The business, not "Lead". Several of these are open at once while a
// street is worked through, and every tab saying the same word is no way
// to find the one you want.
export async function generateMetadata({ params }: { params: Promise<{ leadId: string }> }): Promise<Metadata> {
    await connection();

    const { leadId } = await params;
    const supabase = await createClient();

    const { data: lead } = await supabase
        .from("leads")
        .select("name")
        .eq("id", leadId)
        .maybeSingle();

    return { title: lead?.name ?? "Lead", robots: { index: false } };
}

type PageProps = {
    params: Promise<{ leadId: string }>;
    searchParams: Promise<{
        already?: string;
        undeletable?: string;
        confirm?: string;
        filled?: string;
        nohours?: string;
        saved?: string;
        queued?: string;
        moved?: string;
        crawled?: string;
        error?: string;
    }>;
};

function When({ value }: { value: string }) {
    return (
        <>
            {new Intl.DateTimeFormat("en-GB", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Europe/London",
            }).format(new Date(value))}
        </>
    );
}

async function Lead({ params, searchParams }: PageProps) {
    await connection();

    const supabase = await createClient();
    const { data: isAdmin } = await supabase.rpc("is_platform_admin");

    if (!isAdmin) redirect("/admin");

    const { leadId } = await params;
    const { already, undeletable, confirm, saved, queued, moved, crawled, filled, nohours, error } =
        await searchParams;
    const confirming = confirm === "delete";

    const { data: lead } = await supabase
        .from("leads")
        .select("*, areas ( name ), cities ( name ), categories ( name )")
        .eq("id", leadId)
        .maybeSingle();

    if (!lead) notFound();

    const { data: events } = await supabase
        .from("lead_events")
        .select("id, kind, detail, created_at")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });

    // Whether it can be deleted at all, so the page does not offer
    // something the action will refuse.
    const { count: writtenTo } = await supabase
        .from("outreach_messages")
        .select("id", { count: "exact", head: true })
        .eq("lead_id", leadId);

    // What has actually gone, and when. The three ways of writing to a
    // business are a sequence, not a menu, and this is what says where
    // in it this lead is.
    const { data: sentMessages } = await supabase
        .from("outreach_messages")
        .select("kind, sent_at")
        .eq("lead_id", leadId)
        .eq("status", "sent");

    const firstSentAt = (sentMessages ?? []).find((m) => m.kind === "first")?.sent_at ?? null;
    const followUpSentAt = (sentMessages ?? []).find((m) => m.kind === "follow_up")?.sent_at ?? null;

    // The last DM, if one has gone. From the events the page already
    // reads, so it costs nothing.
    const dmSentAt =
        (events ?? []).find((event) => event.kind === "dm_sent")?.created_at ?? null;

    const typedEmail = lead.email_source === "typed";
    const letterTo = letterAddress(lead);

    // The DM, where there is a handle and a page to point at. Written
    // by the same composer the email uses, so the two cannot drift —
    // and shorter, because a DM is read on a phone in a second.
    const dmHandle = instagramHandle(lead.instagram_handle);

    // Companies House's own advanced search, with the lead's name already
    // in it, for the times our check finds nothing and somebody has to
    // go and look.
    const companiesHouseSearch =
        "https://find-and-update.company-information.service.gov.uk/advanced-search/get-results" +
        `?companyNameIncludes=${encodeURIComponent(lead.name)}`;

    // The same list the add form offers, so a lead can be moved to any
    // town or area it could have been added to.
    const cities = await getCityOptions({ includeNotLive: true });



    const area = Array.isArray(lead.areas) ? lead.areas[0] : lead.areas;
    const city = Array.isArray(lead.cities) ? lead.cities[0] : lead.cities;

    // The preview, if there is one: the link to send, and whether anybody
    // has opened it.
    const { data: preview } = lead.preview_business_id
        ? await supabase
              .from("business_previews")
              .select(
                  "token, view_count, last_viewed_at, claimed_at, sample_offer, sample_reward, sample_stamps",
              )
              .eq("business_id", lead.preview_business_id)
              .maybeSingle()
        : { data: null };

    const publicPreview = preview ? absoluteUrl(previewLink(preview.token, lead.name)) : null;

    // Pages first: whether this lead's page is already public, and the
    // open claim requests on it.
    const { data: previewBusiness } = lead.preview_business_id
        ? await supabase
              .from("businesses")
              .select("slug, listed_at, approval_status, description, business_locations ( city )")
              .eq("id", lead.preview_business_id)
              .maybeSingle()
        : { data: null };

    const { data: claimRequests } = lead.preview_business_id
        ? await supabase
              .from("page_claim_requests")
              .select("id, contact_name, contact_email, connection, created_at")
              .eq("business_id", lead.preview_business_id)
              .eq("status", "open")
              .order("created_at", { ascending: true })
        : { data: null };

    const livePage = previewBusiness?.listed_at
        ? absoluteUrl(businessPath({ slug: previewBusiness.slug }))
        : null;

    // Why a published page is being kept out of Google, if it is. Ten
    // pages with a name and a map between them is thin, and thin is
    // judged site-wide (lib/indexing.ts).
    const thin = previewBusiness
        ? whyNotIndexed({
            unclaimed: previewBusiness.approval_status !== "approved",
            description: previewBusiness.description,
            hasAddress: (previewBusiness.business_locations ?? []).length > 0,
        })
        : null;

    // The two emails as they stand today, so they can be read before
    // anything is queued. Built from the same functions that draft them,
    // or this would be a second version that drifts.
    const { data: previewRow } = lead.preview_business_id
        ? await supabase
              .from("business_previews")
              .select(previewColumns)
              .eq("business_id", lead.preview_business_id)
              .maybeSingle()
        : { data: null };

    // Two of them. The opener carries no link, because a cold DM with a
    // link in it is the shape of every scam people are told to ignore —
    // it asks first, and the link goes in the reply.
    const dms = previewRow
        ? await (async () => {
              const shared = {
                  preview: previewRow as unknown as PreviewRow,
                  sender: senderName((await supabase.auth.getUser()).data.user?.user_metadata?.full_name),
                  placesLeft: await foundingPlacesLeft(),
                  contactName: lead.contact_name,
                  personalLine: lead.personal_line,
              };

              return [
                  { key: "opener" as const, label: "Ask first", body: outreachDm({ ...shared, variant: "opener" }) },
                  { key: "full" as const, label: "With the link", body: outreachDm({ ...shared, variant: "full" }) },
              ];
          })()
        : null;

    const drafts = previewRow
        ? await (async () => {
              const row = previewRow as unknown as PreviewRow;
              const placesLeft = await foundingPlacesLeft();
              // Who else is on their street. Admin client because it
              // counts every approved business in the area, not only
              // the ones this admin can see through RLS.
              const area = row.businesses?.business_locations?.[0]?.area_id ?? null;
              const nearby = await neighboursIn(createAdminClient(), area, row.business_id);

              return [
                  {
                      kind: "first" as const,
                      subject: outreachSubject(row),
                      body: outreachMessage({
                          preview: row,
                          placesLeft,
                          contactName: lead.contact_name,
                          personalLine: lead.personal_line,
                          neighbours: nearby,
                      }),
                  },
                  {
                      kind: "follow-up" as const,
                      subject: followUpSubject(row),
                      body: outreachFollowUp({ preview: row, placesLeft, contactName: lead.contact_name }),
                  },
              ];
          })()
        : null;

    // What a preview is built from, said before it is built. Named rather
    // than counted: "something is missing" sends somebody hunting.
    const leadCategory = Array.isArray(lead.categories) ? lead.categories[0] : lead.categories;

    // Not the description: that is asked for on the build page now, so
    // demanding it here withheld the button for the one thing the button
    // leads to a form for.
    const missingForPreview = [
        !leadCategory && "a category",
        !lead.address_line_1 && "a street address",
        !lead.postcode && "a postcode",
    ].filter(Boolean) as string[];


    return (
        <div className="text-[#17233B]">
            <Button render={<Link href="/admin/sales" />} nativeButton={false} variant="ghost" size="sm">
                ← The pipeline
            </Button>

            {/* "Saved." is right for a field. Publishing a page puts it
                in front of strangers, and releasing one gives it away, so
                those say what actually happened. */}
            {saved && (
                <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                    {saved === "page_published"
                        ? "The page is live. It is in the directory and the sitemap, with no offer or card on it."
                        : saved === "page_unpublished"
                            ? "The page is down. Nobody but us can see it now."
                            : saved === "claim_released"
                                ? "Sent. The claim link is on its way to the address on the request."
                                : saved === "claim_declined"
                                    ? "Closed. Nothing was sent — write to them yourself if they are owed an answer."
                                    : "Saved."}
                </p>
            )}

            {filled && (
                <p className="mt-4 rounded-lg border border-[#17233B]/15 bg-white px-4 py-3 text-sm text-[#17233B]/75">
                    {filled === "nothing"
                        ? `Nothing to add: ${nohours ?? "nothing new was found"}.`
                        : `Filled in ${filled}.${nohours ? ` No hours: ${nohours}.` : ""}`}
                </p>
            )}

            {moved && (
                <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                    Moved to {moved}.
                </p>
            )}

            {/* Reading their site takes a few seconds and often finds
                nothing, which looked like a button that did nothing. */}
            {crawled && (
                <p className="mt-4 rounded-lg border border-[#17233B]/15 bg-white px-4 py-3 text-sm text-[#17233B]/75">
                    {crawled === "email"
                        ? "Read their site and found an email."
                        : crawled === "address"
                            ? "Read their site and found an address, but no email."
                            : "Read their site. Nothing on it we could use — add the email by hand."}
                </p>
            )}

            {/* Queueing moves the draft somewhere else, so it needs to
                say where it went and offer the way there. */}
            {queued && (
                <p className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                    {queued === "follow_up" ? "The follow-up is" : "The first email is"} in the
                    outbox. Nothing goes until you read it and press send.
                    <Link href="/admin/sales/outbox" className="font-medium underline">
                        Open the outbox
                    </Link>
                </p>
            )}

            {error && (
                <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-900">
                    {error === "post_only_stage"
                        ? "Not moved: this lead is post only until Companies House says otherwise."
                        : error === "post_only"
                        ? "Not queued: this lead is post only until Companies House says otherwise."
                        : error === "no_email"
                            ? "Not queued: there is no address to write to."
                            : error === "no_preview"
                                ? "Not queued: build the preview first — the email is a link to it."
                                : error === "no_first_email"
                                    ? "Not queued: the first email has not gone yet, so there is nothing to follow up."
                                    : error === "already_queued"
                                        ? "That one is already waiting in the outbox."
                                        : error === "no_name"
                        ? "A lead needs a name."
                        : error === "duplicate"
                            ? "Another lead already has that name and postcode."
                            : error === "bad_company_number"
                                ? "A company number is eight characters: eight digits, or two letters and six digits."
                                : error}
                </p>
            )}

            {already && (
                <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    This business was already on the list — here it is. Nothing was added twice.
                </p>
            )}

            {undeletable && (
                <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                    {undeletable === "emailed"
                        ? "This lead can't be deleted: we have written to them, and that record is why we wouldn't write again. Move it to Not interested or Closed instead."
                        : undeletable === "preview"
                            ? "This lead has a preview built from it. Delete or close the business first, or move the lead to Closed."
                            : undeletable}
                </p>
            )}

            <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <h1 className="text-3xl font-semibold tracking-tight">{lead.name}</h1>

                        <JumpToField
                            target="name"
                            className="cursor-pointer text-sm text-[#17233B]/65 underline-offset-4 hover:text-[#FF593F] hover:underline"
                        >
                            Rename
                        </JumpToField>
                    </div>
                    <p className="mt-2 text-sm text-[#17233B]/65">
                        {[leadAddress(lead), area?.name].filter(Boolean).join(" · ") || "No address yet"}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {lead.can_email ? (
                        <Badge variant="secondary">Emailable</Badge>
                    ) : (
                        <Badge variant="outline" className="border-[#FF593F]/30 text-[#FF593F]">
                            Post only
                        </Badge>
                    )}
                    <Badge variant="outline">{STAGE_LABELS[lead.stage] ?? lead.stage}</Badge>
                </div>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    <Card className="border-[#17233B]/10">
                        <CardHeader>
                            <CardTitle className="text-base">What we know, and where from</CardTitle>
                        </CardHeader>

                        <CardContent className="space-y-4 text-sm">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-[#17233B]/55">Email</p>
                                    <p className="mt-1 font-medium">{lead.email ?? "Not found yet"}</p>
                                    {/* "typed" is not a URL, and linking to it
                                        went nowhere. Only a page they published
                                        is worth opening. */}
                                    {typedEmail ? (
                                        <p className="mt-1 text-xs text-[#17233B]/60">
                                            Entered by hand, and left alone by the crawler.
                                        </p>
                                    ) : (
                                        lead.email_source && (
                                            <a
                                                href={lead.email_source}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="mt-1 inline-flex items-center gap-1 text-xs text-[#17233B]/60 hover:text-[#FF593F]"
                                            >
                                                from {lead.email_source.replace(/^https?:\/\//, "").slice(0, 48)}
                                                <FiExternalLink aria-hidden="true" className="size-3" />
                                            </a>
                                        )
                                    )}
                                </div>

                                {/* Nothing to look again for once somebody has
                                    written one down: the crawler would not
                                    replace it, so the button would do nothing
                                    anybody wanted. */}
                                {!typedEmail && (
                                    <form action={enrichLead}>
                                        <input type="hidden" name="leadId" value={lead.id} />
                                        <SubmitButton
                                            pendingLabel="Reading…"
                                            size="sm"
                                            variant="outline"
                                            disabled={!lead.website}
                                        >
                                            {lead.email ? "Look again" : "Read their site"}
                                        </SubmitButton>
                                    </form>
                                )}
                            </div>

                            {/* Where a letter would go, and whether it is
                                ours to keep. The import's address is
                                Google's and provisional; the one on their
                                own contact page is theirs and published
                                (20270202090000). */}
                            <div className="border-t pt-4">
                                <p className="text-xs uppercase tracking-wide text-[#17233B]/55">
                                    Postal address
                                </p>
                                <p className="mt-1 text-xs leading-5 text-[#17233B]/60">
                                    {lead.address_source === "website"
                                        ? "Published on their own site — ours to keep, and where a letter goes."
                                        : lead.address_source === "typed"
                                            ? "Entered by hand, and left alone by the crawler."
                                            : "Read their site, or write one below, before posting anything."}
                                </p>

                                {/* Typed outranks both: wherever somebody found
                                    it, a shop's address is a fact about a
                                    street, and writing it down is not keeping
                                    anybody's API response. */}
                                {/* The same fields the add form uses, by the
                                    same component, so a lead is corrected the
                                    way it was written. The town and the area
                                    used to be fixed at the moment it was
                                    added, which made a lead filed in the
                                    wrong part of town unfixable. */}
                                <SavingForm action={saveLeadAddress} className="mt-3 space-y-4">
                                    <input type="hidden" name="leadId" value={lead.id} />

                                    <div className="space-y-1">
                                        <Label htmlFor="addressLine1" className="text-xs">
                                            Street address
                                        </Label>
                                        <Input
                                            id="addressLine1"
                                            name="addressLine1"
                                            defaultValue={lead.address_line_1 ?? ""}
                                            maxLength={200}
                                            placeholder="e.g. 214 Gloucester Road"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <Label htmlFor="addressLine2" className="text-xs">
                                            Locality
                                        </Label>
                                        <Input
                                            id="addressLine2"
                                            name="addressLine2"
                                            defaultValue={lead.address_line_2 ?? ""}
                                            maxLength={200}
                                            placeholder="e.g. Horfield"
                                        />
                                        <p className="text-[11px] leading-5 text-[#17233B]/55">
                                            The line between the street and the town on an envelope.
                                            Not the area below, which is where they are listed.
                                        </p>
                                    </div>

                                    <LocationFields
                                        cities={cities}
                                        waitlist={false}
                                        optional
                                        defaults={{
                                            city: city?.name,
                                            area: area?.name,
                                            postalCode: lead.postcode,
                                        }}
                                    />

                                    <SubmitButton pendingLabel="Saving…" variant="outline" size="sm">
                                        Save this address
                                    </SubmitButton>
                                </SavingForm>

                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-[#17233B]/55">
                                        Companies House
                                    </p>
                                    <p className="mt-1 font-medium">
                                        {lead.company_number
                                            ? `${lead.company_name ?? "Registered"} · ${lead.company_number}`
                                            : lead.companies_house_checked_at
                                                ? "No confident match — post only"
                                                : "Not checked"}
                                    </p>
                                    <p className="mt-1 text-xs leading-5 text-[#17233B]/60">
                                        A limited company may be emailed. A sole trader may not,
                                        so they get a letter instead.
                                    </p>
                                </div>

                                <form action={checkCompany}>
                                    <input type="hidden" name="leadId" value={lead.id} />
                                    <SubmitButton pendingLabel="Checking…" variant="outline" size="sm">
                                        {lead.companies_house_checked_at ? "Check again" : "Check"}
                                    </SubmitButton>
                                </form>
                            </div>

                            {/* The same fact by another route: somebody read
                                the register instead of us calling it. Stored
                                the same way, and the gate still decides what
                                it unlocks — a number is what makes a lead
                                emailable, and clearing it puts them back to
                                post only. */}
                            <SavingForm action={saveLeadCompany} className="space-y-3 border-t pt-4">
                                <input type="hidden" name="leadId" value={lead.id} />

                                <div className="flex flex-wrap items-baseline justify-between gap-2">
                                    <p className="text-xs uppercase tracking-wide text-[#17233B]/55">
                                        Or write the company down
                                    </p>

                                    {/* The register itself, with the name
                                        already in the box. The search matches
                                        the name literally, so a shop called
                                        Joe's is only found by typing the
                                        apostrophe — which is the same thing
                                        that used to beat our own matcher. */}
                                    <a
                                        href={companiesHouseSearch}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 text-xs font-medium text-[#FF593F] hover:underline"
                                    >
                                        Look it up on Companies House
                                        <FiExternalLink aria-hidden="true" className="size-3" />
                                    </a>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="space-y-1">
                                        <Label htmlFor="companyName" className="text-xs">
                                            Registered name
                                        </Label>
                                        <Input
                                            id="companyName"
                                            name="companyName"
                                            defaultValue={lead.company_name ?? ""}
                                            maxLength={200}
                                            placeholder="JOE'S BAKERY LIMITED"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <Label htmlFor="companyNumber" className="text-xs">
                                            Company number
                                        </Label>
                                        <Input
                                            id="companyNumber"
                                            name="companyNumber"
                                            defaultValue={lead.company_number ?? ""}
                                            maxLength={10}
                                            placeholder="08423930"
                                        />
                                    </div>
                                </div>

                                <SubmitButton pendingLabel="Saving…" variant="outline" size="sm">
                                    Save the company
                                </SubmitButton>

                                <p className="text-[11px] leading-5 text-[#17233B]/55">
                                    A number here makes them emailable. Clearing it puts them back to
                                    post only.
                                </p>
                            </SavingForm>

                        </CardContent>
                    </Card>

                    {/* Everything else, editable. A lead is written down by
                        hand, so it is corrected by hand too — a name typed
                        wrong, an email found later, the person who actually
                        runs the place. */}
                    <Card className="border-[#17233B]/10">
                        <CardHeader>
                            <CardTitle className="text-base">The details</CardTitle>
                        </CardHeader>

                        <CardContent>
                            <SavingForm action={saveLeadDetails} className="space-y-5 text-sm">
                                <input type="hidden" name="leadId" value={lead.id} />

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-1">
                                        <Label htmlFor="name" className="text-xs">
                                            Business name
                                        </Label>
                                        <Input
                                            id="name"
                                            name="name"
                                            required
                                            defaultValue={lead.name}
                                            maxLength={120}
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <Label htmlFor="contactName" className="text-xs">
                                            Who to write to
                                        </Label>
                                        <Input
                                            id="contactName"
                                            name="contactName"
                                            defaultValue={lead.contact_name ?? ""}
                                            maxLength={80}
                                            placeholder="Sam"
                                        />
                                    </div>
                                </div>

                                {/* Opens the first email, so the business
                                    knows somebody looked at them rather than
                                    at a list. Blank is a fine answer: an
                                    invented one is obvious. */}
                                <div className="space-y-1">
                                    <Label htmlFor="personalLine" className="text-xs">
                                        Personal line (optional)
                                    </Label>
                                    <Input
                                        id="personalLine"
                                        name="personalLine"
                                        defaultValue={lead.personal_line ?? ""}
                                        maxLength={200}
                                        placeholder="I see you’ve got 4.8 stars from over 300 reviews, which is why you’re one of the first places I wanted on here."
                                    />
                                    <p className="text-[11px] leading-5 text-[#17233B]/55">
                                        One specific, true sentence about this business, e.g. something
                                        from their reviews or photos. Leave blank to skip.
                                    </p>
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="categoryId" className="text-xs">
                                        Category
                                    </Label>
                                    <CategorySelect
                                        id="categoryId"
                                        name="categoryId"
                                        defaultValue={lead.category_id ?? undefined}
                                    />
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-1">
                                        <Label htmlFor="email" className="text-xs">
                                            Email
                                        </Label>
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            defaultValue={lead.email ?? ""}
                                            maxLength={160}
                                            placeholder="hello@theirshop.com"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <Label htmlFor="phone" className="text-xs">
                                            Phone
                                        </Label>
                                        <Input
                                            id="phone"
                                            name="phone"
                                            defaultValue={lead.phone ?? ""}
                                            maxLength={40}
                                        />
                                    </div>
                                </div>

                                {/* Both are worth a look before writing to
                                    them — the site says what they sell, the
                                    feed says whether anybody is minding it —
                                    and the address was sitting in a box you
                                    had to copy out of. Only when there is
                                    something to open. */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-1">
                                        <div className="flex items-baseline justify-between gap-2">
                                            <Label htmlFor="website" className="text-xs">
                                                Website
                                            </Label>

                                            {lead.website && (
                                                <a
                                                    href={lead.website}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-xs text-[#FF593F] underline underline-offset-2"
                                                >
                                                    Open
                                                    <FiExternalLink aria-hidden="true" />
                                                </a>
                                            )}
                                        </div>

                                        <Input
                                            id="website"
                                            name="website"
                                            type="url"
                                            defaultValue={lead.website ?? ""}
                                            placeholder="https://"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex items-baseline justify-between gap-2">
                                            <Label htmlFor="instagramHandle" className="text-xs">
                                                Instagram
                                            </Label>

                                            {/* The profile, not the DM —
                                                that is its own button under
                                                "Write to them". This is for
                                                looking before deciding. */}
                                            {dmHandle && (
                                                <a
                                                    href={`https://instagram.com/${dmHandle}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-xs text-[#FF593F] underline underline-offset-2"
                                                >
                                                    @{dmHandle}
                                                    <FiExternalLink aria-hidden="true" />
                                                </a>
                                            )}
                                        </div>

                                        <Input
                                            id="instagramHandle"
                                            name="instagramHandle"
                                            defaultValue={lead.instagram_handle ?? ""}
                                            maxLength={120}
                                            placeholder="@theirshop"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <SubmitButton pendingLabel="Saving…" variant="outline" size="sm">
                                        Save the details
                                    </SubmitButton>
                                </div>
                            </SavingForm>
                        </CardContent>
                    </Card>

                    <Card className="border-[#17233B]/10">
                        <CardHeader>
                            <CardTitle className="text-base">The preview</CardTitle>
                        </CardHeader>

                        <CardContent className="space-y-4 text-sm">
                            {preview ? (
                                <>
                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-[#17233B]/55">
                                            The link they get
                                        </p>
                                        <a
                                            href={publicPreview ?? "#"}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="mt-1 inline-flex items-center gap-1 break-all font-medium hover:text-[#FF593F]"
                                        >
                                            {publicPreview?.replace(/^https?:\/\//, "")}
                                            <FiExternalLink aria-hidden="true" className="size-3 shrink-0" />
                                        </a>
                                    </div>

                                    <div className="border-t pt-4">
                                        <p className="text-xs uppercase tracking-wide text-[#17233B]/55">
                                            Has it been read
                                        </p>
                                        <p className="mt-1 font-medium">
                                            {preview.claimed_at
                                                ? "Claimed"
                                                : preview.view_count > 0
                                                    ? `Opened ${preview.view_count} ${preview.view_count === 1 ? "time" : "times"}`
                                                    : "Not opened yet"}
                                        </p>
                                        {preview.last_viewed_at && !preview.claimed_at && (
                                            <p className="mt-0.5 text-xs text-[#17233B]/55">
                                                Last <When value={preview.last_viewed_at} />
                                            </p>
                                        )}
                                    </div>

                                    {/* Pages first. The page goes up before
                                        they are contacted, so the email is
                                        about a page that already exists. */}
                                    <div className="border-t pt-4">
                                        <p className="text-xs uppercase tracking-wide text-[#17233B]/55">
                                            The public page
                                        </p>

                                        {livePage ? (
                                            <>
                                                <a
                                                    href={livePage}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="mt-1 inline-flex items-center gap-1 break-all font-medium hover:text-[#FF593F]"
                                                >
                                                    {livePage.replace(/^https?:\/\//, "")}
                                                    <FiExternalLink aria-hidden="true" className="size-3 shrink-0" />
                                                </a>
                                                <p className="mt-1 text-xs text-[#17233B]/55">
                                                    Live since <When value={previewBusiness!.listed_at!} />. Name,
                                                    category and map only: no offer or card can show until they
                                                    claim it.
                                                </p>

                                                {thin ? (
                                                    <div className="mt-3 rounded-lg bg-[#FFF4E8] px-3 py-2.5">
                                                        <p className="text-xs font-medium">
                                                            Not in Google yet: it needs {thin}
                                                        </p>
                                                        <p className="mt-1 text-xs text-[#17233B]/60">
                                                            The page works and is in the directory. It carries a
                                                            noindex and stays out of the sitemap until there is
                                                            enough on it to be worth a click.
                                                        </p>

                                                        <form action={fillInLeadPage} className="mt-2">
                                                            <input type="hidden" name="leadId" value={lead.id} />
                                                            <input
                                                                type="hidden"
                                                                name="businessId"
                                                                value={lead.preview_business_id ?? ""}
                                                            />
                                                            <SubmitButton
                                                                pendingLabel="Reading their site…"
                                                                variant="outline"
                                                                size="sm"
                                                            >
                                                                Fill it in from their site
                                                            </SubmitButton>
                                                        </form>
                                                    </div>
                                                ) : (
                                                    <p className="mt-2 text-xs text-[#17233B]/55">
                                                        Enough on it to be indexed, and in the sitemap.
                                                    </p>
                                                )}

                                                {!preview.claimed_at && (
                                                    <form action={unpublishLeadPage} className="mt-3">
                                                        <input type="hidden" name="leadId" value={lead.id} />
                                                        <input
                                                            type="hidden"
                                                            name="businessId"
                                                            value={lead.preview_business_id ?? ""}
                                                        />
                                                        <SubmitButton
                                                            pendingLabel="Taking it down…"
                                                            variant="outline"
                                                            size="sm"
                                                        >
                                                            Take the page down
                                                        </SubmitButton>
                                                    </form>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <p className="mt-1 font-medium">Not published</p>
                                                <p className="mt-1 text-xs text-[#17233B]/55">
                                                    Publishing puts it in the directory and the sitemap, so they
                                                    can find it by searching their own name.
                                                </p>

                                                <form action={publishLeadPage} className="mt-3">
                                                    <input type="hidden" name="leadId" value={lead.id} />
                                                    <input
                                                        type="hidden"
                                                        name="businessId"
                                                        value={lead.preview_business_id ?? ""}
                                                    />
                                                    <SubmitButton pendingLabel="Publishing…" size="sm">
                                                        Publish the page
                                                    </SubmitButton>
                                                </form>
                                            </>
                                        )}
                                    </div>

                                    {(claimRequests ?? []).length > 0 && (
                                        <div className="border-t pt-4">
                                            <p className="text-xs uppercase tracking-wide text-[#FF593F]">
                                                Somebody says it is theirs
                                            </p>

                                            <ul className="mt-2 space-y-3">
                                                {(claimRequests ?? []).map((request) => (
                                                    <li key={request.id} className="rounded-lg bg-[#FF593F]/[0.04] p-3">
                                                        <p className="font-medium">{request.contact_name}</p>
                                                        <p className="break-all text-xs text-[#17233B]/70">
                                                            {request.contact_email}
                                                        </p>
                                                        <p className="mt-1 text-xs text-[#17233B]/70">
                                                            &ldquo;{request.connection}&rdquo; ·{" "}
                                                            <When value={request.created_at} />
                                                        </p>

                                                        <div className="mt-2 flex flex-wrap gap-2">
                                                            <form action={releasePageClaim}>
                                                                <input type="hidden" name="requestId" value={request.id} />
                                                                <input
                                                                    type="hidden"
                                                                    name="back"
                                                                    value={`/admin/sales/${lead.id}`}
                                                                />
                                                                <SubmitButton pendingLabel="Sending…" size="sm">
                                                                    Release the page
                                                                </SubmitButton>
                                                            </form>

                                                            <form action={declinePageClaim}>
                                                                <input type="hidden" name="requestId" value={request.id} />
                                                                <input
                                                                    type="hidden"
                                                                    name="back"
                                                                    value={`/admin/sales/${lead.id}`}
                                                                />
                                                                <SubmitButton
                                                                    pendingLabel="Declining…"
                                                                    variant="outline"
                                                                    size="sm"
                                                                >
                                                                    Decline
                                                                </SubmitButton>
                                                            </form>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>

                                            <p className="mt-2 text-xs text-[#17233B]/55">
                                                Releasing emails the claim link to the address above, and starts
                                                its own 90 days.
                                            </p>
                                        </div>
                                    )}

                                    {/* The examples, changeable without a
                                        rebuild: rebuilding mints a new token
                                        and dead-links the email already sent. */}
                                    {!preview.claimed_at && (
                                        <form
                                            action={saveLeadPreviewSamples}
                                            className="space-y-3 border-t pt-4"
                                        >
                                            <input type="hidden" name="leadId" value={lead.id} />
                                            <input
                                                type="hidden"
                                                name="businessId"
                                                value={lead.preview_business_id ?? ""}
                                            />

                                            <p className="text-xs uppercase tracking-wide text-[#17233B]/55">
                                                The examples on it
                                            </p>

                                            <div className="space-y-1.5">
                                                <Label htmlFor="sampleOffer">The offer</Label>
                                                <Input
                                                    id="sampleOffer"
                                                    name="sampleOffer"
                                                    defaultValue={preview.sample_offer ?? ""}
                                                    maxLength={80}
                                                    placeholder="Free side with any main, before 5pm"
                                                />
                                                <p className="text-xs leading-5 text-[#17233B]/55">
                                                    The offer card and the poster headline. They write
                                                    the real one when they claim the page, so this is
                                                    better showing the shape than guessing their menu.
                                                </p>
                                            </div>

                                            <div className="grid gap-3 sm:grid-cols-[1fr_6rem]">
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="sampleReward">The card gives</Label>
                                                    <Input
                                                        id="sampleReward"
                                                        name="sampleReward"
                                                        defaultValue={preview.sample_reward ?? ""}
                                                        maxLength={60}
                                                        placeholder="A free main"
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label htmlFor="sampleStamps">Stamps</Label>
                                                    <Input
                                                        id="sampleStamps"
                                                        name="sampleStamps"
                                                        type="number"
                                                        min={STAMPS_MIN}
                                                        max={STAMPS_MAX}
                                                        defaultValue={preview.sample_stamps ?? DEFAULT_STAMPS}
                                                    />
                                                </div>
                                            </div>

                                            <SubmitButton pendingLabel="Saving…" variant="outline" size="sm">
                                                Save the examples
                                            </SubmitButton>
                                        </form>
                                    )}

                                    {/* The RPC refuses a claimed preview, so this
                                        cannot take a live business with it. */}
                                    {!preview.claimed_at && (
                                        <form action={deleteLeadPreview} className="border-t pt-4">
                                            <input type="hidden" name="leadId" value={lead.id} />
                                            <input
                                                type="hidden"
                                                name="businessId"
                                                value={lead.preview_business_id ?? ""}
                                            />
                                            <SubmitButton pendingLabel="Deleting…" variant="outline" size="sm">
                                                Delete the preview
                                            </SubmitButton>
                                        </form>
                                    )}
                                </>
                            ) : missingForPreview.length > 0 ? (
                                <>
                                    <p className="text-[#17233B]/65">
                                        A page built for them is the whole argument, and it is built
                                        from what is written down here.
                                    </p>
                                    <p className="text-[#17233B]/65">
                                        Still needed: <strong>{missingForPreview.join(", ")}</strong>.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p className="text-[#17233B]/65">
                                        A page built for them is the whole argument. Build it
                                        when this one is worth writing to, not before.
                                    </p>

                                    <Button
                                        render={<Link href={`/admin/sales/${lead.id}/preview`} />}
                                        nativeButton={false}
                                        size="sm"
                                        className="mt-4"
                                    >
                                        Build the preview
                                    </Button>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Queueing, not sending. The draft is read in the
                        outbox and goes when somebody says so. */}
                    <Card className="border-[#17233B]/10">
                        <CardHeader>
                            <CardTitle className="text-base">Write to them</CardTitle>
                        </CardHeader>

                        <CardContent className="text-sm">
                            {!lead.can_email ? (
                                <p className="text-[#17233B]/65">
                                    Post only. A letter needs no consent, which is how this
                                    one is reached — check Companies House if that looks wrong.
                                </p>
                            ) : !lead.email || !lead.preview_business_id ? (
                                <p className="text-[#17233B]/65">
                                    {!lead.email
                                        ? "No address to write to yet."
                                        : "Build the preview first — the email is a link to it."}
                                </p>
                            ) : (
                                <>
                                    <p className="text-[#17233B]/65">
                                        Drafted from the preview and put in the outbox. You read
                                        it there, and it goes when you press send.
                                    </p>

                                    {/* Both of them, as they would go, before
                                        anything is queued — the personal line
                                        in place and the founding paragraph as
                                        it stands today. The signature is added
                                        on send, so it is named rather than
                                        printed: it is the same every time and
                                        would bury the words that are not. */}
                                    {drafts && (
                                        <div className="mt-4 space-y-3">
                                            {drafts.map((draft) => (
                                                <details
                                                    key={draft.kind}
                                                    className="rounded-lg border border-[#17233B]/10 bg-[#FFF8F0] p-3"
                                                >
                                                    <summary className="cursor-pointer text-xs font-medium">
                                                        Read the {draft.kind} email
                                                    </summary>

                                                    <p className="mt-3 text-xs font-semibold">{draft.subject}</p>
                                                    <p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-[#17233B]/80">
                                                        {draft.body}
                                                    </p>
                                                    <p className="mt-3 text-[11px] text-[#17233B]/55">
                                                        Your signature is added when it sends.
                                                    </p>
                                                </details>
                                            ))}
                                        </div>
                                    )}

                                    {/* One at a time, in order. Both of
                                        these used to sit here at equal
                                        weight on a lead nobody had ever
                                        written to, so a follow-up — "just
                                        checking you saw the preview I
                                        made" — could be the first thing a
                                        business ever heard from us. */}
                                    <div className="mt-4 space-y-3">
                                        {!firstSentAt ? (
                                            <form action={queueOutreach}>
                                                <input type="hidden" name="leadId" value={lead.id} />
                                                <input type="hidden" name="kind" value="first" />
                                                <SubmitButton pendingLabel="Queueing…" size="sm">
                                                    Queue the first email
                                                </SubmitButton>
                                            </form>
                                        ) : (
                                            <p className="text-xs text-[#17233B]/60">
                                                First email sent {whenSaid(firstSentAt)}.
                                            </p>
                                        )}

                                        {firstSentAt && !followUpSentAt && (
                                            <div className="space-y-2">
                                                <form action={queueOutreach}>
                                                    <input type="hidden" name="leadId" value={lead.id} />
                                                    <input type="hidden" name="kind" value="follow_up" />
                                                    <SubmitButton
                                                        pendingLabel="Queueing…"
                                                        size="sm"
                                                        variant={followUpDue(firstSentAt) ? "default" : "outline"}
                                                    >
                                                        Queue a follow-up
                                                    </SubmitButton>
                                                </form>

                                                <p className="text-xs text-[#17233B]/60">
                                                    {followUpDue(firstSentAt)
                                                        ? "Due now — four days with no reply."
                                                        : `Worth leaving until ${dueDate(firstSentAt, 4)}, four days after the first.`}
                                                </p>
                                            </div>
                                        )}

                                        {followUpSentAt && (
                                            <p className="text-xs text-[#17233B]/60">
                                                Followed up {whenSaid(followUpSentAt)}.{" "}
                                                {letterDue(followUpSentAt)
                                                    ? "A letter is the next thing."
                                                    : `A letter is worth it from ${dueDate(followUpSentAt, 14)}.`}
                                            </p>
                                        )}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Instagram, which needs no consent either and is
                        where a shop that never answers email often lives.
                        Copied and pasted by hand: there is no API for a
                        cold DM, and there should not be. */}
                    {dmHandle && dms && (
                        <Card className="border-[#17233B]/10">
                            <CardHeader>
                                <CardTitle className="text-base">Send a DM</CardTitle>
                            </CardHeader>

                            <CardContent className="space-y-4 text-sm">
                                <p className="leading-6 text-[#17233B]/65">
                                    To <strong>@{dmHandle}</strong>. Copy one, open the DM and
                                    paste — nothing is sent from here.
                                </p>

                                {dms.map((option) => (
                                    <div key={option.key} className="space-y-2">
                                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#17233B]/55">
                                            {option.label}
                                        </p>

                                        <p className="whitespace-pre-wrap rounded-lg border border-[#17233B]/10 bg-[#FFF8F0] p-3 text-xs leading-6">
                                            {option.body}
                                        </p>

                                        <CopyButton text={option.body} label="Copy this one" />
                                    </div>
                                ))}

                                <div className="flex flex-wrap items-center gap-4 border-t border-[#17233B]/10 pt-3">
                                    <a
                                        href={instagramDmUrl(dmHandle)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 text-xs font-medium text-[#FF593F] hover:underline"
                                    >
                                        Open the DM
                                        <FiExternalLink aria-hidden="true" className="size-3" />
                                    </a>

                                    {/* Pressed by the person who just sent
                                        it, because nothing else can know.
                                        Without it the lead sat here looking
                                        untouched and the board would call
                                        for a letter a fortnight later. */}
                                    {dmSentAt ? (
                                        <span className="text-xs text-[#17233B]/60">
                                            Sent {whenSaid(dmSentAt)}.
                                        </span>
                                    ) : (
                                        <form action={recordDm}>
                                            <input type="hidden" name="leadId" value={lead.id} />
                                            <SubmitButton
                                                pendingLabel="Noting…"
                                                variant="outline"
                                                size="sm"
                                            >
                                                I&rsquo;ve sent it
                                            </SubmitButton>
                                        </form>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Paper, after the email went quiet — and the only
                        way to reach a sole trader at all, since a letter
                        needs no consent. */}
                    <Card className="border-[#17233B]/10">
                        <CardHeader>
                            <CardTitle className="text-base">Send a letter</CardTitle>
                        </CardHeader>

                        <CardContent>
                            {!lettersConfigured() ? (
                                <p className="text-sm leading-6 text-[#17233B]/65">
                                    No Stannp key set, so nothing can be posted. Add{" "}
                                    <code className="text-xs">{STANNP_KEY}</code> and this comes back.
                                </p>
                            ) : !lead.preview_business_id ? (
                                <p className="text-sm leading-6 text-[#17233B]/65">
                                    Build the preview first — the letter is a way to it.
                                </p>
                            ) : (
                                <LetterCard
                                    leadId={lead.id}
                                    destination={letterTo ? letterDestination(letterTo) : null}
                                    cost={LETTER_COST}
                                />
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-[#17233B]/10">
                        <CardHeader>
                            <CardTitle className="text-base">Notes</CardTitle>
                        </CardHeader>

                        <CardContent>
                            <SavingForm action={saveLeadNotes} className="space-y-3">
                                <input type="hidden" name="leadId" value={lead.id} />
                                <textarea
                                    name="notes"
                                    defaultValue={lead.notes ?? ""}
                                    rows={4}
                                    className="w-full rounded-lg border border-input bg-background p-3 text-sm"
                                    placeholder="Anything worth remembering before writing."
                                />
                                <SubmitButton pendingLabel="Saving…" size="sm" variant="outline">
                                    Save notes
                                </SubmitButton>
                            </SavingForm>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="border-[#17233B]/10">
                        <CardHeader>
                            <CardTitle className="text-base">Move it on</CardTitle>
                        </CardHeader>

                        <CardContent>
                            <form action={moveLead} className="space-y-3">
                                <input type="hidden" name="leadId" value={lead.id} />

                                {/* Keyed on the stage it is showing.
                                    Without the key this is an uncontrolled
                                    select, and React keeps whatever is in
                                    the DOM across a re-render — so after
                                    the crawler or Companies House moved
                                    the lead on, the badges said one stage
                                    and this still said the one before it.
                                    Pressing Move then quietly dragged the
                                    lead backwards. */}
                                <NativeSelect
                                    key={lead.stage}
                                    name="stage"
                                    defaultValue={lead.stage}
                                >
                                    {STAGES.map((stage) => (
                                        <option key={stage.key} value={stage.key}>
                                            {stage.label}
                                        </option>
                                    ))}
                                </NativeSelect>

                                <SubmitButton pendingLabel="Moving…" size="sm" className="w-full">
                                    Move
                                </SubmitButton>

                                {!lead.can_email && (
                                    <p className="text-xs leading-5 text-[#17233B]/60">
                                        Emailed and Followed up are refused while this is post
                                        only. Check Companies House first.
                                    </p>
                                )}
                            </form>
                        </CardContent>
                    </Card>

                    <Card className="border-[#17233B]/10">
                        <CardHeader>
                            <CardTitle className="text-base">What has happened</CardTitle>
                        </CardHeader>

                        <CardContent className="space-y-3 text-sm">
                            {(events ?? []).length === 0 ? (
                                <p className="text-[#17233B]/60">Nothing yet.</p>
                            ) : (
                                (events ?? []).map((event) => (
                                    <div key={event.id} className="border-b pb-3 last:border-0 last:pb-0">
                                        {/* A note has no heading: its detail is
                                            the whole of it, and "note" above
                                            the words was a label for the
                                            column rather than for what
                                            happened. */}
                                        {eventLabel(event.kind) && (
                                            <p className="font-medium">{eventLabel(event.kind)}</p>
                                        )}
                                        {event.detail && (
                                            <p
                                                className={
                                                    eventLabel(event.kind)
                                                        ? "mt-0.5 text-xs leading-5 text-[#17233B]/65"
                                                        : "font-medium"
                                                }
                                            >
                                                {event.detail}
                                            </p>
                                        )}
                                        <p className="mt-0.5 text-xs text-[#17233B]/50">
                                            <When value={event.created_at} />
                                        </p>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* For one added twice, or added by mistake. Hidden
                        behind a disclosure because lead_events and
                        outreach_messages both cascade: this is not an
                        undo. A lead we have written to cannot be deleted
                        at all — that record is the reason we would not
                        write again — and the action refuses it too. */}
                    <Card className="border-[#17233B]/10">
                        <CardHeader>
                            <CardTitle className="text-base">Remove it</CardTitle>
                        </CardHeader>

                        <CardContent className="text-sm">
                            {(writtenTo ?? 0) > 0 ? (
                                <p className="leading-6 text-[#17233B]/65">
                                    We have written to this lead, so it stays. That record is why we
                                    would not write again. Move it to <strong>Not interested</strong> or{" "}
                                    <strong>Closed</strong> to take it off the list.
                                </p>
                            ) : lead.preview_business_id ? (
                                <p className="leading-6 text-[#17233B]/65">
                                    A preview was built from this lead, and that business has a page of
                                    its own. Close the business first, or move this to{" "}
                                    <strong>Closed</strong>.
                                </p>
                            ) : (
                                confirming ? (
                                    <div>
                                        <p className="leading-6 text-[#17233B]/65">
                                            <strong>{lead.name}</strong> and everything written down
                                            about it goes, and it cannot be undone.
                                        </p>

                                        <div className="mt-4 flex items-center gap-3">
                                            <form action={deleteLead}>
                                                <input type="hidden" name="leadId" value={lead.id} />
                                                <SubmitButton
                                                    pendingLabel="Deleting…"
                                                    variant="outline"
                                                    size="sm"
                                                >
                                                    Yes, delete it
                                                </SubmitButton>
                                            </form>

                                            <Button
                                                render={<Link href={`/admin/sales/${lead.id}`} />}
                                                nativeButton={false}
                                                variant="ghost"
                                                size="sm"
                                            >
                                                Keep it
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <Button
                                        render={<Link href={`/admin/sales/${lead.id}?confirm=delete`} />}
                                        nativeButton={false}
                                        variant="ghost"
                                        size="sm"
                                        className="px-0 text-[#FF593F]"
                                    >
                                        Delete this lead
                                    </Button>
                                )
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default function LeadPage(props: PageProps) {
    return (
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <Lead {...props} />
        </Suspense>
    );
}
