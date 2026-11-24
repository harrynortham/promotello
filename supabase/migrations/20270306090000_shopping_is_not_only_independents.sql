-- Promotello no longer says "independent" for who it is for: a business
-- can be local without being a single-site independent, and the word
-- turned away the small chains and franchises that are exactly as local
-- as the shop next door. Everything a customer or a business reads now
-- says "local businesses".
--
-- One of those sentences lives in a row rather than in the code. The
-- Shopping category's description is printed on /categories and on the
-- category page itself, and it still read "Independent shops, makers and
-- local retailers." The other category descriptions already lead with
-- what is in them, so this one does too.

update public.categories
set description = 'Shops, makers and local retailers.'
where slug = 'shopping'
  and description = 'Independent shops, makers and local retailers.';
