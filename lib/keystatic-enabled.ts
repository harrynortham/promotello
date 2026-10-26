// The blog editor (/keystatic) works locally, saving to files, and on the
// live site once the GitHub app is connected (it saves through GitHub).
// A deployed site without GitHub would have nowhere to save, so it's off.
export const keystaticEnabled =
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_KEYSTATIC_STORAGE === "github" ||
    Boolean(process.env.NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG);
