-- One reminder for people who signed up as a business but haven't created
-- one. The auth callback stamps business_signup_at in app_metadata on a
-- new account's first business sign-in (email confirmation, Google or
-- Apple). The daily job then emails anyone with no business after a day,
-- once, and gives up after a week.

create table if not exists public.business_signup_reminders (
  user_id uuid primary key
    references auth.users (id)
    on delete cascade,

  sent_at timestamptz not null default timezone('utc', now())
);

-- Only the service role reads or writes this.
alter table public.business_signup_reminders enable row level security;

create or replace function public.claim_business_signup_reminders()
returns table (
  user_id uuid,
  email text,
  full_name text
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  return query
  with due as (
    select u.id
    from auth.users u
    where u.raw_app_meta_data ? 'business_signup_at'
      and u.email is not null
      and u.created_at <= now() - interval '1 day'
      and u.created_at > now() - interval '7 days'
      -- Not a member of any business, so not one who was invited either.
      and not exists (select 1 from public.business_members m where m.user_id = u.id)
  ),
  claimed as (
    insert into public.business_signup_reminders (user_id)
    select d.id from due d
    on conflict do nothing
    returning business_signup_reminders.user_id
  )
  select
    u.id,
    u.email::text,
    coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name')
  from claimed c
  join auth.users u on u.id = c.user_id;
end;
$$;

revoke all on function public.claim_business_signup_reminders() from public, anon, authenticated;
grant execute on function public.claim_business_signup_reminders() to service_role;
