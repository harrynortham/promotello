-- The mark comes off the category.
--
-- 20270219090000 hung one SVG path on each category and drew it behind
-- every generated cover in that trade. One mark per trade is one too
-- few: "Pubs & bars" is a cocktail bar and a local with a carpet, and
-- the martini glass it was seeded with made The Anchor look like
-- somewhere it is not.
--
-- The mark is now picked by hand while the cover is being built, from
-- the whole of lucide rather than from a list of forty-four, and it is
-- baked into the PNG as it is drawn. Nothing needs to remember it
-- afterwards, so nothing stores it.
--
-- Dropped rather than left in place: a column nothing reads is a
-- question for whoever finds it next.
alter table public.categories
    drop column if exists icon_path;
