alter table public.profiles
  add column if not exists bio text not null default '',
  add column if not exists x_profile text not null default '',
  add column if not exists show_totals boolean not null default true,
  add column if not exists show_logs boolean not null default true,
  add column if not exists show_losses boolean not null default true,
  add column if not exists show_screenshots boolean not null default false;

create table if not exists public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  followed_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  check (follower_id <> followed_id)
);

create index if not exists follows_followed_idx on public.follows (followed_id);
alter table public.follows enable row level security;
revoke all on table public.follows from anon, authenticated;

drop policy if exists "Members read follows" on public.follows;
create policy "Members read follows"
  on public.follows for select to authenticated
  using (true);

drop policy if exists "Users follow from own account" on public.follows;
create policy "Users follow from own account"
  on public.follows for insert to authenticated
  with check ((select auth.uid()) = follower_id);

drop policy if exists "Users unfollow from own account" on public.follows;
create policy "Users unfollow from own account"
  on public.follows for delete to authenticated
  using ((select auth.uid()) = follower_id);

grant select, insert, delete on public.follows to authenticated;

create or replace function public.get_public_profile(profile_username text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'user_id', p.user_id,
    'display_name', p.display_name,
    'username', p.username,
    'avatar_url', p.avatar_url,
    'bio', p.bio,
    'x_profile', p.x_profile,
    'member_since', extract(year from p.created_at)::int,
    'show_totals', p.show_totals,
    'wins', case when p.show_totals then coalesce(t.wins, 0) else null end,
    'losses', case when p.show_totals and p.show_losses then coalesce(t.losses, 0) else null end,
    'net', case when p.show_totals then coalesce(t.wins, 0) - coalesce(t.losses, 0) else null end,
    'streak', coalesce(t.streak, 0),
    'following_count', (select count(*) from public.follows f where f.follower_id = p.user_id),
    'follower_count', (select count(*) from public.follows f where f.followed_id = p.user_id),
    'logs', case when p.show_logs then coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', visible.id,
        'type', visible.type,
        'amount', case when p.show_totals then visible.amount else null end,
        'category', visible.category,
        'title', visible.title,
        'date_label', visible.date_label
      ) order by visible.id desc)
      from (
        select l.id, l.type, l.amount, l.category, l.title, l.date_label
        from public.logs l
        where l.user_id = p.user_id
          and (p.show_losses or l.type <> 'loss')
        order by l.id desc
        limit 10
      ) visible
    ), '[]'::jsonb) else '[]'::jsonb end
  )
  from public.profiles p
  left join lateral (
    select
      coalesce(sum(l.amount) filter (where l.type = 'win'), 0) as wins,
      coalesce(sum(l.amount) filter (where l.type = 'loss'), 0) as losses,
      count(distinct coalesce(l.date_key, l.created_at::date)) as streak
    from public.logs l
    where l.user_id = p.user_id
      and coalesce(l.date_key, l.created_at::date) >= date_trunc('month', current_date)::date
  ) t on true
  where lower(p.username) = lower(profile_username)
  limit 1;
$$;

revoke all on function public.get_public_profile(text) from public;
grant execute on function public.get_public_profile(text) to anon, authenticated;

create or replace function public.get_friends_leaderboard(leaderboard_period text default 'this_month')
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
      coalesce(sum(case when l.type = 'win' then l.amount else -l.amount end) filter (
        where leaderboard_period = 'all_time'
          or coalesce(l.date_key, l.created_at::date) >= date_trunc('month', current_date)::date
      ), 0) as net,
      count(distinct coalesce(l.date_key, l.created_at::date)) filter (
        where leaderboard_period = 'all_time'
          or coalesce(l.date_key, l.created_at::date) >= date_trunc('month', current_date)::date
      ) as streak,
      p.created_at
    from public.follows f
    join public.profiles p on p.user_id = f.followed_id
    left join public.logs l on l.user_id = p.user_id
    where f.follower_id = (select auth.uid())
      and p.leaderboard_enabled = true
    group by p.user_id, p.display_name, p.username, p.avatar_url, p.created_at
  )
  select
    dense_rank() over (order by totals.net desc, totals.created_at asc),
    totals.user_id,
    totals.display_name,
    totals.username,
    totals.avatar_url,
    totals.net,
    totals.streak
  from totals
  order by net desc, created_at asc
  limit 100;
$$;

revoke all on function public.get_friends_leaderboard(text) from public, anon;
grant execute on function public.get_friends_leaderboard(text) to authenticated;
