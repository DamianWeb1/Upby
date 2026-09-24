create or replace function public.get_founder_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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
    'errorsToday', (select count(*) from public.product_events where event_name = 'client_error' and created_at >= now() - interval '24 hours'),
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
    'recentErrors', coalesce((
      select jsonb_agg(jsonb_build_object(
        'createdAt', created_at,
        'area', area,
        'code', coalesce(metadata ->> 'code', 'unknown_error'),
        'source', coalesce(metadata ->> 'source', area),
        'errorCode', coalesce(metadata ->> 'error_code', ''),
        'status', case when coalesce(metadata ->> 'status', '') ~ '^[0-9]+$' then (metadata ->> 'status')::int else 0 end,
        'message', coalesce(metadata ->> 'message', ''),
        'hint', coalesce(metadata ->> 'hint', '')
      ) order by created_at desc)
      from (
        select created_at, area, metadata
        from public.product_events
        where event_name = 'client_error' and created_at >= now() - interval '7 days'
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
$$;

revoke all on function public.get_founder_dashboard() from public, anon;
grant execute on function public.get_founder_dashboard() to authenticated;
