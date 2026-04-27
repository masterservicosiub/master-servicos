-- Extend clients table to support self-service accounts
alter table public.clients add column if not exists cpf text not null default '';
alter table public.clients add column if not exists password_hash text not null default '';

create unique index if not exists clients_email_unique on public.clients ((lower(email))) where email <> '';
create unique index if not exists clients_cpf_unique on public.clients (cpf) where cpf <> '';
