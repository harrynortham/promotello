-- Who to write to, and everything else by hand
--
-- A lead had no contact name. The preview form has always asked for one
-- — "Hi Sam," is the first line of the outreach email — and it was
-- typed into the preview rather than kept with the business it belongs
-- to, so it was gone by the time the next email was written.
--
-- 20270203090000 wired a lead into the preview form and I wrote the
-- query as though contact_name existed. It did not, the select failed
-- whole, and nothing prefilled until I noticed. This is the column that
-- was missing.

alter table public.leads
  add column if not exists contact_name text;

comment on column public.leads.contact_name is
  'The person to write to. Fills the preview form, and is the first line of the outreach email.';

-- Where a typed email came from is "somebody typed it", which is not a
-- URL. The page linked to it anyway and the link went nowhere.
comment on column public.leads.email_source is
  'The URL it was found on, or the word typed. Only a URL is worth linking to.';
