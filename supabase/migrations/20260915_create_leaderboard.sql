create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  username text not null,
  avatar_url text,
  leaderboard_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));

alter table public.profiles enable row level security;
revoke all on table public.profiles from anon, authenticated;

drop policy if exists "Members read leaderboard profiles" on public.profiles;
create policy "Members read leaderboard profiles"
  on public.profiles for select
  to authenticated
  using (leaderboard_enabled or (select auth.uid()) = user_id);

drop policy if exists "Users create own profile" on public.profiles;
create policy "Users create own profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete own profile" on public.profiles;
create policy "Users delete own profile"
  on public.profiles for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.profiles to authenticated;

create or replace function public.get_leaderboard(leaderboard_period text default 'this_month')
returns table (
  rank bigint,
  user_id uuid,
  display_name text,
  username text,
  avatar_url text,
  net numeric,
  streak bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with totals as (
    select
      p.user_id,
      p.display_name,
      p.username,
      p.avatar_url,
      coalesce(sum(
        case when l.type = 'win' then l.amount else -l.amount end
      ) filter (
        where leaderboard_period = 'all_time'
          or coalesce(l.date_key, l.created_at::date) >= date_trunc('month', current_date)::date
      ), 0) as net,
      count(distinct coalesce(l.date_key, l.created_at::date)) filter (
        where leaderboard_period = 'all_time'
          or coalesce(l.date_key, l.created_at::date) >= date_trunc('month', current_date)::date
      ) as streak,
      p.created_at
    from public.profiles p
    left join public.logs l on l.user_id = p.user_id
    where p.leaderboard_enabled = true
    group by p.user_id, p.display_name, p.username, p.avatar_url, p.created_at
  )
  select
    dense_rank() over (order by totals.net desc, totals.created_at asc) as rank,
    totals.user_id,
    totals.display_name,
    totals.username,
    totals.avatar_url,
    totals.net,
    totals.streak
  from totals
  order by rank, totals.created_at
  limit 100;
$$;

revoke all on function public.get_leaderboard(text) from public, anon;
grant execute on function public.get_leaderboard(text) to authenticated;
