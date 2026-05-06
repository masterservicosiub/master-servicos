-- Add 'kind' column to distinguish residencial vs grafico budget services
alter table public.budget_services
  add column if not exists kind text not null default 'residencial';

create index if not exists budget_services_kind_idx on public.budget_services (kind);
