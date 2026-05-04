create table if not exists public.media_videos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  youtube_id text not null,
  sort_order integer not null default 0,
  active boolean not null default true
);

create table if not exists public.media_radios (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  description text not null default '',
  stream_url text not null,
  sort_order integer not null default 0,
  active boolean not null default true
);

alter table public.media_videos enable row level security;
alter table public.media_radios enable row level security;

drop policy if exists "media_videos public read" on public.media_videos;
create policy "media_videos public read" on public.media_videos for select using (true);
drop policy if exists "media_radios public read" on public.media_radios;
create policy "media_radios public read" on public.media_radios for select using (true);

drop policy if exists "media_videos public insert" on public.media_videos;
create policy "media_videos public insert" on public.media_videos for insert with check (true);
drop policy if exists "media_videos public update" on public.media_videos;
create policy "media_videos public update" on public.media_videos for update using (true) with check (true);
drop policy if exists "media_videos public delete" on public.media_videos;
create policy "media_videos public delete" on public.media_videos for delete using (true);

drop policy if exists "media_radios public insert" on public.media_radios;
create policy "media_radios public insert" on public.media_radios for insert with check (true);
drop policy if exists "media_radios public update" on public.media_radios;
create policy "media_radios public update" on public.media_radios for update using (true) with check (true);
drop policy if exists "media_radios public delete" on public.media_radios;
create policy "media_radios public delete" on public.media_radios for delete using (true);

insert into public.media_videos (title, youtube_id, sort_order) values
  ('Conheça a Master Soluções', 'dQw4w9WgXcQ', 0),
  ('Serviços Residenciais', 'X1ILuKIM_WA', 1),
  ('Serviços Comerciais', '9bZkp7q19f0', 2)
on conflict do nothing;

insert into public.media_radios (name, description, stream_url, sort_order) values
  ('Antena 1', 'O melhor do Soft Rock', 'https://antenaone.crossradio.com.br/stream/1;', 0),
  ('Jovem Pan FM', 'Hits e variedades 24h', 'https://jpfm.jovempanfm.uol.com.br/jpfmsp.aac', 1)
on conflict do nothing;
