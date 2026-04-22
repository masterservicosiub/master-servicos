alter table public.budget_services
  add column if not exists image_url text not null default '',
  add column if not exists description text not null default '';
