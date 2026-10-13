create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

alter function public.delete_my_account() set schema private;
alter function private.delete_my_account() rename to delete_my_account_privileged;

alter function public.get_founder_dashboard() set schema private;
alter function private.get_founder_dashboard() rename to get_founder_dashboard_privileged;

alter function public.get_friends_leaderboard(text) set schema private;
alter function private.get_friends_leaderboard(text) rename to get_friends_leaderboard_privileged;

alter function public.get_leaderboard(text) set schema private;
alter function private.get_leaderboard(text) rename to get_leaderboard_privileged;

alter function public.get_public_profile(text) set schema private;
alter function private.get_public_profile(text) rename to get_public_profile_privileged;

revoke all on function private.delete_my_account_privileged() from public, anon, authenticated, service_role;
revoke all on function private.get_founder_dashboard_privileged() from public, anon, authenticated, service_role;
revoke all on function private.get_friends_leaderboard_privileged(text) from public, anon, authenticated, service_role;
revoke all on function private.get_leaderboard_privileged(text) from public, anon, authenticated, service_role;
revoke all on function private.get_public_profile_privileged(text) from public, anon, authenticated, service_role;

grant execute on function private.delete_my_account_privileged() to authenticated, service_role;
grant execute on function private.get_founder_dashboard_privileged() to authenticated, service_role;
grant execute on function private.get_friends_leaderboard_privileged(text) to authenticated, service_role;
grant execute on function private.get_leaderboard_privileged(text) to authenticated, service_role;
grant execute on function private.get_public_profile_privileged(text) to anon, authenticated, service_role;

create function public.delete_my_account()
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.delete_my_account_privileged();
$$;

create function public.get_founder_dashboard()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select private.get_founder_dashboard_privileged();
$$;

create function public.get_friends_leaderboard(leaderboard_period text default 'this_month'::text)
returns table(
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
security invoker
set search_path = ''
as $$
  select *
  from private.get_friends_leaderboard_privileged(
    case when leaderboard_period = 'all_time' then 'all_time' else 'this_month' end
  );
$$;

create function public.get_leaderboard(leaderboard_period text default 'this_month'::text)
returns table(
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
security invoker
set search_path = ''
as $$
  select *
  from private.get_leaderboard_privileged(
    case when leaderboard_period = 'all_time' then 'all_time' else 'this_month' end
  );
$$;

create function public.get_public_profile(profile_username text)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select private.get_public_profile_privileged(trim(profile_username))
  where profile_username is not null
    and char_length(trim(profile_username)) between 1 and 64;
$$;

revoke all on function public.delete_my_account() from public, anon, authenticated, service_role;
revoke all on function public.get_founder_dashboard() from public, anon, authenticated, service_role;
revoke all on function public.get_friends_leaderboard(text) from public, anon, authenticated, service_role;
revoke all on function public.get_leaderboard(text) from public, anon, authenticated, service_role;
revoke all on function public.get_public_profile(text) from public, anon, authenticated, service_role;

grant execute on function public.delete_my_account() to authenticated;
grant execute on function public.get_founder_dashboard() to authenticated;
grant execute on function public.get_friends_leaderboard(text) to authenticated;
grant execute on function public.get_leaderboard(text) to authenticated;
grant execute on function public.get_public_profile(text) to anon, authenticated;

drop policy if exists "No direct app admin access" on public.app_admins;
create policy "No direct app admin access"
on public.app_admins
as restrictive
for all
to public
using (false)
with check (false);

alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

notify pgrst, 'reload schema';
