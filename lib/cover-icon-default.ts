// The mark a cover starts on, and falls back to.
//
// A file of its own because both sides need it and only one of them can
// have the rest: lib/cover-icons.ts renders through react-dom/server,
// and a client component importing a constant from it drags that into
// the browser bundle, which Next refuses to build. True of every
// business, so it is also the right answer when a name is not one we
// know.
export const DEFAULT_ICON = "Store";
