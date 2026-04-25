alter table public.admin_settings add column if not exists username text;
alter table public.admin_settings add column if not exists email text;

update public.admin_settings 
set username = 'admin', email = 'masterservicos.iub@gmail.com' 
where id = 'main' and username is null;
