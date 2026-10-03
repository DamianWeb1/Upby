alter table public.logs
  add column if not exists merchant text,
  add column if not exists payment_method text;

alter table public.logs
  drop constraint if exists logs_merchant_length_check;

alter table public.logs
  add constraint logs_merchant_length_check
  check (merchant is null or char_length(merchant) <= 120);

alter table public.logs
  drop constraint if exists logs_payment_method_check;

alter table public.logs
  add constraint logs_payment_method_check
  check (
    payment_method is null
    or payment_method in ('card', 'bank_transfer', 'crypto', 'cash', 'other')
  );

comment on column public.logs.merchant is 'Optional payee for loss entries.';
comment on column public.logs.payment_method is 'Optional payment method for loss entries.';

notify pgrst, 'reload schema';
