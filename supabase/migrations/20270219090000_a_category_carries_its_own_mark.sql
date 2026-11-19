-- A category carries its own mark.
--
-- Generated covers draw the trade behind the business name: a cup for a
-- cafe, scissors for a barber. The marks started as a map in
-- lib/cover-icons.ts, which meant a new category could be added through
-- /admin/categories but its mark could not — every business in it got
-- the generic shop front until somebody shipped code.
--
-- So the mark is a column. It holds SVG path data on lucide's 24-box,
-- which is what the rest of the site draws with, and the admin page
-- renders it beside the field rather than asking anybody to read a path
-- by eye.

alter table public.categories
    add column if not exists icon_path text;

comment on column public.categories.icon_path is
    'SVG path data on a 24x24 viewBox, stroked rather than filled. Drawn behind the business name on a generated cover. Null falls back to a shop front.';

-- The marks the map held, so the day this runs nothing looks different.
update public.categories as c
set icon_path = seed.path
from (values
    ('cafes-coffee', 'M10 2v2M14 2v2M4 8h14a2 2 0 0 1 0 8h-1M4 8v9a3 3 0 0 0 3 3h7a3 3 0 0 0 3-3V8'),
    ('bakeries', 'M3 12a4 4 0 0 1 4-4h10a4 4 0 0 1 0 8H7a4 4 0 0 1-4-4ZM7 8V6M12 8V5M17 8V6'),
    ('restaurants', 'M3 2v7a3 3 0 0 0 6 0V2M6 9v13M18 2c-2 0-3 3-3 7s1 5 3 5v8'),
    ('pubs-bars', 'M8 22h8M12 15v7M5 3h14l-7 9z'),
    ('takeaways', 'M4 8h16l-1.5 12a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2zM8 8V5a4 4 0 0 1 8 0v3'),
    ('ice-cream-desserts', 'M12 2a5 5 0 0 0-5 5c0 1 .5 2 1 3h8c.5-1 1-2 1-3a5 5 0 0 0-5-5ZM8 10l4 12 4-12'),
    ('delis-grocers', 'M3 6h18l-2 14H5zM8 6V4a4 4 0 0 1 8 0v2'),
    ('farm-shops', 'M3 21V10l9-7 9 7v11M9 21v-7h6v7'),
    ('butchers-fishmongers', 'M6 12c0-4 3-7 7-7s7 3 7 7-3 7-7 7-7-3-7-7ZM3 8l3 4-3 4'),
    ('activities-experiences', 'M12 2 15 9l7 .5-5.5 4.5L18 21l-6-4-6 4 1.5-7L2 9.5 9 9z'),
    ('cinema-theatre', 'M3 4h18v16H3zM7 4v16M17 4v16M3 10h18M3 15h18'),
    ('fitness-sport', 'M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12'),
    ('classes-workshops', 'M3 7l9-4 9 4-9 4zM7 11v5c0 1.5 2.5 3 5 3s5-1.5 5-3v-5'),
    ('attractions', 'M12 2 4 7v13h16V7zM9 20v-6h6v6'),
    ('fashion-vintage', 'M9 3 5 6l2 3 1-1v13h8V8l1 1 2-3-4-3a4 4 0 0 1-6 0Z'),
    ('books-music', 'M4 4h7v16H4zM13 4h7v16h-7M6 8h3M15 8h3'),
    ('home-gifts', 'M3 9h18v12H3zM3 9l2-5h14l2 5M12 4v17'),
    ('plants-flowers', 'M12 22V10M12 10c0-4 3-6 6-6 0 4-3 6-6 6ZM12 12c0-4-3-6-6-6 0 4 3 6 6 6Z'),
    ('makers-markets', 'M4 9h16l-1 11H5zM4 9 7 3h10l3 6M9 13v4M15 13v4'),
    ('newsagents-convenience', 'M4 5h12v14H4zM16 9h4v8a2 2 0 0 1-4 0zM7 8h6M7 12h6'),
    ('jewellery-watches', 'M12 2 7 8l5 13 5-13zM7 8h10M12 2 9.5 8M12 2l2.5 6'),
    ('hair-barbers', 'M6 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM6 14a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM8.5 8.5 20 20M8.5 15.5 20 4'),
    ('beauty-nails', 'M9 3h6v12a3 3 0 0 1-6 0zM9 21h6'),
    ('spas-massage', 'M12 22c0-6 4-10 9-10-1 6-4 10-9 10ZM12 22c0-6-4-10-9-10 1 6 4 10 9 10ZM12 22V9'),
    ('yoga-wellbeing', 'M12 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM12 8v6M8 22l4-8 4 8M5 11h14'),
    ('tattoo-piercing', 'M3 21 14 10M14 10l3-3 4 4-3 3zM14 10l-4-4 3-3 4 4'),
    ('pharmacies', 'M12 6v12M6 12h12M4 4h16v16H4z'),
    ('opticians', 'M2 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0ZM14 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0ZM10 12h4'),
    ('dentists', 'M12 3c-3 0-5 2-5 5 0 5 1 13 3 13s1-6 2-6 0 6 2 6 3-8 3-13c0-3-2-5-5-5Z'),
    ('clinics-physio', 'M12 5v14M5 12h14'),
    ('bike-repair', 'M5 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM19 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5 13h7l4-6M9 7h4'),
    ('pet-care', 'M6 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM18 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM12 21c-4 0-6-2-6-4s2-6 6-6 6 4 6 6-2 4-6 4Z'),
    ('home-garden', 'M12 22V12M12 12c0-5 4-8 9-8 0 5-4 8-9 8ZM12 16c0-3-3-5-7-5 0 3 3 5 7 5Z'),
    ('repairs-alterations', 'M14 7a4 4 0 1 0-5 5L3 18l3 3 6-6a4 4 0 0 0 5-5l-3 3-2-2z'),
    ('professional-services', 'M4 7h16v13H4zM9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M4 13h16'),
    ('garages-mot', 'M5 15h14l-1-5H6zM7 15v3M17 15v3M4 10h16'),
    ('car-wash-valeting', 'M5 17h14l-1-6H6zM7 17v2M17 17v2M8 5v3M12 3v5M16 5v3'),
    ('phone-computer-repair', 'M7 2h10v20H7zM10 19h4'),
    ('dry-cleaning-laundry', 'M4 4h16v16H4zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z'),
    ('childcare-nurseries', 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM9 10h.01M15 10h.01M9 15c1 1 5 1 6 0'),
    ('taxis-transport', 'M5 16h14l-1-6H6zM7 16v3M17 16v3M9 10V7h6v3'),
    ('driving-schools', 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 3v5M12 16v5'),
    ('hotels-bnbs', 'M3 18V8M3 12h12a4 4 0 0 1 4 4v2M21 18v-2M6 10h.01'),
    ('tours-days-out', 'M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7ZM12 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z')
) as seed (slug, path)
where c.slug = seed.slug
  and c.icon_path is null;
