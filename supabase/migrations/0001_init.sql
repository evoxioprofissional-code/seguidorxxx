-- ===========================================================================
-- SeguidorX — Schema inicial
-- PostgreSQL / Supabase. Dinheiro sempre NUMERIC (nunca float).
-- ===========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ID público de pedido: SX-100000, SX-100001, ...
create sequence if not exists public.seguidorx_order_seq start 100000;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text,
  email       text,
  role        text not null default 'user' check (role in ('user','admin')),
  status      text not null default 'active' check (status in ('active','blocked')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- is_admin(): usada em policies. SECURITY DEFINER evita recursão de RLS.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- wallets
-- ---------------------------------------------------------------------------
create table if not exists public.wallets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references auth.users(id) on delete cascade,
  balance     numeric(14,4) not null default 0 check (balance >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_wallets_updated before update on public.wallets
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- wallet_transactions
-- ---------------------------------------------------------------------------
create table if not exists public.wallet_transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  type          text not null check (type in ('deposit','purchase','refund','adjustment')),
  amount        numeric(14,4) not null,           -- positivo credita, negativo debita
  balance_after numeric(14,4),
  description   text,
  reference_id  text,                             -- id do pedido/pagamento relacionado
  created_at    timestamptz not null default now()
);
create index if not exists idx_wtx_user on public.wallet_transactions(user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- provider_services — espelho cru da API do fornecedor
-- ---------------------------------------------------------------------------
create table if not exists public.provider_services (
  id                  uuid primary key default gen_random_uuid(),
  provider            text not null default 'barato_sociais',
  provider_service_id text not null,
  name                text,
  category            text,
  type                text,
  provider_rate       numeric(14,5),              -- taxa crua da API (por 1000, em USD)
  min_quantity        integer,
  max_quantity        integer,
  has_refill          boolean not null default false,
  has_cancel          boolean not null default false,
  raw_data            jsonb,
  last_synced_at      timestamptz not null default now(),
  unique (provider, provider_service_id)
);

-- ---------------------------------------------------------------------------
-- services — o que o SeguidorX vende
-- ---------------------------------------------------------------------------
create table if not exists public.services (
  id                        uuid primary key default gen_random_uuid(),
  provider                  text not null default 'barato_sociais',
  provider_service_id       text not null,
  custom_name               text,
  custom_description        text,
  category                  text,                 -- Seguidores, Curtidas, ...
  platform                  text,                 -- instagram, tiktok, ...
  provider_cost             numeric(14,4) not null default 0,  -- custo por 1000 em BRL
  sale_price                numeric(14,4) not null default 0,  -- preço de venda por 1000 em BRL
  pricing_mode              text not null default 'markup' check (pricing_mode in ('manual','markup','multiplier')),
  markup_percentage         numeric(8,2) not null default 100,
  multiplier                numeric(8,3) not null default 2,
  minimum_margin_percentage numeric(8,2) not null default 0,
  min_quantity              integer not null default 10,
  max_quantity              integer not null default 100000,
  active                    boolean not null default false,
  featured                  boolean not null default false,
  has_refill                boolean not null default false,
  has_cancel                boolean not null default false,
  pricing_warning           boolean not null default false,  -- venda < custo
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  unique (provider, provider_service_id)
);
create trigger trg_services_updated before update on public.services
  for each row execute function public.set_updated_at();
create index if not exists idx_services_active on public.services(active, platform, category);

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  public_order_id   text not null unique default ('SX-' || nextval('public.seguidorx_order_seq')),
  user_id           uuid not null references auth.users(id) on delete cascade,
  service_id        uuid references public.services(id),
  provider          text not null default 'barato_sociais',
  provider_order_id text,
  link              text not null,
  quantity          integer not null,
  customer_price    numeric(14,4) not null,
  provider_cost     numeric(14,4) not null default 0,
  profit            numeric(14,4) not null default 0,
  status            text not null default 'pending'
                    check (status in ('pending','submitting','processing','completed','partial','canceled','failed','refunded')),
  provider_status   text,
  start_count       integer,
  remains           integer,
  has_refill        boolean not null default false,
  has_cancel        boolean not null default false,
  service_name      text,                         -- snapshot do nome exibido
  idempotency_key   text unique,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  completed_at      timestamptz
);
create trigger trg_orders_updated before update on public.orders
  for each row execute function public.set_updated_at();
create index if not exists idx_orders_user on public.orders(user_id, created_at desc);
create index if not exists idx_orders_status on public.orders(status);

-- ---------------------------------------------------------------------------
-- order_refills
-- ---------------------------------------------------------------------------
create table if not exists public.order_refills (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid not null references public.orders(id) on delete cascade,
  provider_refill_id text,
  status             text not null default 'pending',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create trigger trg_refills_updated before update on public.order_refills
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  provider            text not null default 'mock',
  external_payment_id text,
  amount              numeric(14,4) not null check (amount > 0),
  status              text not null default 'pending'
                      check (status in ('pending','approved','expired','canceled','refunded')),
  qr_code             text,
  qr_code_base64      text,
  expires_at          timestamptz,
  created_at          timestamptz not null default now(),
  approved_at         timestamptz
);
create index if not exists idx_payments_user on public.payments(user_id, created_at desc);
create index if not exists idx_payments_external on public.payments(provider, external_payment_id);

-- ---------------------------------------------------------------------------
-- provider_logs — nunca guardar a API KEY aqui (sanitizado na app)
-- ---------------------------------------------------------------------------
create table if not exists public.provider_logs (
  id            uuid primary key default gen_random_uuid(),
  provider      text not null default 'barato_sociais',
  action        text,
  request_data  jsonb,
  response_data jsonb,
  success       boolean not null default true,
  error_message text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_provider_logs_created on public.provider_logs(created_at desc);

-- ---------------------------------------------------------------------------
-- app_settings — key/value
-- ---------------------------------------------------------------------------
create table if not exists public.app_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);
create trigger trg_settings_updated before update on public.app_settings
  for each row execute function public.set_updated_at();

insert into public.app_settings(key, value) values
  ('minimum_deposit', '10'::jsonb),
  ('minimum_margin', '0'::jsonb),
  ('provider_low_balance_threshold', '50'::jsonb),
  ('maintenance_mode', 'false'::jsonb),
  ('orders_enabled', 'true'::jsonb)
on conflict (key) do nothing;
