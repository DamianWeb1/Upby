create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('idea', 'bug', 'other')),
  message text not null check (char_length(message) between 3 and 600),
  created_at timestamptz not null default now()
);

create index if not exists feedback_created_at_idx
  on public.feedback (created_at desc);

alter table public.feedback enable row level security;
revoke all on table public.feedback from anon, authenticated;

drop policy if exists "Users send own feedback" on public.feedback;
create policy "Users send own feedback"
  on public.feedback for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

grant insert on public.feedback to authenticated;
grant usage, select on sequence public.feedback_id_seq to authenticated;

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user uuid := (select auth.uid());
begin
  if requesting_user is null then
    raise exception 'Not authenticated';
  end if;

  delete from auth.users where id = requesting_user;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
