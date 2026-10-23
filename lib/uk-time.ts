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
