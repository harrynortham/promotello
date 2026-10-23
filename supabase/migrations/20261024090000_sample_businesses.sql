-- Fictional businesses used to populate the site before launch. They render
-- like real listings but are excluded from the sitemap, marked noindex, and
-- removed with scripts/sample-data.mjs remove.
alter table public.businesses
  add column if not exists is_sample boolean not null default false;

create index if not exists businesses_is_sample_idx
  on public.businesses (is_sample)
  where is_sample;
