import * as Sentry from "@sentry/nextjs";

// Every scheduled email is claimed before it is sent, so the same message
// can't go out twice. The cost is that a send Resend rejects looks, to the
// next run, like one already made — and is lost.
//
// So a rejected send puts its claim back. The next run picks it up again,
// which is the right trade: a late email beats a missing one, and the claim
// still stops duplicates on the happy path.
export async function releaseClaims(
    label: string,
    remove: () => PromiseLike<{ error: { message: string } | null }>,
) {
    const { error } = await remove();

    if (error) {
        // The email is already lost at this point; say so loudly rather than
        // letting it disappear quietly.
        console.error(`${label}: could not release claims after a failed send`, error);
        Sentry.captureMessage(`${label}: could not release claims after a failed send: ${error.message}`, "error");
        return;
    }

    console.warn(`${label}: released claims after a failed send, they will be retried`);
}
