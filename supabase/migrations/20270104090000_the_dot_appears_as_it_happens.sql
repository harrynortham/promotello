-- The dot on the avatar, as it happens.
--
-- Until now the unread count was asked for at the moments somebody
-- would expect it to be right: on a page change, on coming back to the
-- tab, and when the list itself said it had changed
-- (components/site/use-unread-notifications.ts). That covers somebody
-- moving about the app and misses the one that matters — a person
-- sitting on a page while something happens to them. A reward going
-- ready, an offer approved, a payment failing: all of it waited for
-- them to click something.
--
-- Realtime sends a row only to a client whose RLS lets it read the row,
-- and notifications_select_own is "user_id = auth.uid()", so a
-- subscription filtered to their own id is theirs twice over — once by
-- the filter, once by the policy. Nothing else has to change: the table
-- already has the right policies, and the publication is the only thing
-- standing between it and the page.
--
-- loyalty_cards is in here already, for the wallet
-- (20261225090000_a_card_stamps_itself.sql).

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;

-- Realtime needs the old row to decide who an update or a delete was
-- for: without it the payload carries only the primary key, and a dot
-- that cannot tell whose notification was read cannot go down again.
alter table public.notifications replica identity full;
