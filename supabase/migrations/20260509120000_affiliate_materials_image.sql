alter table public.affiliate_materials
  add column if not exists image_url text not null default '';
