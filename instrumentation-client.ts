import * as Sentry from "@sentry/nextjs";

import { sentryDsn, sentryOptions } from "@/lib/sentry";

// Browser error reporting (see lib/sentry.ts).
if (sentryDsn) {
    Sentry.init(sentryOptions);
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
