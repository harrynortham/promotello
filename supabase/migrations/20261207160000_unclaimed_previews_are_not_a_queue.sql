-- An unclaimed preview isn't waiting for review.
--
-- A preview is a business built by an admin before anyone has been asked, so
-- it starts pending like any other. That put it straight into the approval
-- queue and the badge beside Businesses, where it sat as work that nobody had
-- asked for and nobody could do: there is nothing to approve until the
-- business has claimed the page and made it theirs.
--
-- The queue wants "pending, and someone has asked" rather than "pending", and
-- that can't be written as a PostgREST filter — it is the absence of a row in
-- another table. So the businesses row carries it, kept true by the two
-- events that change it.

alter table public.businesses
  add column if not exists awaiting_claim boolean not null default false;

create index if not exists businesses_awaiting_claim_idx
  on public.businesses (awaiting_claim)
  where awaiting_claim;

-- Existing rows: a preview that nobody has claimed yet.
update public.businesses b
set awaiting_claim = true
where exists (
  select 1
  from public.business_previews p
  where p.business_id = b.id
    and p.claimed_at is null
);

create or replace function public.sync_awaiting_claim()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    -- The preview is gone, so there is nothing left to claim.
    update public.businesses
    set awaiting_claim = false
    where id = old.business_id;

    return old;
  end if;

  update public.businesses
  set awaiting_claim = (new.claimed_at is null)
  where id = new.business_id;

  return new;
end;
$$;

drop trigger if exists business_previews_sync_awaiting_claim on public.business_previews;

create trigger business_previews_sync_awaiting_claim
after insert or update of claimed_at or delete on public.business_previews
for each row
execute function public.sync_awaiting_claim();

comment on column public.businesses.awaiting_claim is
  'True while an unclaimed preview exists for this business. Kept by sync_awaiting_claim(). The admin review queue excludes these: nobody has asked for them to be reviewed.';
