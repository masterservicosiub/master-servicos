create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  code text not null unique,
  discount_type text not null check (discount_type in ('percent','fixed')),
  discount_value numeric not null default 0,
  applies_to text not null default 'all' check (applies_to in ('all','service')),
  service_id uuid references public.budget_services(id) on delete cascade,
  active boolean not null default true
);

alter table public.coupons enable row level security;

create policy "Anyone can read coupons" on public.coupons for select using (true);
create policy "Anyone can insert coupons" on public.coupons for insert with check (true);
create policy "Anyone can update coupons" on public.coupons for update using (true);
create policy "Anyone can delete coupons" on public.coupons for delete using (true);

create index if not exists coupons_code_idx on public.coupons (lower(code));
