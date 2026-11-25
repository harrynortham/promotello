import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { safeNextPath } from "@/lib/redirects";
import { movedAddress } from "@/lib/slugs";

// 1. A business's handle, /@harbourgrind, is served by /bio/<handle>.
//    Rewritten here rather than routed, because a folder named "@..."
//    in app/ is a parallel route slot to Next rather than a path.
// 2. Old or outdated business and offer addresses (/businesses/<uuid>, a
//    renamed business, an old offer slug) redirect permanently.
// 3. Signed-in users who open /login or /signup go straight to where they
//    were heading (?next=) or their dashboard.
export async function proxy(request: NextRequest) {
    const { pathname, search } = request.nextUrl;

    if (pathname.startsWith("/@")) {
        const handle = pathname.slice(2).toLowerCase();

        // Anything that is not handle-shaped is not a handle. A 404 from
        // the page would do, but this keeps the rewrite honest.
        if (!/^[a-z0-9]([a-z0-9-]{1,28}[a-z0-9])$/.test(handle)) {
            return NextResponse.next();
        }

        return NextResponse.rewrite(new URL(`/bio/${handle}${search}`, request.url));
    }

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
    matcher: ["/login", "/signup", "/businesses/:segment", "/offers/:segment", "/@:handle"],
};
