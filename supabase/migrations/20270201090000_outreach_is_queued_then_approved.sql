-- The day's emails, drafted and waiting for somebody to say yes
--
-- Writing to businesses has been: open the preview, copy the subject,
-- copy the message, paste into Gmail, send, come back and mark it
-- emailed. That is the right shape for a handful a day and it does not
-- reach a hundred (docs/OUTREACH.md).
--
-- What replaces it is not "the app sends cold email". It is a queue: the
-- message is drafted from the preview, it sits here until an admin reads
-- it and presses send, and only then does it go. The person stays
-- between the list and the outside world, which is what keeps a hundred
-- emails looking like a hundred letters from a person rather than a
-- mailing.
--
-- The draft is stored rather than generated at send time on purpose: what
-- somebody approved is what goes out. A preview edited in between does
-- not silently change the email that was read and agreed to.

create table if not exists public.outreach_messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,

  -- Which of the two emails this is. The letter is not here: it is paper,
  -- and it goes through a different thing entirely.
  kind text not null,

  -- Where it is going, copied at drafting time so a later change to the
  -- lead cannot redirect an approved message.
  to_email text not null,

  subject text not null,
  body text not null,

  status text not null default 'queued',

  queued_at timestamptz not null default timezone('utc', now()),
  approved_by uuid references auth.users (id) on delete set null,
  sent_at timestamptz,
  failed_reason text,

  constraint outreach_messages_kind_check check (kind in ('first', 'follow_up')),
  constraint outreach_messages_status_check check (status in ('queued', 'sent', 'cancelled', 'failed'))
);

-- One queued message of each kind per lead: pressing the button twice, or
-- two people working the list on the same morning, must not put the same
-- email in the queue twice.
create unique index if not exists outreach_messages_one_queued
  on public.outreach_messages (lead_id, kind)
  where status = 'queued';

create index if not exists outreach_messages_status_idx
  on public.outreach_messages (status, queued_at);

alter table public.outreach_messages enable row level security;

drop policy if exists outreach_messages_admin_all on public.outreach_messages;
create policy outreach_messages_admin_all on public.outreach_messages
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- The gate, once more, at the last place it could be got round.
--
-- leads.can_email is checked when a lead is moved and when a message is
-- drafted, but a row inserted straight into this table would be a way to
-- queue an email to somebody we may not write to. Under PECR that is the
-- thing that must not happen, so it is refused here too.
create or replace function public.enforce_outreach_gate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed boolean;
begin
  select l.can_email into allowed
  from public.leads l
  where l.id = new.lead_id;

  if not coalesce(allowed, false) then
    raise exception using
      errcode = 'check_violation',
      message = 'This lead is post only: under PECR we may not email them without consent.';
  end if;

  return new;
end;
$$;

drop trigger if exists outreach_messages_gate on public.outreach_messages;
create trigger outreach_messages_gate
before insert on public.outreach_messages
for each row
execute function public.enforce_outreach_gate();
