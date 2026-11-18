-- A line that could only have been written to them
--
-- A cold email is read in the first sentence or not at all, and the
-- first sentence of ours is the same for everybody. This is one true
-- thing about this business — something from their reviews, or their
-- photos, or the window — that opens it and proves somebody looked.
--
-- On the lead rather than on the preview. 20270209090000 took six
-- columns off business_previews for being a second copy of the lead,
-- and this is the same kind of fact as the name of the person we are
-- writing to: it is about the business, it is used in the email, and
-- it is worth writing down while reading their site rather than only
-- once a page has been built.
--
-- Optional on purpose. A forced personal line is a worse email than
-- none: there is nothing true to say about every business, and the
-- made-up version is obvious.

alter table public.leads
  add column if not exists personal_line text
    check (personal_line is null or char_length(personal_line) <= 200);

comment on column public.leads.personal_line is
  'One specific, true sentence about this business. Opens the first outreach email, and is left out entirely when blank.';
