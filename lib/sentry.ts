// Error monitoring with Sentry (EU region). On for sites deployed on Vercel
// (production and previews); off locally and in tests. Set
// NEXT_PUBLIC_SENTRY_DSN to override. No personal details are sent: no IP
// addresses, cookies or request bodies.

// A DSN only allows sending error reports, so it's safe in the code.
const PROMOTELLO_DSN =
    "https://9601bc21f1461ebd2753e4ff8d6e27d1@o4512316444770304.ingest.de.sentry.io/4512316455256144";

const deployed = Boolean(process.env.NEXT_PUBLIC_VERCEL_ENV);

export const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN || (deployed ? PROMOTELLO_DSN : undefined);

export const sentryOptions = {
    dsn: sentryDsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
    sendDefaultPii: false,
    // Errors only; no performance tracing.
    tracesSampleRate: 0,
};
