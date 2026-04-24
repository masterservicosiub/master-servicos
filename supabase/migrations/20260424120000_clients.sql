-- Clients table for admin client registry
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  notes text not null default ''
);

alter table public.clients enable row level security;

-- Public access (matches existing tables in this project which use anon key for admin panel)
create policy "Allow read clients" on public.clients for select using (true);
create policy "Allow insert clients" on public.clients for insert with check (true);
create policy "Allow update clients" on public.clients for update using (true);
create policy "Allow delete clients" on public.clients for delete using (true);
