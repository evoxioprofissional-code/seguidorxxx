-- ===========================================================================
-- API de revenda (padrão SMM v2): chaves de API + código numérico de serviço.
-- ===========================================================================

-- Código numérico público do serviço (revendedores usam inteiro, não UUID).
create sequence if not exists public.service_code_seq start 101;
alter table public.services add column if not exists code integer unique;

-- Backfill dos serviços existentes (ordem estável por criação).
update public.services s
  set code = nextval('public.service_code_seq')
  where code is null;

alter table public.services
  alter column code set default nextval('public.service_code_seq');

-- Origem do pedido (web x api de revenda).
alter table public.orders
  add column if not exists source text not null default 'web'
  check (source in ('web','api'));

-- Chaves de API (uma ou mais por usuário/revendedor).
create table if not exists public.api_keys (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  key          text not null unique,
  label        text,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz
);
create index if not exists idx_api_keys_user on public.api_keys(user_id);

alter table public.api_keys enable row level security;
create policy "api_keys_select_own" on public.api_keys
  for select using (user_id = auth.uid() or public.is_admin());
create policy "api_keys_admin_all" on public.api_keys
  for all using (public.is_admin()) with check (public.is_admin());

-- Desconto global pra revendedores (0 = mesmo preço do varejo).
insert into public.app_settings(key, value) values
  ('reseller_discount_percentage', '0'::jsonb)
on conflict (key) do nothing;
