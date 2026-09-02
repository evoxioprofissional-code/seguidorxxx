# SeguidorX

Painel premium de revenda de serviços para redes sociais (seguidores, curtidas, visualizações, etc.), integrado à API do fornecedor **Barato Sociais** — com camada de automação, carteira, pedidos, refill/cancel, painel admin e arquitetura pronta para múltiplos fornecedores e gateways de pagamento.

O usuário final nunca sabe que existe um fornecedor por trás: o SeguidorX opera como camada de revenda e automação.

## Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS v4** (dark mode premium, roxo vibrante, glassmorphism)
- **Supabase** (Auth + Postgres + RLS)
- **Framer Motion**, **Lucide**, **Zod**, **Sonner**

## Arquitetura

```
src/
  app/
    (public)      -> landing (/)
    (auth)        -> /login, /cadastro
    (app)         -> /dashboard, /services, /orders, /wallet   (usuário)
    (admin)       -> /admin/*                                   (admin)
    api/          -> orders, payments, admin, cron, webhook
  components/     -> ui, brand, catalog, orders, wallet, admin, landing
  lib/
    supabase/     -> client, server, admin (service role), middleware
    providers/    -> integração de fornecedores (barato-sociais + registro)
    payments/     -> gateways (mock PIX + registro), aprovação idempotente
    pricing/      -> cálculo central de custo/preço (manual/markup/multiplier)
    orders/       -> criação (débito atômico + refund), sync de status
    admin/        -> métricas, sync de serviços, guard
    catalog/      -> taxonomia (plataforma/categoria), DTO público
    validations/  -> schemas Zod
supabase/migrations/ -> schema, RLS, RPCs financeiras atômicas
```

### Segurança / consistência financeira

- **API key do fornecedor só no backend** (`BARATO_SOCIAIS_API_KEY`, nunca `NEXT_PUBLIC`).
- **Preço recalculado no servidor** em toda compra — o front nunca define preço.
- **Débito atômico** via RPC Postgres com `SELECT ... FOR UPDATE` (sem race condition entre abas).
- **Idempotência** por `idempotency_key` (sem cobrança duplicada).
- **Refund automático** se o fornecedor falhar após o débito.
- **Saldo só é creditado pelo backend/webhook** — nunca pelo frontend.
- **RLS** em todas as tabelas; funções privilegiadas via service role.
- Logs do fornecedor **sanitizados** (a API key nunca é gravada).

## Setup

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Copie `.env.example` para `.env.local` e preencha as chaves do Supabase, do fornecedor e do app.
3. Aplique o schema no banco:
   ```bash
   DATABASE_URL="postgresql://postgres.<ref>:<senha>@aws-...pooler.supabase.com:6543/postgres" node scripts/apply-migrations.mjs
   ```
   > Alternativa: cole `supabase/FULL_SCHEMA.sql` no SQL Editor do Supabase.
4. Crie sua conta em `/cadastro` e promova-se a admin rodando `supabase/migrations/0003_seed_admin.sql` (ajuste o e-mail).
5. Rode o projeto:
   ```bash
   npm run dev
   ```
6. No admin (`/admin/integrations`), teste a conexão e **Sincronize os serviços**. Depois ative e precifique os serviços em `/admin/services`.

## Fornecedor

Integração em `src/lib/providers/barato-sociais.ts` (POST `application/x-www-form-urlencoded`, resposta JSON).
Métodos: `getServices`, `getBalance`, `createOrder`, `getOrderStatus`, `getMultipleOrderStatus` (lotes de 100), `createRefill`, `getRefillStatus`, `cancelOrders`.

Sem a `BARATO_SOCIAIS_API_KEY`, o sistema roda normalmente e o admin mostra **"API não configurada"**.

## Pagamentos

Camada abstrata em `src/lib/payments`. Vem com um gateway **PIX mock** (fallback de dev — a aprovação é simulada em `/api/payments/[id]/confirm`) e o gateway **Asaas** (`src/lib/payments/asaas.ts`) para produção.

Para produção, defina `PAYMENT_PROVIDER=asaas`, `ASAAS_API_KEY` e `PAYMENT_WEBHOOK_SECRET`; o crédito de saldo acontece só via `/api/payments/webhook` (validado pelo header `asaas-access-token`). O Asaas exige CPF/CNPJ do pagador — ele é coletado no primeiro depósito e salvo no perfil (`profiles.cpf_cnpj` / `asaas_customer_id`). No painel do Asaas, cadastre o webhook apontando para `https://SEU_DOMINIO/api/payments/webhook` com o mesmo token de `PAYMENT_WEBHOOK_SECRET`.

## Cron

`/api/cron/sync-orders` atualiza os pedidos abertos em lote. Configurado no `vercel.json` (a cada 10 min). Proteja com `CRON_SECRET`.
