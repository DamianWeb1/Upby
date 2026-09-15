create table if not exists public.user_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_states enable row level security;
revoke all on table public.user_states from anon, authenticated;

drop policy if exists "Users can read their own state" on public.user_states;
create policy "Users can read their own state"
  on public.user_states for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own state" on public.user_states;
create policy "Users can create their own state"
  on public.user_states for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own state" on public.user_states;
create policy "Users can update their own state"
  on public.user_states for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own state" on public.user_states;
create policy "Users can delete their own state"
  on public.user_states for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.user_states to authenticated;
