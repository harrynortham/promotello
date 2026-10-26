import { runAutomations } from "@/lib/automations";
import { sendLifecycleEmails } from "@/lib/business-lifecycle";
import { submitRecentPosts } from "@/lib/indexnow";
import { sendMonthlyReports } from "@/lib/monthly-report";
import { createAdminClient } from "@/utils/supabase/admin";

// Daily job (see vercel.json). Vercel sends CRON_SECRET as a bearer token.
export async function GET(request: Request) {
    const secret = process.env.CRON_SECRET;

    if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
        return new Response("Unauthorized", { status: 401 });
    }

    const automations = await runAutomations();
    const lifecycle = await sendLifecycleEmails();
    const { data: expiredPreviews } = await createAdminClient().rpc("delete_expired_business_previews");
    const indexNow = await submitRecentPosts().catch(() => ({ submitted: 0 }));

    // Monthly value reports go out on the 1st (UK date).
    const ukDay = Number(new Intl.DateTimeFormat("en-GB", { day: "numeric", timeZone: "Europe/London" }).format(new Date()));
    const reports = ukDay === 1 ? await sendMonthlyReports() : null;

    return Response.json({ automations, lifecycle, expiredPreviews, indexNow, reports });
}
