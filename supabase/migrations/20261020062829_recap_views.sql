-- Which recap popups each member has seen or acted on, per account (not per device).
create table if not exists public.recap_views (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  period text not null check (period ~ '^[0-9]{4}(-(0[1-9]|1[0-2]))?$'),
  status text not null check (status in ('seen', 'viewed')),
  updated_at timestamptz not null default now(),
  primary key (user_id, period)
);
alter table public.recap_views enable row level security;
revoke all on table public.recap_views from anon;
grant select, insert, update on table public.recap_views to authenticated;
drop policy if exists "Members manage own recap views" on public.recap_views;
create policy "Members manage own recap views"
  on public.recap_views
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
