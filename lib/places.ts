// Naming places in copy. No Next.js or Supabase imports, so it can be unit
// tested on its own (tests/unit/places.test.ts).

// Up to this many places are named in copy; beyond it they are summarised,
// because "Offers across A, B, C, D, E and F" stops being a sentence.
const NAMED_PLACES = 3;

// "Bristol", "Bristol and Bath", "Bristol, Bath and 2 more places".
export function listPlaces(names: string[]) {
    if (names.length <= 1) return names[0] ?? "";
    if (names.length <= NAMED_PLACES) return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;

    const rest = names.length - (NAMED_PLACES - 1);
    return `${names.slice(0, NAMED_PLACES - 1).join(", ")} and ${rest} more places`;
}
