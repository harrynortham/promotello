import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { safeNextPath } from "@/lib/redirects";
import { movedAddress } from "@/lib/slugs";

// 1. Old or outdated business and offer addresses (/businesses/<uuid>, a
//    renamed business, an old offer slug) redirect permanently.
// 2. Signed-in users who open /login or /signup go straight to where they
//    were heading (?next=) or their dashboard.
export async function proxy(request: NextRequest) {
    const { pathname, search } = request.nextUrl;

    if (pathname.startsWith("/businesses/") || pathname.startsWith("/offers/")) {
        const moved = await movedAddress(pathname);
        return moved ? NextResponse.redirect(new URL(`${moved}${search}`, request.url), 308) : NextResponse.next();
    }

    let response = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                    response = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options),
                    );
                },
            },
        },
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (user) {
        const next = safeNextPath(request.nextUrl.searchParams.get("next")) ?? "/dashboard";
        return NextResponse.redirect(new URL(next, request.url));
    }

    return response;
}

export const config = {
    matcher: ["/login", "/signup", "/businesses/:segment", "/offers/:segment"],
};
