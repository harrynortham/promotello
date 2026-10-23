import { headers } from "next/headers";

// The origin this request came in on, so links printed in QR codes point at
// the same site the business is using (production, preview or localhost).
export async function requestOrigin() {
    const requestHeaders = await headers();
    const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
    const protocol =
        requestHeaders.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");

    return `${protocol}://${host}`;
}
