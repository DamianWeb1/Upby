create table if not exists public.product_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  event_name text not null check (char_length(event_name) between 2 and 60),
  area text not null check (char_length(area) between 2 and 60),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists product_events_created_at_idx
  on public.product_events (created_at desc);

create index if not exists product_events_name_created_at_idx
  on public.product_events (event_name, created_at desc);

alter table public.product_events enable row level security;

revoke all on table public.product_events from anon, authenticated;
revoke all on sequence public.product_events_id_seq from anon, authenticated;

drop policy if exists "Users record own product events" on public.product_events;
create policy "Users record own product events"
  on public.product_events
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

grant insert on table public.product_events to authenticated;
grant usage, select on sequence public.product_events_id_seq to authenticated;

create or replace view public.product_metrics
with (security_invoker = true)
as
select
  date_trunc('day', created_at)::date as day,
  event_name,
  area,
  count(*)::bigint as events,
  count(distinct user_id)::bigint as users
from public.product_events
group by 1, 2, 3;

revoke all on table public.product_metrics from anon, authenticated;
