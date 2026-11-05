import { connection } from "next/server";
import sharp from "sharp";

import { qrLink, qrSvg } from "@/lib/qr";
import { siteUrl } from "@/lib/site";
import { createClient } from "@/utils/supabase/server";

// The code on its own, to put on a menu, a leaflet, a sticker or whatever
// else the business prints — the poster is one way to use a code, not the
// only one.
//
// This hands back a code that already exists. Making them is what the Free
// plan limits (one active code, enforced by a trigger on the table), and
// nothing here creates one.

// Big enough to print at any sensible size without going soft.
const PNG_SIZE = 1024;

function fileName(label: string, extension: string) {
    const slug = label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    return `promotello-qr-${slug || "code"}.${extension}`;
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ businessId: string; codeId: string }> },
) {
    // The answer depends on who is asking, so it is never a cached one.
    await connection();

    const { businessId, codeId } = await params;
    const wantsSvg = new URL(request.url).searchParams.get("format") === "svg";

    // Read as the person asking: RLS only shows a code to its own business's
    // team, so someone else's code is simply not found.
    const supabase = await createClient();
    const { data: code } = await supabase
        .from("qr_codes")
        .select("code, label")
        .eq("id", codeId)
        .eq("business_id", businessId)
        .is("archived_at", null)
        .maybeSingle();

    if (!code) {
        return new Response("Not found", { status: 404 });
    }

    const svg = await qrSvg(qrLink(siteUrl, code.code), "#17233B", 4);

    const body = wantsSvg
        ? Buffer.from(svg)
        : await sharp(Buffer.from(svg)).resize(PNG_SIZE, PNG_SIZE).png().toBuffer();

    return new Response(new Uint8Array(body), {
        headers: {
            "Content-Type": wantsSvg ? "image/svg+xml" : "image/png",
            "Content-Disposition": `attachment; filename="${fileName(code.label, wantsSvg ? "svg" : "png")}"`,
            // A business's own code, and it changes if they rename it.
            "Cache-Control": "private, no-store",
        },
    });
}
