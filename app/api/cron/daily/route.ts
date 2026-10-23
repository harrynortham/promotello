import { runAutomations } from "@/lib/automations";
import { sendMonthlyReports } from "@/lib/monthly-report";

// Daily job (see vercel.json). Vercel sends CRON_SECRET as a bearer token.
export async function GET(request: Request) {
    const secret = process.env.CRON_SECRET;

    if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
        return new Response("Unauthorized", { status: 401 });
    }

    const automations = await runAutomations();

    // Monthly value reports go out on the 1st (UK date).
    const ukDay = Number(new Intl.DateTimeFormat("en-GB", { day: "numeric", timeZone: "Europe/London" }).format(new Date()));
    const reports = ukDay === 1 ? await sendMonthlyReports() : null;

    return Response.json({ automations, reports });
}
