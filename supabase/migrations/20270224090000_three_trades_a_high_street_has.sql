-- Three trades a high street has and the directory had nowhere to put.
--
-- Found by sweeping Gloucester Road and reading what came back with no
-- category of ours against it:
--
--   Off-licences and wine shops   10 found, 5 of them caught by nothing
--                                 we have. Pubs & bars is the on-trade
--                                 and Delis & grocers is food; a bottle
--                                 shop is neither, and discounting is
--                                 its ordinary behaviour.
--
--   Sports and outdoor shops      Fitness & sport sits under Things to
--                                 do, which is an activity rather than
--                                 a shop, so a running shop or an
--                                 outdoor shop had to call itself
--                                 something it is not.
--
--   Toys, games and kids          Thin on this one street, and a staple
--                                 of any offers directory: parents are
--                                 exactly who uses one.
--
-- Furniture was the fourth candidate and is not here. Home & gifts
-- means homeware broadly, so it already has a home.
--
-- Estate agents and solicitors were the highest-volume misses of all
-- and are deliberately left out: they do not discount to passers-by,
-- and a category nobody posts in makes the directory look empty.
-- Professional services is the right home for them.

insert into public.categories (parent_id, name, slug, sort_order, is_active)
select id, 'Off-licence & wine', 'off-licence-wine', 100, true
from public.categories
where slug = 'food-drink'
on conflict (slug) do nothing;

insert into public.categories (parent_id, name, slug, sort_order, is_active)
select id, 'Sports & outdoor', 'sports-outdoor', 80, true
from public.categories
where slug = 'shopping'
on conflict (slug) do nothing;

insert into public.categories (parent_id, name, slug, sort_order, is_active)
select id, 'Toys, games & kids', 'toys-games-kids', 90, true
from public.categories
where slug = 'shopping'
on conflict (slug) do nothing;
