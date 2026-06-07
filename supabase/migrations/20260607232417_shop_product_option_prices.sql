alter table public.shop_products
  add column if not exists option1_prices numeric[] not null default '{}',
  add column if not exists option2_prices numeric[] not null default '{}';
