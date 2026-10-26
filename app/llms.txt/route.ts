import { FOUNDING_MEMBER_LIMIT, FREE_LIVE_OFFER_LIMIT, TRIAL_DAYS, plans } from "@/lib/billing";
import { getPosts } from "@/lib/blog";
import { absoluteUrl } from "@/lib/site";

// A plain-text guide to Promotello for AI assistants and LLM-powered search
// (the llms.txt convention): what it is, who it's for, and the pages and
// guides worth reading, with Markdown versions of the blog posts.

export async function GET() {
    const posts = await getPosts();
    const link = (title: string, path: string, note: string) => `- [${title}](${absoluteUrl(path)}): ${note}`;

    const text = `# Promotello

> Promotello is a loyalty card, offers and QR poster platform for independent businesses in the UK, starting in Bristol. Businesses use it to turn first-time visitors into regulars: customers keep a digital stamp card on their phone (no app to download), claim offers, and follow businesses for new-offer emails. Customers find businesses in a local directory.

Promotello is for independent cafés, bakeries, restaurants, pubs, barbers, hair and beauty salons, gyms and studios, and independent shops. Staff stamp loyalty cards and redeem vouchers by scanning a QR code with their phone camera, so there's no card reader or till integration.

## Plans

- Free: a business page, ${FREE_LIVE_OFFER_LIMIT} live offer and a QR poster, with no time limit.
- Pro: ${plans.pro_monthly.price} a month (${plans.pro_yearly.price} a year): unlimited offers, a digital loyalty card, QR posters with scan counts, followers and new-offer emails, Google review prompts, staff scanning, team accounts. The first ${FOUNDING_MEMBER_LIMIT} businesses pay ${plans.pro_founding_monthly.price} a month, locked for life.
- Growth: ${plans.growth_monthly.price} a month: everything in Pro plus automated welcome, birthday and win-back offers, quiet-hours offers and a monthly report.
- Paid plans start with a ${TRIAL_DAYS}-day free trial. Prices are in GBP; Promotello isn't VAT registered.

## For businesses

${[
        link("How it works", "/business/how-it-works", "how loyalty cards, offers and QR posters work day to day"),
        link("Features", "/business/features", "everything included"),
        link("Pricing", "/business/pricing", "plans, the free trial and founding-member pricing"),
        link("FAQs", "/business/faq", "common questions from business owners"),
        link("Getting started", "/business/getting-started", "setting up in about 15 minutes"),
        link("Demo", "/business/demo", "a sample business dashboard"),
    ].join("\n")}

## Guides for business owners

${posts.map((post) => link(post.title, `/blog/md/${post.slug}`, post.summary)).join("\n") || "- Coming soon."}

## For customers

${[
        link("Offers in Bristol", "/offers/bristol", "live offers from independent businesses"),
        link("Explore Bristol", "/explore/bristol", "businesses and offers by neighbourhood"),
    ].join("\n")}

## Optional

${[
        link("About Promotello", "/business/about", "who runs it and why"),
        link("Privacy policy", "/legal/privacy", "how personal information is handled"),
        link("Contact", "/business/contact", "questions from businesses"),
    ].join("\n")}
`;

    return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
