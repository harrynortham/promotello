import { escapeHtml, sendEmails, type Email } from "@/lib/email";
import { absoluteUrl } from "@/lib/site";
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
<tr><td style="padding:28px 28px 8px">
<p style="margin:0;font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#C8371D">New from ${e(business)}</p>
<h1 style="margin:12px 0 0;font-size:24px;line-height:1.25">${e(offer.title)}</h1>
<p style="margin:12px 0 0;display:inline-block;background:#FFF0EC;color:#C2341F;font-weight:700;font-size:15px;padding:6px 12px;border-radius:999px">${e(offer.discount)}</p>
<p style="margin:16px 0 0;font-size:15px;line-height:1.6;color:#45506a">${e(offer.description)}</p>
${until ? `<p style="margin:12px 0 0;font-size:13px;color:#6b7387">Available until ${e(until)}.</p>` : ""}
</td></tr>
<tr><td style="padding:20px 28px 28px">
<a href="${offerUrl}" style="display:inline-block;background:#C8371D;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px">Claim this offer</a>
</td></tr>
</table>
<p style="max-width:520px;margin:20px auto 0;font-size:12px;line-height:1.6;color:#6b7387">
You're getting this because you follow ${e(business)} on Promotello.<br>
<a href="${unsubscribeUrl}" style="color:#6b7387">Unsubscribe from ${e(business)}</a> · <a href="${settingsUrl}" style="color:#6b7387">Email settings</a>
</p>
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

    return sendEmails(rows.map((row) => newOfferEmail(offer, row.email, row.unsubscribe_token)));
}
