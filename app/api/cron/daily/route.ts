import { runAutomations } from "@/lib/automations";
import { sendBusinessSignupReminders, sendLifecycleEmails } from "@/lib/business-lifecycle";
import { sendDailySummaries } from "@/lib/business-notifications";
import {
    flagPostersPointingNowhere,
    remindAboutExpiringOffers,
    remindAboutExpiringVouchers,
    tellUsWhatIsWaiting,
} from "@/lib/daily-notices";
import { submitRecentPosts } from "@/lib/indexnow";
import { sendMonthlyReports } from "@/lib/monthly-report";
import { retryOfferAnnouncements } from "@/lib/new-offer-email";
import { createAdminClient } from "@/utils/supabase/admin";
import { deleteOldNotifications } from "@/lib/notify";

// Daily job (see vercel.json). Vercel sends CRON_SECRET as a bearer token.
export async function GET(request: Request) {
    const secret = process.env.CRON_SECRET;

    if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
        return new Response("Unauthorized", { status: 401 });
    }

    const automations = await runAutomations();
    const lifecycle = await sendLifecycleEmails();
    // Logged, not thrown, so one failing job doesn't stop the rest.
    const signupReminders = await sendBusinessSignupReminders().catch((error) => {
        console.error("Daily job: business sign-up reminders failed", error);
        return null;
    });
    const dailySummaries = await sendDailySummaries();
    // After the day's own sends: if a quota was what stopped an
    // announcement, today's quota shouldn't go on it before today's email.
    const announcements = await retryOfferAnnouncements().catch((error) => {
        console.error("Daily job: offer announcement retry failed", error);
        return null;
    });
    // The things nobody does, that happen anyway: an offer running
    // out, a voucher expiring in a pocket, a poster advertising last
    // month. Each one is logged rather than thrown, for the same reason
    // as the rest — one quiet failure must not take the job with it.
    const expiringOffers = await remindAboutExpiringOffers().catch((error) => {
        console.error("Daily job: expiring offer notices failed", error);
        return null;
    });
    const expiringVouchers = await remindAboutExpiringVouchers().catch((error) => {
        console.error("Daily job: expiring voucher notices failed", error);
        return null;
    });
    const stalePosters = await flagPostersPointingNowhere().catch((error) => {
        console.error("Daily job: poster notices failed", error);
        return null;
    });
    const ourQueues = await tellUsWhatIsWaiting().catch((error) => {
        console.error("Daily job: the admin queue notice failed", error);
        return null;
    });

    const { data: expiredPreviews } = await createAdminClient().rpc("delete_expired_business_previews");
    const oldNotifications = await deleteOldNotifications();
    const indexNow = await submitRecentPosts().catch(() => ({ submitted: 0 }));

    // Monthly value reports go out on the 1st (UK date).
    const ukDay = Number(new Intl.DateTimeFormat("en-GB", { day: "numeric", timeZone: "Europe/London" }).format(new Date()));
    const reports = ukDay === 1 ? await sendMonthlyReports() : null;

    return Response.json({
        automations,
        lifecycle,
        signupReminders,
        dailySummaries,
        announcements,
        expiringOffers,
        expiringVouchers,
        stalePosters,
        ourQueues,
        expiredPreviews,
        oldNotifications,
        indexNow,
        reports,
    });
}
