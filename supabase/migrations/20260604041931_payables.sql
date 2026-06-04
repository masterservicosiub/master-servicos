create table if not exists public.payables (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  description text not null,
  amount numeric not null default 0,
  due_date date not null default current_date,
  paid boolean not null default false,
  recurring boolean not null default false
);

grant select, insert, update, delete on public.payables to anon, authenticated;
grant all on public.payables to service_role;

alter table public.payables enable row level security;

create policy "payables read public" on public.payables for select using (true);
create policy "payables write public" on public.payables for all using (true) with check (true);

create index if not exists payables_due_idx on public.payables (due_date desc);
