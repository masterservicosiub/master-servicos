create table if not exists public.stock_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  description text not null,
  product_url text not null default '',
  notes text not null default ''
);

grant select, insert, update, delete on public.stock_items to anon, authenticated;
grant all on public.stock_items to service_role;

alter table public.stock_items enable row level security;

create policy "stock_items read public" on public.stock_items for select using (true);
create policy "stock_items write public" on public.stock_items for all using (true) with check (true);

create index if not exists stock_items_created_idx on public.stock_items (created_at desc);
