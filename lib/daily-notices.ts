import {
    adminQueue,
    offerExpiring,
    posterPointingNowhere,
    voucherExpiring,
} from "@/lib/notifications";
import { notifyBusinessManagers, notifyPlatformAdmins, notifyUsers } from "@/lib/notify";
import { qrTarget, todayInUk } from "@/lib/qr-target";
import { createAdminClient } from "@/utils/supabase/admin";

// The things nobody does, that happen anyway: an offer running out, a
// voucher expiring in somebody's pocket, a poster in a window
// advertising something that finished last month, and four queues of
// ours that only ever spoke when somebody went looking.
//
// All four run in the daily job (app/api/cron/daily/route.ts) and lean
// on the notification dedupe key rather than a table of their own: an
// offer is announced as expiring once, whatever day the job runs.

// Far enough ahead to do something about it, close enough to be worth
// saying. Three days means a Friday offer is flagged on a Tuesday.
const EXPIRES_IN_DAYS = 3;

function inDays(days: number) {
    const date = new Date(`${todayInUk()}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);

    return date.toISOString().slice(0, 10);
}

// How many days from today, for the wording.
export function daysUntil(expiresAt: string, today = todayInUk()) {
    const end = new Date(`${expiresAt}T00:00:00Z`).getTime();
    const start = new Date(`${today}T00:00:00Z`).getTime();

    return Math.round((end - start) / 86_400_000);
}

// An offer on its way out, while there is still time to extend it.
export async function remindAboutExpiringOffers() {
    const admin = createAdminClient();

    const { data: offers, error } = await admin
        .from("offers")
        .select("id, title, business_id, expires_at")
        .eq("approval_status", "approved")
        .is("plan_paused_at", null)
        .gte("expires_at", todayInUk())
        .lte("expires_at", inDays(EXPIRES_IN_DAYS))
        .not("business_id", "is", null);

    if (error) {
        console.error("Daily notices: could not read expiring offers", error);
        return { told: 0 };
    }

    let told = 0;

    for (const offer of offers ?? []) {
        const { sent } = await notifyBusinessManagers(
            offer.business_id as string,
            offerExpiring({
                id: offer.id,
                title: offer.title,
                businessId: offer.business_id as string,
                days: daysUntil(offer.expires_at),
            }),
        );

        told += sent;
    }

    return { told };
}

// A voucher somebody claimed and has not used, on the last day it is
// worth walking there for.
export async function remindAboutExpiringVouchers() {
    const admin = createAdminClient();

    const { data: vouchers, error } = await admin
        .from("offer_redemptions")
        .select("id, user_id, offers!inner ( title, slug, expires_at, businesses!inner ( name, closed_at ) )")
        .is("used_at", null)
        .not("user_id", "is", null)
        .eq("offers.expires_at", inDays(1));

    if (error) {
        console.error("Daily notices: could not read expiring vouchers", error);
        return { told: 0 };
    }

    let told = 0;

    for (const voucher of vouchers ?? []) {
        const offer = voucher.offers as unknown as {
            title: string;
            slug: string;
            businesses: { name: string; closed_at: string | null };
        };

        // A business that has gone is a separate message, already sent.
        if (offer.businesses.closed_at) continue;

        const { sent } = await notifyUsers(
            [voucher.user_id as string],
            voucherExpiring({
                id: voucher.id,
                offerTitle: offer.title,
                offerSlug: offer.slug,
                businessName: offer.businesses.name,
            }),
        );

        told += sent;
    }

    return { told };
}

// A sheet still in a window, pointing at something that has ended. The
// scan itself never fails — record_qr_scan falls back to the business
// page — so this is the only way anybody finds out.
export async function flagPostersPointingNowhere() {
    const admin = createAdminClient();

    const { data: codes, error } = await admin
        .from("qr_codes")
        .select(
            "id, label, business_id, archived_at, former_target, offers ( title, approval_status, expires_at, plan_paused_at ), loyalty_programs ( name, is_active, closed_at )",
        )
        .is("archived_at", null)
        .not("poster_printed_at", "is", null);

    if (error) {
        console.error("Daily notices: could not read the posters", error);
        return { told: 0 };
    }

    let told = 0;

    const today = todayInUk();
    const one = <T,>(value: T | T[] | null) => (Array.isArray(value) ? (value[0] ?? null) : value);

    for (const code of codes ?? []) {
        const target = qrTarget(
            {
                archived_at: code.archived_at,
                former_target: code.former_target,
                offers: one(code.offers),
                loyalty_programs: one(code.loyalty_programs),
            },
            today,
        );

        // Live, or a plain business poster that cannot go stale.
        if (target.live || !target.problem) continue;

        const { sent } = await notifyBusinessManagers(
            code.business_id as string,
            posterPointingNowhere({
                id: code.id,
                label: code.label,
                businessId: code.business_id as string,
                problem: target.problem,
            }),
        );

        told += sent;
    }

    return { told };
}

// Ours: one line a day, only when something is in a queue.
export async function tellUsWhatIsWaiting() {
    const admin = createAdminClient();
    const today = todayInUk();


    const [businesses, offers, edits, categories] = await Promise.all([
        admin
            .from("businesses")
            .select("id", { count: "exact", head: true })
            .eq("approval_status", "pending")
            .not("review_requested_at", "is", null)
            .is("closed_at", null),
        admin.from("offers").select("id", { count: "exact", head: true }).eq("approval_status", "pending"),
        admin.from("business_edits").select("id", { count: "exact", head: true }).is("reviewed_at", null),
        admin
            .from("businesses")
            .select("id", { count: "exact", head: true })
            .is("category_id", null)
            .is("closed_at", null)
            .is("demo_at", null)
            .eq("is_sample", false),
    ]);

    const waiting = {
        day: today,
        businesses: businesses.count ?? 0,
        offers: offers.count ?? 0,
        edits: edits.count ?? 0,
        categories: categories.count ?? 0,
    };

    if (waiting.businesses + waiting.offers + waiting.edits + waiting.categories === 0) {
        return { told: 0 };
    }

    const { sent } = await notifyPlatformAdmins(adminQueue(waiting));

    return { told: sent };
}
