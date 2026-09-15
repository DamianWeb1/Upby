create table if not exists public.logs (
  user_id uuid not null references auth.users(id) on delete cascade,
  id bigint not null,
  type text not null check (type in ('win', 'loss')),
  amount numeric(14, 2) not null check (amount >= 0),
  category text not null,
  title text not null,
  date_label text not null,
  date_key date,
  note text,
  screenshot boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists logs_user_date_idx
  on public.logs (user_id, date_key desc);

alter table public.logs enable row level security;
revoke all on table public.logs from anon, authenticated;

drop policy if exists "Users manage own logs" on public.logs;
create policy "Users manage own logs"
  on public.logs for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.logs to authenticated;
