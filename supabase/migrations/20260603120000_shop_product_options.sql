alter table public.shop_products
  add column if not exists option1_name text not null default '',
  add column if not exists option1_values text[] not null default '{}',
  add column if not exists option2_name text not null default '',
  add column if not exists option2_values text[] not null default '{}';
