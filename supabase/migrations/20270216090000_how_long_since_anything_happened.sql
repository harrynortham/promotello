-- How long since anything happened to this lead
--
-- The board sorts by it: the leads nothing has been done to in the
-- longest time come first, because that is what a sales board is for —
-- finding neglected work, not admiring recent work.
--
-- A column rather than a sum over lead_events, because it has to be
-- ORDER BY-able. Without it the whole table has to be read and sorted
-- in the app before a page of it can be shown, which is not pagination,
-- it is fetching everything and hiding most of it.
--
-- It starts at the moment the lead was added, so a lead typed in three
-- weeks ago and left alone sorts above one typed in this morning. That
-- is the honest reading of "nothing has happened to it".
--
-- Kept by a trigger, not by the app: lib/notify.ts, the daily job, the
-- seeds and the e2e fixtures all write lead_events, and a column only
-- one of them maintained would be wrong the first time another did.
--
-- Named record_lead_touch, not touch_lead. touch_lead() already exists
-- (20270131090000) and is the updated_at trigger on leads — "create or
-- replace" on that name does not fail, it silently rewrites the body of
-- a function something else depends on. The first version of this
-- migration did exactly that, and every update to any lead would have
-- failed with 'record "new" has no field "kind"'.

alter table public.leads
  add column if not exists last_touch_at timestamptz not null default now();

-- The kinds that count. A note, a crawled email or a Companies House
-- check is not something we did TO them — it is something we found out.
-- This list is the same one lib/sales-due.ts uses, and a test holds the
-- two together.
create or replace function public.record_lead_touch()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.kind in (
    'preview_built', 'followed_social', 'dm_sent',
    'emailed', 'followed_up', 'letter_sent'
  ) then
    update public.leads
       set last_touch_at = greatest(last_touch_at, new.created_at)
     where id = new.lead_id;
  end if;

  return new;
end;
$$;

drop trigger if exists lead_events_record_touch on public.lead_events;

create trigger lead_events_record_touch
  after insert on public.lead_events
  for each row execute function public.record_lead_touch();

-- What the trigger would have written had it always been there.
update public.leads as l
   set last_touch_at = greatest(
         l.created_at,
         coalesce((
           select max(e.created_at)
             from public.lead_events as e
            where e.lead_id = l.id
              and e.kind in (
                'preview_built', 'followed_social', 'dm_sent',
                'emailed', 'followed_up', 'letter_sent'
              )
         ), l.created_at)
       );

-- The board's order, and the one it pages through.
create index if not exists leads_last_touch_at_idx
  on public.leads (last_touch_at);
