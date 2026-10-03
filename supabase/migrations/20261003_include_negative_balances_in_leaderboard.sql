create or replace function public.get_leaderboard(leaderboard_period text default 'this_month'::text)
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
          or (l.date_key >= date_trunc('month', current_date)::date and l.date_key < (date_trunc('month', current_date) + interval '1 month')::date)
      ), 0) as net,
      public.log_day_streak(array_agg(l.date_key), current_date) as streak,
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
  where totals.net <> 0
  order by rank, totals.created_at
  limit 100;
$$;

revoke all on function public.get_leaderboard(text) from public, anon;
grant execute on function public.get_leaderboard(text) to authenticated;

create or replace function public.get_friends_leaderboard(leaderboard_period text default 'this_month'::text)
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
          or (l.date_key >= date_trunc('month', current_date)::date and l.date_key < (date_trunc('month', current_date) + interval '1 month')::date)
      ), 0) as net,
      public.log_day_streak(array_agg(l.date_key), current_date) as streak,
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
  where totals.net <> 0
  order by net desc, created_at asc
  limit 100;
$$;

revoke all on function public.get_friends_leaderboard(text) from public, anon;
grant execute on function public.get_friends_leaderboard(text) to authenticated;
