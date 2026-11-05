// Nudges for the customer area: one short bar above the page with
// something worth doing, and a way to say not now.
//
// To add another, add an entry below. `applies` decides whether it is
// worth saying to this person; the first one that applies and hasn't been
// dismissed is the one shown, so put the most useful first. Anything
// needing more than a sentence and a button belongs on a page instead.

export type AnnouncementId = "add-birthday";

// What the button does: open something we can finish here and now, or go
// somewhere. Keep the inline ones to a question or two.
export type AnnouncementAction =
    | { label: string; opens: "birthday" }
    | { label: string; href: string };

export type Announcement = {
    id: AnnouncementId;
    title: string;
    body: string;
    action: AnnouncementAction;
};

// What we know about the person, for deciding what is worth saying.
export type AnnouncementContext = {
    hasBirthday: boolean;
    dismissed: readonly string[];
};

const announcements: readonly (Announcement & {
    applies: (context: AnnouncementContext) => boolean;
})[] = [
    {
        id: "add-birthday",
        title: "Get a birthday treat",
        body: "Businesses you follow can send you a reward on your birthday. It takes a second — the day and the month, never the year.",
        action: { label: "Add your birthday", opens: "birthday" },
        // Pointless once they have, and the bar disappears by itself.
        applies: (context) => !context.hasBirthday,
    },
];

// The one to show, or none. Dismissing is per person and per announcement,
// so a new one still gets its turn.
export function announcementFor(context: AnnouncementContext): Announcement | null {
    const found = announcements.find(
        (announcement) =>
            !context.dismissed.includes(announcement.id) && announcement.applies(context),
    );

    if (!found) return null;

    const { applies, ...announcement } = found;
    void applies;

    return announcement;
}

// Dismissals are kept on the account rather than the device, so saying
// "not now" on a phone is still true on a laptop.
export const DISMISSED_KEY = "dismissed_announcements";

export function readDismissed(metadata: unknown): string[] {
    const value = (metadata as Record<string, unknown> | null)?.[DISMISSED_KEY];

    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
