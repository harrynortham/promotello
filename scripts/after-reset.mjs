// Said after a reset, because the database is not the only thing holding
// the old data.
//
// `getLiveOffers` and `getPublicBusinesses` are "use cache" with
// cacheLife("minutes"), so a dev server running across a reset keeps
// serving renders made before it. That is harmless when the rows come
// back the same, and thoroughly confusing when they do not: a reset
// whose seed failed leaves the pages rendered empty, and they stay
// empty after a later seed fixes the data. Clearing .next/cache alone
// did not shift it — the server has to start again.

import fs from "node:fs";

const running = (() => {
    try {
        return fs.existsSync(".next/dev");
    } catch {
        return false;
    }
})();

console.log(
    [
        "",
        running
            ? "The dev server is holding cached pages from before this reset."
            : "If a dev server is running, it is holding pages from before this reset.",
        "Restart it — stop `npm run dev` and start it again — or the",
        "categories and listings will show you the old data.",
        "",
    ].join("\n"),
);
