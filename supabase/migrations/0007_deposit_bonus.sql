-- ===========================================================================
-- Bônus por depósito: ganha seguidores grátis ao depositar valores-alvo.
-- O bônus é concedido na aprovação do depósito e resgatado pelo cliente
-- informando o @ do Instagram.
-- ===========================================================================

create table if not exists public.bonus_grants (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  followers    integer not null,
  service_id   uuid references public.services(id),
  payment_id   uuid unique references public.payments(id) on delete set null, -- 1 bônus por pagamento
  status       text not null default 'pending' check (status in ('pending','delivered','failed')),
  link         text,
  order_id     uuid references public.orders(id),
  created_at   timestamptz not null default now(),
  delivered_at timestamptz
);
create index if not exists idx_bonus_user on public.bonus_grants(user_id, status);

alter table public.bonus_grants enable row level security;
create policy "bonus_select_own" on public.bonus_grants
  for select using (user_id = auth.uid() or public.is_admin());
create policy "bonus_admin_all" on public.bonus_grants
  for all using (public.is_admin()) with check (public.is_admin());

-- 'bonus' como origem válida de pedido
alter table public.orders drop constraint if exists orders_source_check;
alter table public.orders add constraint orders_source_check
  check (source in ('web','api','bonus'));

-- Configurações do bônus
insert into public.app_settings(key, value) values
  ('bonus_enabled', 'true'::jsonb),
  ('deposit_bonuses', '[{"min":30,"followers":1000},{"min":50,"followers":2000},{"min":100,"followers":5000}]'::jsonb)
on conflict (key) do nothing;
