-- ===========================================================================
-- SeguidorX — Credenciais do fornecedor configuráveis pelo admin
-- Permite conectar a API do fornecedor (Barato Sociais) pelo painel, sem depender
-- da variável de ambiente BARATO_SOCIAIS_API_KEY.
--
-- SEGURANÇA: RLS habilitado e SEM policies => só o backend (service role) acessa.
-- A chave nunca vai para o navegador.
-- ===========================================================================

create table if not exists public.provider_settings (
  id            text primary key,          -- 'barato_sociais'
  api_key       text,
  api_url       text,
  connected     boolean not null default false,
  account_label text,                       -- ex.: "Saldo: R$ 0,39"
  updated_at    timestamptz not null default now()
);

alter table public.provider_settings enable row level security;
-- Sem policies: apenas service_role (backend) acessa.

create trigger trg_provider_settings_updated before update on public.provider_settings
  for each row execute function public.set_updated_at();
