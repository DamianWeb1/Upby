create table if not exists public.monthly_goals (
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  target numeric(14,2) not null check (target > 0 and target < 1000000000000),
  updated_at timestamptz not null default now(),
  primary key (user_id, month)
);
alter table public.monthly_goals enable row level security;
revoke all on public.monthly_goals from public, anon, authenticated;
grant select, insert, update, delete on public.monthly_goals to authenticated;
create policy "Members manage own monthly goals" on public.monthly_goals
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
