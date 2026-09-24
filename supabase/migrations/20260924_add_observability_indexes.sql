create index if not exists feedback_user_id_idx
  on public.feedback (user_id);

create index if not exists product_events_user_id_idx
  on public.product_events (user_id);
