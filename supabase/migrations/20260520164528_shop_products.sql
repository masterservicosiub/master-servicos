-- Online shop tables for /servicos-graficos

create table if not exists public.shop_products (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  active boolean not null default true,
  sort_order int not null default 0,
  base_price_mode text not null default 'unit' check (base_price_mode in ('unit','area','fixed')),
  base_unit_price numeric not null default 0,
  base_area_price_per_m2 numeric not null default 0,
  base_fixed_price numeric not null default 0,
  base_min_price numeric not null default 0
);

create table if not exists public.shop_product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.shop_products(id) on delete cascade,
  image_url text not null,
  is_primary boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists shop_product_images_product_idx on public.shop_product_images(product_id);

create table if not exists public.shop_product_variations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.shop_products(id) on delete cascade,
  label text not null,
  price_mode text not null default 'unit' check (price_mode in ('unit','area','fixed')),
  unit_price numeric not null default 0,
  area_price_per_m2 numeric not null default 0,
  fixed_price numeric not null default 0,
  min_price numeric not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists shop_product_variations_product_idx on public.shop_product_variations(product_id);

alter table public.shop_products enable row level security;
alter table public.shop_product_images enable row level security;
alter table public.shop_product_variations enable row level security;

create policy "shop_products read public" on public.shop_products for select using (true);
create policy "shop_products write public" on public.shop_products for all using (true) with check (true);

create policy "shop_product_images read public" on public.shop_product_images for select using (true);
create policy "shop_product_images write public" on public.shop_product_images for all using (true) with check (true);

create policy "shop_product_variations read public" on public.shop_product_variations for select using (true);
create policy "shop_product_variations write public" on public.shop_product_variations for all using (true) with check (true);

-- Public storage bucket for product photos
insert into storage.buckets (id, name, public)
values ('shop-products', 'shop-products', true)
on conflict (id) do nothing;

do $$ begin
  create policy "shop-products public read" on storage.objects for select using (bucket_id = 'shop-products');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "shop-products public write" on storage.objects for insert with check (bucket_id = 'shop-products');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "shop-products public update" on storage.objects for update using (bucket_id = 'shop-products');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "shop-products public delete" on storage.objects for delete using (bucket_id = 'shop-products');
exception when duplicate_object then null; end $$;
