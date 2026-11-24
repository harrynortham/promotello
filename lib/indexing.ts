// Whether a page is ours to put in front of a search engine.
//
// Pages first builds a business's page before anybody claims it, and
// that page is real: it lives at the address it will keep, it is
// reachable by anyone we send the link to, and it is what the business
// is being shown when we write to them. What it is not is ours to
// advertise. Until a business takes it over, the page is in no listing,
// no search on this site, and no index:
//
//   the directory, areas, categories, search   getPublicBusinesses()
//   the sitemap                                app/sitemap.ts
//   the page's own robots meta                 the business page
//
// Three surfaces, one rule, stated here so the next person changing one
// of them can see the other two.
//
// This asked for a description and an address for a while, as a quality
// bar on which unclaimed pages were worth indexing. That question has
// gone: none of them are, until they are claimed. A business that has
// taken its page over is a listing its owner chose to have, and it is
// always indexed, however short they kept it.

export function worthIndexing({ unclaimed }: { unclaimed: boolean }) {
    return !unclaimed;
}
