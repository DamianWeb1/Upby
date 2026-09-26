-- Pure date helper. It does not read user data.
create or replace function public.log_day_streak(log_days date[], as_of date)
returns bigint language sql immutable security invoker set search_path = ''
as $$
with days as (
 select distinct day from unnest(log_days) as d(day) where day <= as_of
), islands as (
 select day, day + row_number() over (order by day desc)::int as island,
 max(day) over () as latest from days
)
select count(*) from islands where latest >= as_of - 1 and island = latest + 1;
$$;
revoke all on function public.log_day_streak(date[], date) from public;
grant execute on function public.log_day_streak(date[], date) to anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_friends_leaderboard(leaderboard_period text DEFAULT 'this_month'::text)
 RETURNS TABLE(rank bigint, user_id uuid, display_name text, username text, avatar_url text, net numeric, streak bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  order by net desc, created_at asc
  limit 100;
$function$;

CREATE OR REPLACE FUNCTION public.get_leaderboard(leaderboard_period text DEFAULT 'this_month'::text)
 RETURNS TABLE(rank bigint, user_id uuid, display_name text, username text, avatar_url text, net numeric, streak bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  order by rank, totals.created_at
  limit 100;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_profile(profile_username text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
      coalesce(sum(l.amount) filter (where l.type = 'win' and l.date_key >= date_trunc('month', current_date)::date and l.date_key < (date_trunc('month', current_date) + interval '1 month')::date), 0) as wins,
      coalesce(sum(l.amount) filter (where l.type = 'loss' and l.date_key >= date_trunc('month', current_date)::date and l.date_key < (date_trunc('month', current_date) + interval '1 month')::date), 0) as losses,
      public.log_day_streak(array_agg(l.date_key), current_date) as streak
    from public.logs l
    where l.user_id = p.user_id
  ) t on true
  where lower(p.username) = lower(profile_username)
    and (p.public_profile_enabled or (select auth.uid()) = p.user_id)
  limit 1;
$function$;

