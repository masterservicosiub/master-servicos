create table if not exists public.affiliate_materials (
  id text primary key,
  name text not null,
  description text not null default '',
  price numeric(10,2) not null default 0,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.affiliate_materials enable row level security;

create policy "public can read affiliate_materials"
  on public.affiliate_materials for select using (true);

create policy "public can update affiliate_materials"
  on public.affiliate_materials for update using (true) with check (true);

create policy "public can insert affiliate_materials"
  on public.affiliate_materials for insert with check (true);

insert into public.affiliate_materials (id, name, description, price)
values
  ('cartao', 'Cartão de Visita', 'Pacote de 100 cartões 8,5x4,5cm personalizados com seu QR Code', 0),
  ('panfleto', 'Panfleto', 'Pacote de 100 panfletos A5 personalizados com seu QR Code', 0)
on conflict (id) do nothing;

create table if not exists public.affiliate_material_orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  affiliate_id uuid references public.affiliates(id) on delete cascade,
  affiliate_code text not null,
  affiliate_name text not null,
  material_id text not null,
  material_name text not null,
  quantity integer not null default 1,
  unit_price numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  status text not null default 'Pendente',
  notes text not null default ''
);

alter table public.affiliate_material_orders enable row level security;

create policy "public can read affiliate_material_orders"
  on public.affiliate_material_orders for select using (true);
create policy "public can insert affiliate_material_orders"
  on public.affiliate_material_orders for insert with check (true);
create policy "public can update affiliate_material_orders"
  on public.affiliate_material_orders for update using (true) with check (true);
create policy "public can delete affiliate_material_orders"
  on public.affiliate_material_orders for delete using (true);
