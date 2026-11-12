// UK local dates and times (Europe/London, so GMT or BST).

function londonOffsetMinutes(at: Date) {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/London",
        timeZoneName: "shortOffset",
    }).formatToParts(at);
    const name = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT";
    const match = name.match(/GMT([+-]\d+)?/);
    return match?.[1] ? Number(match[1]) * 60 : 0;
}

// "2026-11-03" + "19:30" in UK time → ISO timestamp.
export function ukLocalToIso(date: string, time: string) {
    const [year, month, day] = date.split("-").map(Number);
    const [hours, minutes] = time.split(":").map(Number);
    const asUtc = Date.UTC(year, month - 1, day, hours, minutes);
    const offset = londonOffsetMinutes(new Date(asUtc));
    return new Date(asUtc - offset * 60_000).toISOString();
}

// ISO timestamp → { date: "2026-11-03", time: "19:30" } in UK time.
export function isoToUkLocal(iso: string) {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat("en-GB", {
            timeZone: "Europe/London",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23",
        })
            .formatToParts(new Date(iso))
            .map((part) => [part.type, part.value]),
    );
    return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

// "Sat 8 Nov, 7:30pm–10pm"
export function formatEventTime(startsAt: string, endsAt: string | null) {
    const day = new Intl.DateTimeFormat("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        timeZone: "Europe/London",
    }).format(new Date(startsAt));
    const time = (iso: string) =>
        new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Europe/London" })
            .format(new Date(iso))
            .replace(":00", "")
            .replace(" ", "");
    return `${day}, ${time(startsAt)}${endsAt ? `–${time(endsAt)}` : ""}`;
}

// How long ago something happened, for a list somebody scans rather than
// studies: the newest ones in minutes, then hours, then "Yesterday", and
// a date once it stops mattering exactly when.
//
// `now` is passed in so this is a pure function and the tests don't have
// to wait for the clock.
// A date to read rather than count back from: "12 Nov", with the year
// only when it isn't this one. The same shape timeAgo falls back to.
export function ukDate(iso: string, now = new Date()) {
    const then = new Date(iso);

    if (Number.isNaN(then.getTime())) return "";

    const ukYear = (at: Date) =>
        new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(at).slice(0, 4);

    return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: ukYear(now) === ukYear(then) ? undefined : "numeric",
        timeZone: "Europe/London",
    }).format(then);
}

export function timeAgo(iso: string, now = new Date()) {
    const then = new Date(iso);

    if (Number.isNaN(then.getTime())) return "";

    const seconds = Math.round((now.getTime() - then.getTime()) / 1000);

    // A clock a little ahead of the server shouldn't read "in 3 seconds".
    if (seconds < 60) return "Just now";

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;

    // Past a day, counting hours stops helping, and days are UK days
    // rather than 24-hour blocks so "Yesterday" lands on the day a
    // person would call yesterday whatever time they read it.
    const ukDay = (at: Date) =>
        new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(at);
    const days = Math.round(
        (Date.parse(`${ukDay(now)}T00:00:00Z`) - Date.parse(`${ukDay(then)}T00:00:00Z`)) / 86_400_000,
    );

    if (days <= 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;

    return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: ukDay(now).slice(0, 4) === ukDay(then).slice(0, 4) ? undefined : "numeric",
        timeZone: "Europe/London",
    }).format(then);
}
