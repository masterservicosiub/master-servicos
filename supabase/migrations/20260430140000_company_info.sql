-- Add company contact info columns to admin_settings
alter table public.admin_settings
  add column if not exists company_phone text,
  add column if not exists company_whatsapp text,
  add column if not exists company_email text,
  add column if not exists company_address text,
  add column if not exists company_cnpj text;

update public.admin_settings
set
  company_phone = coalesce(company_phone, '(64) 9 9264-2950'),
  company_whatsapp = coalesce(company_whatsapp, '5564992642950'),
  company_email = coalesce(company_email, 'masterservicos.iub@gmail.com'),
  company_address = coalesce(company_address, 'Itumbiara/GO - Setor Planalto - CEP 75533-250'),
  company_cnpj = coalesce(company_cnpj, '61.906.390/0001-58')
where id = 'main';
