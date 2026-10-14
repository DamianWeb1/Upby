-- Match the single policy production already uses. Same access: members manage only their own state.
drop policy if exists "Users can read their own state" on public.user_states;
drop policy if exists "Users can create their own state" on public.user_states;
drop policy if exists "Users can update their own state" on public.user_states;
drop policy if exists "Users can delete their own state" on public.user_states;
drop policy if exists "Users manage own state" on public.user_states;

create policy "Users manage own state"
  on public.user_states
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
