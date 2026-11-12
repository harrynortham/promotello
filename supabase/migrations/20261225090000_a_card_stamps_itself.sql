-- The customer's card updates as it is stamped.
--
-- Staff press "Add a stamp" on their own phone while the customer is
-- holding theirs out. Until now the customer's card only changed if
-- they reloaded it, so the moment that is worth something — the stamp
-- landing — happened on the wrong screen.
--
-- Realtime's Postgres Changes sends a row to a client only if that
-- client's RLS policies let it read the row, and loyalty_cards already
-- says a customer sees their own. So this is the whole change: put the
-- table in the publication Realtime listens to. No new policy, and
-- nobody is sent a card that was not already theirs to read.
--
-- The first use of Realtime in the app. Notifications deliberately
-- don't use it (docs/NOTIFICATIONS-SPEC.md): a dot that is a minute
-- stale costs nothing, and a stamp landing in front of somebody is the
-- opposite.

do $$
begin
  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'loyalty_cards'
  ) then
    alter publication supabase_realtime add table public.loyalty_cards;
  end if;
end
$$;
