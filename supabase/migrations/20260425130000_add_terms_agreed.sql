-- Add terms_agreed column to affiliates table
alter table public.affiliates add column if not exists terms_agreed boolean not null default false;
