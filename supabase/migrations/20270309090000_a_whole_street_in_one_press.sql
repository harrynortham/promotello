-- A street, not a page at a time.
--
-- Pages first works, and then it asks for ten clicks. Ten leads were
-- sitting ready on Gloucester Road with a description and an address
-- each, and the only thing between them and a filled directory was
-- opening ten tabs. "A whole street fills in a day" was not true of a
-- button you press once per shop.
--
-- Two functions, and only one of them decides anything:
--
--   lead_pages_to_publish()  read-only, for the confirmation. What is
--                            about to happen and what will be skipped.
--   list_lead_pages()        does it, by calling list_lead_page() per
--                            business, which is still the only thing
--                            that sets listed_at and still refuses a
--                            page with nothing on it.
--
-- The readiness columns here are a warning, not a rule. list_lead_page()
-- re-checks every one of them and raises if it disagrees, and the
-- failure comes back as that row's reason rather than taking the rest
-- of the street down with it.

create or replace function public.lead_pages_to_publish()
returns table (
  lead_business_id uuid,
  lead_name text,
  ready boolean,
  reason text
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_platform_admin() then
    raise exception using errcode = '42501', message = 'Admin access is required';
  end if;

  return query
  select
    b.id,
    b.name,
    has_words and has_place,
    case
      when not has_words and not has_place then 'No description and no address'
      when not has_words then 'No description'
      when not has_place then 'No address'
    end
  from public.businesses b
  join public.business_previews p on p.business_id = b.id
  cross join lateral (
    select
      coalesce(btrim(b.description), '') <> '' as has_words,
      exists (select 1 from public.business_locations l where l.business_id = b.id) as has_place
  ) checks
  where b.approval_status = 'pending'
    and b.listed_at is null
    and b.closed_at is null
    and b.demo_at is null
    and p.claimed_at is null
  order by b.name;
end;
$$;

comment on function public.lead_pages_to_publish() is
  'Read-only: the unclaimed pages a bulk publish would put up, and why it would skip the rest.';

revoke all on function public.lead_pages_to_publish() from public, anon;
grant execute on function public.lead_pages_to_publish() to authenticated;

-- Publishing the street. One row back per business, so the page can say
-- what went up and what did not, by name.
--
-- Each one is its own block: a business that list_lead_page() refuses
-- comes back as a reason beside its name, and the other nine still go
-- live. A loop that threw would publish nothing and say nothing about
-- which shop was the problem.
create or replace function public.list_lead_pages()
returns table (
  lead_business_id uuid,
  lead_name text,
  published boolean,
  reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate record;
begin
  if not public.is_platform_admin() then
    raise exception using errcode = '42501', message = 'Admin access is required';
  end if;

  for candidate in
    select b.id as id, b.name as name
    from public.businesses b
    join public.business_previews p on p.business_id = b.id
    where b.approval_status = 'pending'
      and b.listed_at is null
      and b.closed_at is null
      and b.demo_at is null
      and p.claimed_at is null
    order by b.name
  loop
    lead_business_id := candidate.id;
    lead_name := candidate.name;

    begin
      perform public.list_lead_page(candidate.id);

      published := true;
      reason := null;
    exception when others then
      published := false;
      reason := sqlerrm;
    end;

    return next;
  end loop;
end;
$$;

comment on function public.list_lead_pages() is
  'Publishes every unclaimed page that is ready. One row back per business, so the page can name what was skipped and why.';

revoke all on function public.list_lead_pages() from public, anon;
grant execute on function public.list_lead_pages() to authenticated;
