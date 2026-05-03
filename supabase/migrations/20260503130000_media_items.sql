create table if not exists public.media_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('video', 'radio')),
  title text not null,
  description text not null default '',
  url text not null,
  sort_order integer not null default 0,
  active boolean not null default true
);

alter table public.media_items enable row level security;

drop policy if exists "Public can read active media" on public.media_items;
create policy "Public can read active media"
on public.media_items
for select
using (active = true);

drop policy if exists "Anyone can manage media" on public.media_items;
create policy "Anyone can manage media"
on public.media_items
for all
using (true)
with check (true);

create index if not exists media_items_kind_sort_idx
  on public.media_items(kind, sort_order);
