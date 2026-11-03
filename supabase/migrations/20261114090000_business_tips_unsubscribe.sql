-- One-click unsubscribe for the setup emails.
--
-- The emails already carry a "Turn off setup tips" link, but it points at
-- /account/notifications, which needs a login. A List-Unsubscribe header
-- (RFC 8058) is POSTed by the mail app with nobody signed in, so it needs a
-- token that stands on its own -- the same shape followers already have.

alter table public.account_notification_settings
  add column if not exists business_tips_token uuid not null default gen_random_uuid();

create unique index if not exists account_notification_settings_tips_token_idx
  on public.account_notification_settings (business_tips_token);

comment on column public.account_notification_settings.business_tips_token is
  'Opaque token for one-click unsubscribe from the business setup emails.';

-- A settings row only exists once someone has changed something, so the
-- token has to be created on demand. Takes the addresses the claim returned
-- and hands back a token for each, making the row where there is none.
create or replace function public.business_tips_tokens(target_emails text[])
returns table (email text, token uuid)
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.account_notification_settings (user_id)
  select u.id
  from auth.users u
  where u.email = any (target_emails)
  on conflict (user_id) do nothing;

  return query
  select u.email::text, s.business_tips_token
  from auth.users u
  join public.account_notification_settings s on s.user_id = u.id
  where u.email = any (target_emails);
end;
$$;

revoke all on function public.business_tips_tokens(text[]) from public, anon, authenticated;
grant execute on function public.business_tips_tokens(text[]) to service_role;

-- The same token endpoint now answers for both kinds, so /unsubscribe/<token>
-- and the one-click route keep working unchanged. A follower token still
-- turns off that business's emails; a setup-tips token turns off the setup
-- emails for that person.
create or replace function public.unsubscribe_by_token(
  requested_token uuid,
  everything boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  follower_user_id uuid;
  tips_user_id uuid;
begin
  update public.business_followers
  set emails_enabled = false
  where unsubscribe_token = requested_token
  returning user_id into follower_user_id;

  if follower_user_id is not null then
    if everything then
      insert into public.account_notification_settings (user_id, followed_business_emails_enabled)
      values (follower_user_id, false)
      on conflict (user_id) do update set followed_business_emails_enabled = false;
    end if;

    return true;
  end if;

  -- Not a follower token: try the setup emails.
  update public.account_notification_settings
  set business_tips_enabled = false
  where business_tips_token = requested_token
  returning user_id into tips_user_id;

  return tips_user_id is not null;
end;
$$;

revoke all on function public.unsubscribe_by_token(uuid, boolean) from public;
grant execute on function public.unsubscribe_by_token(uuid, boolean) to anon, authenticated;

-- So the /unsubscribe/<token> page can recognise a setup-tips token and show
-- the right thing, rather than "link not recognised".
create or replace function public.business_tips_by_token(requested_token uuid)
returns table (enabled boolean)
language sql
stable
security definer
set search_path = public
as $$
  select s.business_tips_enabled
  from public.account_notification_settings s
  where s.business_tips_token = requested_token;
$$;

revoke all on function public.business_tips_by_token(uuid) from public;
grant execute on function public.business_tips_by_token(uuid) to anon, authenticated;
