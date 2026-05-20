alter table public.shop_products
  add column if not exists download_url text not null default '',
  add column if not exists download_label text not null default '';
