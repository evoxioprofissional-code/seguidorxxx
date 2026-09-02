-- ===========================================================================
-- SeguidorX — Asaas: CPF/CNPJ e id de cliente no perfil
-- Necessário porque o Asaas exige um cliente (com CPF/CNPJ) para gerar a cobrança.
-- O CPF é coletado no 1º depósito e reaproveitado; asaas_customer_id evita
-- recriar o cliente a cada PIX.
-- ===========================================================================

alter table public.profiles
  add column if not exists cpf_cnpj          text,
  add column if not exists asaas_customer_id text;
