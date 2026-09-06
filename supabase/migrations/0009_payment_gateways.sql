-- ===========================================================================
-- SeguidorX — Gateways de pagamento configuráveis pelo admin
-- Guarda as credenciais (Asaas / Mercado Pago) no banco para o admin conectar
-- pelo painel, sem depender das variáveis de ambiente.
--
-- SEGURANÇA: RLS habilitado e SEM policies => nenhum acesso via client.
-- Só o backend (service role) lê/escreve. Os segredos nunca vão ao navegador.
-- ===========================================================================

create table if not exists public.payment_gateways (
  id             text primary key,            -- 'asaas' | 'mercadopago'
  api_key        text,                        -- segredo
  webhook_secret text,                        -- segredo
  extra          jsonb not null default '{}'::jsonb,  -- ex.: { "env": "production" }
  connected      boolean not null default false,
  account_label  text,                        -- nome da conta (seguro exibir)
  updated_at     timestamptz not null default now()
);

alter table public.payment_gateways enable row level security;
-- Sem policies: apenas service_role (backend) acessa.

create trigger trg_payment_gateways_updated before update on public.payment_gateways
  for each row execute function public.set_updated_at();

-- Gateway ativo (não-secreto) fica em app_settings.
insert into public.app_settings(key, value)
values ('payment_provider', to_jsonb('asaas'::text))
on conflict (key) do nothing;
