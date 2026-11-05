import { emailCompanyFooter, emailLogoRow, escapeHtml, sendEmails, type Email } from "@/lib/email";
import { companyDisclosure } from "@/lib/legal";
import { absoluteUrl } from "@/lib/site";
import { releaseClaims } from "@/lib/email-claims";
import { createAdminClient } from "@/utils/supabase/admin";

type OfferForEmail = {
    title: string;
    slug: string;
    discount: string;
    description: string;
    expires_at: string | null;
    businesses: { name: string } | null;
};

function expiryLabel(expiresAt: string | null) {
    if (!expiresAt) return null;
    return new Date(`${expiresAt.slice(0, 10)}T00:00:00`).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
    });
}

export function newOfferEmail(offer: OfferForEmail, to: string, unsubscribeToken: string): Email {
    const business = offer.businesses?.name ?? "A business you follow";
    const offerUrl = absoluteUrl(`/offers/${offer.slug}`);
    const unsubscribeUrl = absoluteUrl(`/unsubscribe/${unsubscribeToken}`);
    const oneClickUrl = absoluteUrl(`/api/unsubscribe/${unsubscribeToken}`);
    const settingsUrl = absoluteUrl("/account/notifications");
    const until = expiryLabel(offer.expires_at);
    const e = escapeHtml;

    const html = `<!doctype html>
<html><body style="margin:0;background:#FFF8F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#17233B">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF8F0;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #e8e2da">
${emailLogoRow()}
<tr><td style="padding:20px 28px 8px">
<p style="margin:0;font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#FF593F">New from ${e(business)}</p>
<h1 style="margin:12px 0 0;font-size:24px;line-height:1.25">${e(offer.title)}</h1>
<p style="margin:12px 0 0;display:inline-block;background:#FFF0EC;color:#C2341F;font-weight:700;font-size:15px;padding:6px 12px;border-radius:999px">${e(offer.discount)}</p>
<p style="margin:16px 0 0;font-size:15px;line-height:1.6;color:#45506a">${e(offer.description)}</p>
${until ? `<p style="margin:12px 0 0;font-size:13px;color:#6b7387">Available until ${e(until)}.</p>` : ""}
</td></tr>
<tr><td style="padding:20px 28px 28px">
<a href="${offerUrl}" style="display:inline-block;background:#FF593F;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px">Claim this offer</a>
</td></tr>
</table>
<p style="max-width:520px;margin:20px auto 0;font-size:12px;line-height:1.6;color:#6b7387">
You're getting this because you follow ${e(business)} on Promotello.<br>
<a href="${unsubscribeUrl}" style="color:#6b7387">Unsubscribe from ${e(business)}</a> · <a href="${settingsUrl}" style="color:#6b7387">Email settings</a>
</p>
${emailCompanyFooter()}
</td></tr></table>
</body></html>`;

    const text = [
        `New from ${business}: ${offer.title}`,
        offer.discount,
        "",
        offer.description,
        until ? `Available until ${until}.` : "",
        "",
        `Claim it: ${offerUrl}`,
        "",
        `You're getting this because you follow ${business} on Promotello.`,
        `Unsubscribe: ${unsubscribeUrl}`,
        "",
        companyDisclosure(),
    ]
        .filter((line, index, lines) => line !== "" || lines[index - 1] !== "")
        .join("\n");

    return {
        to,
        subject: `${offer.discount}: ${offer.title}`,
        senderName: offer.businesses?.name,
        html,
        text,
        headers: {
            "List-Unsubscribe": `<${oneClickUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
    };
}

// Emails a newly approved offer to the business's followers. Each follower
// is emailed at most once per offer. Call only after checking the caller may
// approve offers.
export async function emailFollowersAboutOffer(offerId: string) {
    const admin = createAdminClient();

    const { data: recipients, error } = await admin.rpc("claim_new_offer_email_recipients", {
        requested_offer_id: offerId,
    });

    if (error) {
        console.error("New offer email: failed to load followers", error);
        return { sent: 0, failed: 0, skipped: 0 };
    }

    const rows = (recipients ?? []) as { user_id: string; email: string; unsubscribe_token: string }[];

    if (rows.length === 0) {
        return { sent: 0, failed: 0, skipped: 0 };
    }

    const { data: offer } = await admin
        .from("offers")
        .select("title, slug, discount, description, expires_at, businesses ( name )")
        .eq("id", offerId)
        .single<OfferForEmail>();

    if (!offer) {
        return { sent: 0, failed: 0, skipped: 0 };
    }

    const result = await sendEmails(rows.map((row) => newOfferEmail(offer, row.email, row.unsubscribe_token)));

    if (result.failedTo.length > 0) {
        const lost = new Set(result.failedTo);
        const ids = rows.filter((row) => lost.has(row.email)).map((row) => row.user_id);

        await releaseClaims("New offer email", () =>
            admin.from("offer_email_sends").delete().eq("offer_id", offerId).in("user_id", ids),
        );
    }

    return result;
}

// Every other scheduled email has a next run to pick a released claim back
// up; this one didn't. An announcement is sent once, when the offer is
// approved, so a batch Resend rejects — over the daily cap, say — released
// its claims into nothing and the offer was never announced at all.
//
// This is that next run. The claim function only returns followers who
// haven't been claimed for this offer, so nobody is told twice, and it
// checks the offer is still live and the business still on a paid plan
// before sending.
//
// One thing it changes: someone who follows a business within the window
// gets an offer announced a day or two before they followed. That is a
// live offer from a business they have just chosen to follow, and the
// window keeps it recent.
const RETRY_DAYS = 2;

export async function retryOfferAnnouncements({ onlyOffer, limit = 20 }: { onlyOffer?: string; limit?: number } = {}) {
    const admin = createAdminClient();
    const since = new Date(Date.now() - RETRY_DAYS * 86_400_000).toISOString();
    const today = new Date().toISOString().slice(0, 10);

    // `onlyOffer` is for tests, so a run can't reach a real follower.
    const query = admin
        .from("offers")
        .select("id, business_id")
        .eq("approval_status", "approved")
        .is("plan_paused_at", null)
        .gte("expires_at", today)
        .gte("updated_at", since)
        .limit(limit);

    const { data: offers, error } = await (onlyOffer ? query.eq("id", onlyOffer) : query);

    if (error) {
        console.error("Offer announcements: failed to look for unsent ones", error);
        return { offers: 0, sent: 0 };
    }

    let announced = 0;
    let sent = 0;

    for (const offer of offers ?? []) {
        const [followers, emailed] = await Promise.all([
            admin
                .from("business_followers")
                .select("user_id", { count: "exact", head: true })
                .eq("business_id", offer.business_id)
                .eq("emails_enabled", true),
            admin
                .from("offer_email_sends")
                .select("user_id", { count: "exact", head: true })
                .eq("offer_id", offer.id),
        ]);

        // Everyone who could be told has been: the usual case, and cheap.
        if ((followers.count ?? 0) <= (emailed.count ?? 0)) {
            continue;
        }

        const result = await emailFollowersAboutOffer(offer.id);

        // Counted as picked up whether or not anything left the building:
        // an address can be skipped (a test address, a suppression) and the
        // offer has still had its second run.
        announced += 1;
        sent += result.sent;

        console.warn(
            `Offer announcements: ${offer.id} had ${(followers.count ?? 0) - (emailed.count ?? 0)} follower(s) an earlier run missed, sent ${result.sent}`,
        );
    }

    return { offers: announced, sent };
}
