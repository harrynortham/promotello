-- The guest network, for a poster with two codes on it.
--
-- A sheet that joins somebody to the Wi-Fi and opens the offers is two
-- codes, not one: a QR code carries one payload, and "WIFI:..." and a
-- url cannot both be it. The second code is the reason the sheet gets
-- on a wall at all -- a poster asking people to scan for offers is ours,
-- and a poster that gets them online is theirs.
--
-- Its own table, not columns on businesses, and that is the whole point
-- of it. RLS is row-level: a policy that lets anybody read a business
-- row lets them read every column of it, so a wifi_password sitting on
-- businesses is a wifi_password served to anybody who asks the public
-- endpoint for one. Here, only the team can read it.
--
-- It is a password printed on a wall, so this is not a secret in the
-- sense a card number is. It is still theirs, and the poster is where
-- they decide to publish it.

create table if not exists public.business_wifi (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  ssid text not null check (length(btrim(ssid)) between 1 and 32),
  -- Null for an open network, which is the one case where no password
  -- is the right answer rather than a missing one.
  password text check (password is null or length(password) between 1 and 63),
  security text not null default 'WPA' check (security in ('WPA', 'WEP', 'nopass')),
  hidden boolean not null default false,
  updated_at timestamptz not null default timezone('utc', now()),

  -- A network with a password type and no password prints a code that
  -- fails on every phone in the room.
  constraint business_wifi_password_present
    check (security = 'nopass' or coalesce(btrim(password), '') <> '')
);

alter table public.business_wifi enable row level security;

create policy business_wifi_team_read on public.business_wifi
for select
to authenticated
using (public.is_business_member(business_id, 'member'));

create policy business_wifi_team_write on public.business_wifi
for all
to authenticated
using (public.is_business_member(business_id, 'admin'))
with check (public.is_business_member(business_id, 'admin'));

create or replace function public.touch_business_wifi()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists business_wifi_set_updated_at on public.business_wifi;
create trigger business_wifi_set_updated_at
before update on public.business_wifi
for each row execute function public.touch_business_wifi();

-- The layout that uses it. qr_codes_poster_layout_check has to learn
-- every new one or the poster cannot be saved -- which is how the
-- follow poster shipped unsaveable (20270311090000).
alter table public.qr_codes drop constraint if exists qr_codes_poster_layout_check;
alter table public.qr_codes add constraint qr_codes_poster_layout_check
  check (poster_layout in (
    'classic', 'code_first', 'bold', 'minimal', 'follow',
    'review_quiet', 'review_bold', 'review_code_first',
    'stamp_card', 'stamp_strip',
    'wifi'
  ));
