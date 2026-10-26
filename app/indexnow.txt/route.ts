import { INDEXNOW_KEY } from "@/lib/indexnow";

// IndexNow's key file (see lib/indexnow.ts).
export function GET() {
    return new Response(INDEXNOW_KEY, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
