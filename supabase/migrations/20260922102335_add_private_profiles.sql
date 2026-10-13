alter table public.profiles
  add column if not exists public_profile_enabled boolean not null default true;

create or replace function public.enforce_private_profile_settings()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not new.public_profile_enabled then
    new.leaderboard_enabled := false;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_private_profile_settings on public.profiles;
create trigger enforce_private_profile_settings
before insert or update on public.profiles
for each row execute function public.enforce_private_profile_settings();

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
    and (p.public_profile_enabled or (select auth.uid()) = p.user_id)
  limit 1;
$$;

revoke all on function public.get_public_profile(text) from public;
grant execute on function public.get_public_profile(text) to anon, authenticated;
