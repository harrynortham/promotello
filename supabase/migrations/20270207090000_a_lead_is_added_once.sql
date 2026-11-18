-- One lead per business
--
-- The Add a lead button gave no sign it was working, so it was pressed
-- twice and the business went in twice: "Jinzu", BS7 8TZ, four and a
-- half seconds apart. The button says "Adding…" and disables itself now,
-- which stops the usual case — but a disabled button is a request not to
-- do it again, and two requests already in flight do not read it.
--
-- A check in the action does not close it either. Both requests ask "is
-- this already here?", both are told no, and both insert. Only the
-- database can answer that question once, so this is a unique index
-- rather than a lookup.
--
-- Name and postcode. Two shops with the same name in the same postcode
-- are the same shop. Without a postcode yet, the name alone has to do:
-- the alternative is letting the same double-press through whenever the
-- postcode has not been filled in, which is exactly when a lead is new
-- and most likely to be added twice.

-- The duplicates already here, before an index can be built over them.
-- Only ones nothing has happened to: anything written to, or queued to
-- be written to, is left alone and will stop this migration loudly
-- rather than disappear quietly.
delete from public.leads l
where exists (
  select 1
  from public.leads keep
  where lower(btrim(keep.name)) = lower(btrim(l.name))
    and coalesce(keep.postcode, '') = coalesce(l.postcode, '')
    and keep.created_at < l.created_at
)
and not exists (select 1 from public.outreach_messages m where m.lead_id = l.id)
and l.preview_business_id is null;

create unique index if not exists leads_one_per_business
  on public.leads (lower(btrim(name)), coalesce(postcode, ''));

comment on index public.leads_one_per_business is
  'A business goes in once. Added by hand, so a double press is the common way in; the button disabling itself does not stop two requests already running.';
