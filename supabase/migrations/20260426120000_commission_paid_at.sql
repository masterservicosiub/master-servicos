-- Track when an affiliate commission has been paid out
alter table if exists public.orders
  add column if not exists commission_paid_at timestamptz;

create index if not exists idx_orders_commission_paid_at
  on public.orders(commission_paid_at);
