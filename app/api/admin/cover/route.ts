import { NextResponse } from "next/server";

import { coverImage, dominantColourFromBytes } from "@/lib/cover-image";
import { isHex } from "@/lib/cover-colours";
import { iconName } from "@/lib/cover-icons";
import { createClient } from "@/utils/supabase/server";

// Draws a cover and hands it back as a PNG. Nothing is stored: the page
// shows what comes back, and saving it is an ordinary upload to the
// same place a photo goes.
//
// A POST rather than a GET with the details in the query, because the
// logo is a file the admin has only just chosen — the business does not
// exist yet when a preview is being built, so there is no logo URL to
// fetch and the bytes have to come up with the request.
export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: isAdmin } = await supabase.rpc("is_platform_admin");

    if (!isAdmin) {
        return NextResponse.json({ error: "Not allowed." }, { status: 403 });
    }

    const form = await request.formData();
    const categoryId = String(form.get("categoryId") ?? "").trim();
    // Whichever of lucide's the admin picked. Checked against the
    // library rather than trusted, since it ends up naming a component
    // to render.
    const icon = iconName(form.get("icon"));
    const variation = Number.parseInt(String(form.get("variation") ?? "0"), 10);

    // The trade decides the colour when the logo cannot, and carries
    // the mark either way. Read here rather than sent up, so the page
    // cannot ask for a category's colours on another category's behalf.
    // The trade still picks the colour, and is read here rather than
    // sent up so a page cannot ask for another category's palette.
    const { data: category } = categoryId
        ? await supabase.from("categories").select("slug").eq("id", categoryId).maybeSingle()
        : { data: null };

    // A colour the admin picked, off the logo or out of the wheel.
    // Checked as a hex here, since it goes straight into a gradient.
    const picked = String(form.get("colour") ?? "").trim();
    const chosenColour = isHex(picked) ? picked : null;

    const logo = form.get("logo");
    const logoColour =
        logo instanceof File && logo.size > 0
            ? await dominantColourFromBytes(Buffer.from(await logo.arrayBuffer()))
            : null;

    return coverImage({
        chosenColour,
        categorySlug: category?.slug ?? null,
        icon,
        logoColour,
        variation: Number.isFinite(variation) ? variation : 0,
    });
}
