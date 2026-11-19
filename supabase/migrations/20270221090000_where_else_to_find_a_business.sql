-- Where else to find a business.
--
-- Most of these places put more into their Instagram than into any
-- website, and a customer who has just found them on a directory page
-- wants to see the room before they go. The links belong on the page
-- for the same reason the photo does.
--
-- Six columns rather than one jsonb: website_url and google_review_url
-- are already columns here, a link is a link, and a check constraint on
-- a column says what a shape in a blob cannot. The cost is a migration
-- if a seventh network ever matters, which is the right way round —
-- adding one should be a decision, not a free-text key somebody types
-- differently the second time.
alter table public.businesses
    add column if not exists instagram_url text,
    add column if not exists facebook_url text,
    add column if not exists tiktok_url text,
    add column if not exists x_url text,
    add column if not exists youtube_url text,
    add column if not exists linkedin_url text;

-- Https and nothing else. These are rendered as links on a public page,
-- so javascript: and data: must never reach the markup — lib/social-links.ts
-- refuses them on the way in and this refuses them underneath, because
-- the one place that must not be bypassable is the database.
alter table public.businesses
    drop constraint if exists businesses_social_links_are_https;

alter table public.businesses
    add constraint businesses_social_links_are_https check (
        (instagram_url is null or instagram_url ~* '^https://[a-z0-9.-]+/.+')
        and (facebook_url is null or facebook_url ~* '^https://[a-z0-9.-]+/.+')
        and (tiktok_url is null or tiktok_url ~* '^https://[a-z0-9.-]+/.+')
        and (x_url is null or x_url ~* '^https://[a-z0-9.-]+/.+')
        and (youtube_url is null or youtube_url ~* '^https://[a-z0-9.-]+/.+')
        and (linkedin_url is null or linkedin_url ~* '^https://[a-z0-9.-]+/.+')
    );

comment on column public.businesses.instagram_url is
    'Full https profile url. Written from a handle or a pasted link by lib/social-links.ts.';
