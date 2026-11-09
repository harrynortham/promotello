// A business built for a preview is owned by the admin who built it until
// someone claims it, which is only true of the row: it isn't a business they
// run, and it belongs in /admin/previews rather than in their dashboard.
//
// The embedded rows are empty for anyone who isn't a platform admin, since
// only they can read business_previews — so this is a no-op for everyone else.
export function unclaimedPreview(business: {
    business_previews?: { claimed_at: string | null }[] | null;
}) {
    return (business.business_previews ?? []).some((preview) => preview.claimed_at === null);
}
