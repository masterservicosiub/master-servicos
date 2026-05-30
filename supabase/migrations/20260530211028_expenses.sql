create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  description text not null,
  amount numeric not null default 0,
  expense_date date not null default current_date
);

grant select, insert, update, delete on public.expenses to anon, authenticated;
grant all on public.expenses to service_role;

alter table public.expenses enable row level security;

create policy "expenses read public" on public.expenses for select using (true);
create policy "expenses write public" on public.expenses for all using (true) with check (true);

create index if not exists expenses_date_idx on public.expenses (expense_date desc);
