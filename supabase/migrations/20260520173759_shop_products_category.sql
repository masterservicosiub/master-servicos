alter table public.shop_products add column if not exists category text not null default '';
create index if not exists shop_products_category_idx on public.shop_products(category);
