-- Add category column to budget_services
alter table public.budget_services
  add column if not exists category text not null default '';

create index if not exists budget_services_category_idx on public.budget_services (category);
