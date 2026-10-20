-- Fixed issues: errors that happened before their fix stop showing on the founder dashboard.
-- If the same error happens again after the fix, it shows up again.
create table if not exists public.error_fixes (
  id bigint generated always as identity primary key,
  label text not null,
  code text,
  match_message text,
  pattern text,
  fixed_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  constraint error_fixes_has_matcher check (code is not null or match_message is not null or pattern is not null)
);
alter table public.error_fixes enable row level security;
revoke all on table public.error_fixes from anon, authenticated;

create or replace function private.error_is_fixed(error_at timestamptz, details jsonb)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.error_fixes fixes
    where error_at < fixes.fixed_at
      and (fixes.code is null or coalesce(details ->> 'code', '') = fixes.code)
      and (fixes.match_message is null or coalesce(details ->> 'message', '') = fixes.match_message)
      and (fixes.pattern is null or concat_ws(' | ', details ->> 'message', details ->> 'hint', details ->> 'source') ~* fixes.pattern)
  );
$function$;
revoke all on function private.error_is_fixed(timestamptz, jsonb) from public, anon, authenticated, service_role;

create or replace function private.mark_error_fixed_privileged(error_code text, error_message text)
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  requesting_user uuid := (select auth.uid());
  cleared integer;
begin
  if requesting_user is null or not exists (select 1 from public.app_admins where user_id = requesting_user) then
    raise exception 'Founder access required' using errcode = '42501';
  end if;
  insert into public.error_fixes (label, code, match_message, created_by)
  values (left(coalesce(nullif(error_code, ''), 'error') || ': ' || coalesce(error_message, ''), 200), nullif(error_code, ''), coalesce(error_message, ''), requesting_user);
  select count(*) into cleared
  from public.product_events
  where event_name = 'client_error'
    and coalesce(metadata ->> 'code', '') = coalesce(nullif(error_code, ''), coalesce(metadata ->> 'code', ''))
    and coalesce(metadata ->> 'message', '') = coalesce(error_message, '');
  return cleared;
end;
$function$;
revoke all on function private.mark_error_fixed_privileged(text, text) from public, anon, authenticated, service_role;
grant execute on function private.mark_error_fixed_privileged(text, text) to authenticated, service_role;

create or replace function public.mark_error_fixed(error_code text, error_message text)
returns integer
language sql
set search_path = ''
as $function$
  select private.mark_error_fixed_privileged(error_code, error_message);
$function$;
revoke all on function public.mark_error_fixed(text, text) from public, anon, authenticated, service_role;
grant execute on function public.mark_error_fixed(text, text) to authenticated;

-- Dashboard: hide fixed issues, stop hiding JWT timing errors (now retried in the app).
create or replace function private.get_founder_dashboard_privileged()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  requesting_user uuid := (select auth.uid());
  result jsonb;
begin
  if requesting_user is null or not exists (
    select 1 from public.app_admins where user_id = requesting_user
  ) then
    raise exception 'Founder access required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'totalUsers', (select count(*) from auth.users),
    'signupsToday', (select count(*) from auth.users where created_at >= now() - interval '24 hours'),
    'completedOnboarding', (select count(*) from auth.users where raw_user_meta_data ->> 'onboarding_complete' = 'true'),
    'activeToday', (select count(distinct user_id) from public.product_events where created_at >= now() - interval '24 hours'),
    'activeSevenDays', (select count(distinct user_id) from public.product_events where created_at >= now() - interval '7 days'),
    'totalLogs', (select count(*) from public.logs),
    'logsToday', (select count(*) from public.logs where created_at >= now() - interval '24 hours'),
    'errorsToday', (
      select count(*)
      from public.product_events
      where event_name = 'client_error'
        and created_at >= now() - interval '24 hours'
        and not (coalesce(metadata ->> 'message', '') ~* '(transport failure|socket closed|heartbeat timeout|token has expired)')
        and not private.error_is_fixed(created_at, metadata)
    ),
    'feedbackTotal', (select count(*) from public.feedback),
    'dailyActivity', coalesce((
      select jsonb_agg(jsonb_build_object('day', day, 'users', users, 'events', events) order by day)
      from (
        select series.day::date as day, count(distinct events.user_id)::bigint as users, count(events.id)::bigint as events
        from generate_series(current_date - 6, current_date, interval '1 day') as series(day)
        left join public.product_events events on events.created_at >= series.day and events.created_at < series.day + interval '1 day'
        group by series.day
      ) activity
    ), '[]'::jsonb),
    'topFeatures', coalesce((
      select jsonb_agg(jsonb_build_object('event', event_name, 'count', event_count, 'users', user_count) order by event_count desc)
      from (
        select event_name, count(*)::bigint as event_count, count(distinct user_id)::bigint as user_count
        from public.product_events
        where created_at >= now() - interval '7 days' and event_name not in ('screen_view', 'client_error')
        group by event_name
        order by event_count desc
        limit 6
      ) features
    ), '[]'::jsonb),
    'userRegions', coalesce((
      select jsonb_agg(jsonb_build_object('country', country, 'users', users) order by users desc, country)
      from (
        select coalesce(nullif(profiles.country_code, ''), 'unknown') as country, count(*)::bigint as users
        from auth.users users
        left join public.profiles profiles on profiles.user_id = users.id
        group by coalesce(nullif(profiles.country_code, ''), 'unknown')
      ) regions
    ), '[]'::jsonb),
    'recentErrors', coalesce((
      select jsonb_agg(jsonb_build_object(
        'createdAt', created_at,
        'area', area,
        'code', coalesce(metadata ->> 'code', 'unknown_error'),
        'rawCode', coalesce(metadata ->> 'code', ''),
        'source', coalesce(metadata ->> 'source', area),
        'errorCode', coalesce(metadata ->> 'error_code', ''),
        'status', case when coalesce(metadata ->> 'status', '') ~ '^[0-9]+$' then (metadata ->> 'status')::int else 0 end,
        'message', coalesce(metadata ->> 'message', ''),
        'hint', coalesce(metadata ->> 'hint', '')
      ) order by created_at desc)
      from (
        select created_at, area, metadata
        from public.product_events
        where event_name = 'client_error'
          and created_at >= now() - interval '7 days'
          and not (coalesce(metadata ->> 'message', '') ~* '(transport failure|socket closed|heartbeat timeout|token has expired)')
          and not private.error_is_fixed(created_at, metadata)
        order by created_at desc
        limit 8
      ) errors
    ), '[]'::jsonb),
    'recentFeedback', coalesce((
      select jsonb_agg(jsonb_build_object('createdAt', created_at, 'name', display_name, 'type', type, 'message', message) order by created_at desc)
      from (
        select feedback.created_at, coalesce(profiles.display_name, 'UPBY member') as display_name, feedback.type, feedback.message
        from public.feedback feedback
        left join public.profiles profiles on profiles.user_id = feedback.user_id
        order by feedback.created_at desc
        limit 6
      ) messages
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$function$;

-- Issues fixed so far (fixed_at = when each fix went live)
insert into public.error_fixes (label, pattern, fixed_at) values
  ('JWT issued at future: app now retries', '(jwt issued at future|http 401 with no error body)', '2026-10-20 06:08:11+00'),
  ('Browser extension errors: now ignored', 'extension://', '2026-10-20 06:08:11+00');
insert into public.error_fixes (label, match_message, fixed_at) values
  ('[object Object] rejections: real message now recorded', '[object Object]', '2026-10-20 06:08:11+00');
