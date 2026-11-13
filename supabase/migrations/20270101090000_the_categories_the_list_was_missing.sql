-- The categories the list was missing.
--
-- The list was twenty-nine kinds of business written before anybody had
-- signed up, and it reads like a nice high street rather than a real
-- one. A tattoo studio, a car garage, a pharmacy, an optician, a dry
-- cleaner, a phone repair shop, a nursery, a taxi firm, a newsagent: all
-- of them are on every high street in the country and none of them was
-- on the list. Until last week the answer was compulsory, so each of
-- them was somebody picking the nearest wrong one or giving up
-- (20261231090000_a_business_we_have_no_category_for.sql).
--
-- Fifteen more, chosen on two tests: somebody would otherwise find
-- nothing that is them, and the business is one that runs an offer or
-- stamps a card. A hand car wash and a dry cleaner are the clearest
-- stamp cards on the street; a garage and an optician run the plainest
-- offers.
--
-- Nothing here is city-specific and nothing is retired. "Something
-- else" stays where it is: this makes the queue behind it shorter, not
-- empty, and what lands in it next is the next thing to add.

insert into public.categories (parent_id, slug, name, sort_order)
select parent.id, child.slug, child.name, child.sort_order
from (
  values
    -- A butcher or a fishmonger is not a deli, and would not have
    -- found itself under one.
    ('food-drink', 'butchers-fishmongers', 'Butchers & fishmongers', 90),

    -- The corner shop, and the jeweller who also does repairs.
    ('shopping', 'newsagents-convenience', 'Newsagents & convenience', 60),
    ('shopping', 'jewellery-watches', 'Jewellery & watches', 70),

    -- Health as well as beauty: the heading's description says so now.
    ('health-beauty', 'tattoo-piercing', 'Tattoo & piercing', 50),
    ('health-beauty', 'pharmacies', 'Pharmacies', 60),
    ('health-beauty', 'opticians', 'Opticians', 70),
    ('health-beauty', 'dentists', 'Dentists', 80),
    ('health-beauty', 'clinics-physio', 'Clinics & physio', 90),

    -- Services was three things for the home, the pets and the bike.
    -- This is the rest of the parade.
    ('services', 'garages-mot', 'Garages & MOT', 60),
    ('services', 'car-wash-valeting', 'Car wash & valeting', 70),
    ('services', 'phone-computer-repair', 'Phone & computer repair', 80),
    ('services', 'dry-cleaning-laundry', 'Dry cleaning & laundry', 90),
    ('services', 'childcare-nurseries', 'Childcare & nurseries', 100),
    ('services', 'taxis-transport', 'Taxis & transport', 110),
    ('services', 'driving-schools', 'Driving schools', 120)
) as child (parent_slug, slug, name, sort_order)
join public.categories parent
  on parent.slug = child.parent_slug
on conflict (slug) do nothing;

-- Two headings now cover more than they say they do, and the words are
-- on the category page and in its search description.
update public.categories
set description = 'Hair, beauty, spas, tattoos, and local health from pharmacies to dentists.'
where slug = 'health-beauty';

update public.categories
set description = 'Garages, dry cleaners, repairs, childcare and trusted local services.'
where slug = 'services';
