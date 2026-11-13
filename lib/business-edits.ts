// What changed on a business page after we approved it.
//
// The rows are written by a trigger
// (20261230090000_an_edit_leaves_a_trace.sql) and read in admin. This
// is the reading: what each field is called, and how a save of several
// fields at once is said in one line.
//
// Imports nothing, so it unit tests on its own
// (tests/unit/business-edits.test.ts).

export type BusinessEditField = "name" | "description" | "logo_url" | "cover_image_url";

export type BusinessEdit = {
    id: string;
    businessId: string;
    field: BusinessEditField;
    was: string | null;
    became: string | null;
    editedAt: string;
    reviewedAt: string | null;
};

export const editFieldLabels: Record<BusinessEditField, string> = {
    name: "Name",
    description: "Description",
    logo_url: "Logo",
    cover_image_url: "Cover image",
};

export function isImageField(field: BusinessEditField) {
    return field === "logo_url" || field === "cover_image_url";
}

// "name and description", "logo, cover image and name": the line that
// says what somebody did without making them open it.
export function editSummary(fields: BusinessEditField[]): string {
    const named = [...new Set(fields)].map((field) => editFieldLabels[field].toLowerCase());

    if (named.length === 0) return "nothing";
    if (named.length === 1) return named[0];

    return `${named.slice(0, -1).join(", ")} and ${named[named.length - 1]}`;
}

// A description can be a paragraph, and the admin list is a list.
export function shorten(value: string | null, limit = 140): string {
    const text = (value ?? "").trim();

    if (text === "") return "—";
    if (text.length <= limit) return text;

    return `${text.slice(0, limit - 1).trimEnd()}…`;
}

// Everything one business changed, newest save first, so a page of
// them reads as "this business, then that one".
export function groupByBusiness<T extends { businessId: string; editedAt: string }>(edits: T[]) {
    const byBusiness = new Map<string, T[]>();

    for (const edit of edits) {
        byBusiness.set(edit.businessId, [...(byBusiness.get(edit.businessId) ?? []), edit]);
    }

    return [...byBusiness.entries()]
        .map(([businessId, rows]) => ({
            businessId,
            edits: [...rows].sort((a, b) => b.editedAt.localeCompare(a.editedAt)),
            latest: rows.reduce((newest, row) => (row.editedAt > newest ? row.editedAt : newest), ""),
        }))
        .sort((a, b) => b.latest.localeCompare(a.latest));
}
