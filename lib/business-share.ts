import { rewardWording } from "@/lib/loyalty-design";
import { shareImage, type ShareImageFormat } from "@/lib/story-image";
import { createPublicClient } from "@/utils/supabase/public";

type SharedBusiness = {
    name: string;
    cover_image_url: string | null;
    logo_url: string | null;
    loyalty_programs: {
        stamps_required: number;
        reward: string;
        is_active: boolean;
        closed_at: string | null;
    }[] | null;
};

// A share image for a business's page. When the business runs a loyalty
// card it leads with that, because a card is a reason to come back rather
// than something that expires; otherwise it invites people to the page.
// Returns a 404 for a business customers can't see yet.
export async function businessShareImage(slug: string, format: ShareImageFormat) {
    const { data: business } = await createPublicClient()
        .from("businesses")
        .select("name, cover_image_url, logo_url, loyalty_programs ( stamps_required, reward, is_active, closed_at )")
        .eq("slug", slug)
        .eq("approval_status", "approved")
        .maybeSingle<SharedBusiness>();

    if (!business) {
        return new Response("Not found", { status: 404 });
    }

    // The one being handed out, not one people are finishing.
    const card = (business.loyalty_programs ?? []).find(
        (programme) => programme.is_active && !programme.closed_at,
    );

    return shareImage(
        {
            eyebrow: card ? "Loyalty card" : "On Promotello",
            headline: card
                ? `Collect ${card.stamps_required} stamps for ${rewardWording(card.reward)}`
                : `Find ${business.name} on Promotello`,
            badge: card ? "Free to join" : undefined,
            detail: card ? "Join by scanning in store, then show your card when you pay." : undefined,
            business: business.name,
            url: `promotello.com/businesses/${slug}`,
            imageUrl: business.cover_image_url ?? business.logo_url,
        },
        format,
    );
}
