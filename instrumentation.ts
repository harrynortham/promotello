import * as Sentry from "@sentry/nextjs";

import { sentryDsn, sentryOptions } from "@/lib/sentry";

// Server and edge error reporting (see lib/sentry.ts).
export async function register() {
    if (sentryDsn) {
        Sentry.init(sentryOptions);
    }
}

// Errors thrown while rendering pages, in route handlers and server actions.
export const onRequestError = Sentry.captureRequestError;
