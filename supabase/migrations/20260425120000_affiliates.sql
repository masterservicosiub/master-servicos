-- Affiliates table for cashback referral program
create table if not exists public.affiliates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null,
  cpf text not null unique,
  address text not null default '',
  phone text not null default '',
  email text not null default '',
  pix_key text not null,
  username text not null unique,
  password_hash text not null,
  referral_code text not null unique,
  active boolean not null default true
);

alter table public.affiliates enable row level security;

create policy "Allow read affiliates" on public.affiliates for select using (true);
create policy "Allow insert affiliates" on public.affiliates for insert with check (true);
create policy "Allow update affiliates" on public.affiliates for update using (true);
create policy "Allow delete affiliates" on public.affiliates for delete using (true);

alter table public.orders add column if not exists affiliate_code text;
create index if not exists orders_affiliate_code_idx on public.orders(affiliate_code);
