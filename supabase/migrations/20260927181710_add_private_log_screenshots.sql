alter table public.logs
  add column if not exists screenshot_path text;

create index if not exists logs_screenshot_path_idx
  on public.logs (screenshot_path)
  where screenshot_path is not null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'log-screenshots',
  'log-screenshots',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create schema if not exists private;
revoke create on schema private from public;
grant usage on schema private to anon, authenticated;

create or replace function private.log_screenshot_is_public(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.logs l
    join public.profiles p on p.user_id = l.user_id
    where l.screenshot_path = object_name
      and p.public_profile_enabled = true
      and p.show_logs = true
      and p.show_screenshots = true
      and (p.show_losses = true or l.type <> 'loss')
  );
$$;
revoke all on function private.log_screenshot_is_public(text) from public;
grant execute on function private.log_screenshot_is_public(text) to anon, authenticated;

drop policy if exists "Members view own log screenshots" on storage.objects;
create policy "Members view own log screenshots"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'log-screenshots'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Public views shared log screenshots" on storage.objects;
create policy "Public views shared log screenshots"
  on storage.objects for select
  to public
  using (
    bucket_id = 'log-screenshots'
    and private.log_screenshot_is_public(name)
  );

drop policy if exists "Members upload own log screenshots" on storage.objects;
create policy "Members upload own log screenshots"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'log-screenshots'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Members update own log screenshots" on storage.objects;
create policy "Members update own log screenshots"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'log-screenshots'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'log-screenshots'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Members delete own log screenshots" on storage.objects;
create policy "Members delete own log screenshots"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'log-screenshots'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

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
        'date_label', visible.date_label,
        'date_key', visible.date_key,
        'screenshot_path', case when p.show_screenshots then visible.screenshot_path else null end
      ) order by visible.id desc)
      from (
        select l.id, l.type, l.amount, l.category, l.title, l.date_label, l.date_key, l.screenshot_path
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
$$;
revoke all on function public.get_public_profile(text) from public;
grant execute on function public.get_public_profile(text) to anon, authenticated;
