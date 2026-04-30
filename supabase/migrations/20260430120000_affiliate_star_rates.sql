-- Cashback percent per star tier for top affiliates
create table if not exists public.affiliate_star_rates (
  stars int primary key check (stars between 1 and 5),
  percent numeric not null default 1.0,
  updated_at timestamptz not null default now()
);

alter table public.affiliate_star_rates enable row level security;

drop policy if exists "Anyone can read star rates" on public.affiliate_star_rates;
create policy "Anyone can read star rates"
  on public.affiliate_star_rates for select
  using (true);

drop policy if exists "Anyone can insert star rates" on public.affiliate_star_rates;
create policy "Anyone can insert star rates"
  on public.affiliate_star_rates for insert
  with check (true);

drop policy if exists "Anyone can update star rates" on public.affiliate_star_rates;
create policy "Anyone can update star rates"
  on public.affiliate_star_rates for update
  using (true) with check (true);

insert into public.affiliate_star_rates (stars, percent) values
  (1, 1.0),
  (2, 1.5),
  (3, 2.0),
  (4, 2.5),
  (5, 3.0)
on conflict (stars) do nothing;
