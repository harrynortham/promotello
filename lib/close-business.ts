// Closing a business asks for its name, not the word DELETE: with several
// in the switcher, DELETE is how you close the wrong one. Shared so the
// dialog's button and the server action agree on what counts as a match —
// the server checks again, because the dialog is only a dialog.

export function confirmsName(typed: string, businessName: string) {
    const clean = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();
    const wanted = clean(businessName);

    return wanted.length > 0 && clean(typed) === wanted;
}
