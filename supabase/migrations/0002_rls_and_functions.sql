-- ===========================================================================
-- SeguidorX — RLS + Trigger de novo usuário + RPCs financeiras atômicas
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Novo usuário -> cria profile + wallet automaticamente
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;

  insert into public.wallets (user_id, balance)
  values (new.id, 0)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===========================================================================
-- RLS
-- ===========================================================================
alter table public.profiles            enable row level security;
alter table public.wallets             enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.provider_services   enable row level security;
alter table public.services            enable row level security;
alter table public.orders              enable row level security;
alter table public.order_refills       enable row level security;
alter table public.payments            enable row level security;
alter table public.provider_logs       enable row level security;
alter table public.app_settings        enable row level security;

-- profiles
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid() and role = 'user');
create policy "profiles_admin_all" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- wallets (somente leitura; mutações via RPC/service role)
create policy "wallets_select_own" on public.wallets
  for select using (user_id = auth.uid() or public.is_admin());

-- wallet_transactions
create policy "wtx_select_own" on public.wallet_transactions
  for select using (user_id = auth.uid() or public.is_admin());

-- provider_services (admin only)
create policy "provider_services_admin" on public.provider_services
  for all using (public.is_admin()) with check (public.is_admin());

-- services: catálogo público (ativos) para qualquer um; admin gerencia tudo
create policy "services_select_active" on public.services
  for select using (active = true or public.is_admin());
create policy "services_admin_all" on public.services
  for all using (public.is_admin()) with check (public.is_admin());

-- orders (usuário lê os próprios; escrita via service role/RPC)
create policy "orders_select_own" on public.orders
  for select using (user_id = auth.uid() or public.is_admin());
create policy "orders_admin_all" on public.orders
  for all using (public.is_admin()) with check (public.is_admin());

-- order_refills
create policy "refills_select_own" on public.order_refills
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
    or public.is_admin()
  );

-- payments
create policy "payments_select_own" on public.payments
  for select using (user_id = auth.uid() or public.is_admin());

-- provider_logs (admin only)
create policy "provider_logs_admin" on public.provider_logs
  for all using (public.is_admin()) with check (public.is_admin());

-- app_settings: leitura autenticada, escrita admin
create policy "settings_select" on public.app_settings
  for select using (auth.role() = 'authenticated' or public.is_admin());
create policy "settings_admin_write" on public.app_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- ===========================================================================
-- RPCs financeiras — TODAS SECURITY DEFINER, débito/crédito atômico com lock
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- create_order_and_debit: reserva o pedido debitando o saldo de forma atômica.
-- Retorna a linha do pedido (status 'submitting'). Idempotente por chave.
-- ---------------------------------------------------------------------------
create or replace function public.create_order_and_debit(
  p_user_id        uuid,
  p_service_id     uuid,
  p_provider       text,
  p_link           text,
  p_quantity       integer,
  p_customer_price numeric,
  p_provider_cost  numeric,
  p_service_name   text,
  p_has_refill     boolean,
  p_has_cancel     boolean,
  p_idempotency_key text
)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  v_balance numeric;
  v_order   public.orders;
  v_existing public.orders;
begin
  -- Idempotência: se já existe pedido com essa chave, devolve ele.
  if p_idempotency_key is not null then
    select * into v_existing from public.orders where idempotency_key = p_idempotency_key;
    if found then
      return v_existing;
    end if;
  end if;

  -- Lock da carteira (evita race condition de saldo).
  select balance into v_balance
    from public.wallets
    where user_id = p_user_id
    for update;

  if not found then
    raise exception 'WALLET_NOT_FOUND';
  end if;

  if v_balance < p_customer_price then
    raise exception 'INSUFFICIENT_BALANCE';
  end if;

  update public.wallets
    set balance = balance - p_customer_price
    where user_id = p_user_id;

  insert into public.wallet_transactions(user_id, type, amount, balance_after, description, reference_id)
  values (p_user_id, 'purchase', -p_customer_price, v_balance - p_customer_price,
          'Pedido ' || coalesce(p_service_name,'serviço'), p_idempotency_key);

  insert into public.orders(
    user_id, service_id, provider, link, quantity,
    customer_price, provider_cost, profit,
    status, service_name, has_refill, has_cancel, idempotency_key
  ) values (
    p_user_id, p_service_id, p_provider, p_link, p_quantity,
    p_customer_price, p_provider_cost, p_customer_price - p_provider_cost,
    'submitting', p_service_name, p_has_refill, p_has_cancel, p_idempotency_key
  )
  returning * into v_order;

  -- vincula a referência da transação ao id público
  update public.wallet_transactions
    set reference_id = v_order.public_order_id
    where reference_id = p_idempotency_key and user_id = p_user_id;

  return v_order;
end;
$$;

-- ---------------------------------------------------------------------------
-- refund_order: estorna um pedido (idempotente — só estorna 1x).
-- ---------------------------------------------------------------------------
create or replace function public.refund_order(p_order_id uuid, p_reason text default 'Estorno automático')
returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if v_order.status = 'refunded' then
    return v_order;  -- já estornado
  end if;

  update public.wallets
    set balance = balance + v_order.customer_price
    where user_id = v_order.user_id;

  insert into public.wallet_transactions(user_id, type, amount, balance_after, description, reference_id)
  select v_order.user_id, 'refund', v_order.customer_price,
         w.balance, p_reason, v_order.public_order_id
    from public.wallets w where w.user_id = v_order.user_id;

  update public.orders
    set status = 'refunded', updated_at = now()
    where id = p_order_id
    returning * into v_order;

  return v_order;
end;
$$;

-- ---------------------------------------------------------------------------
-- credit_balance: crédito de saldo (depósito confirmado). Idempotente por ref.
-- ---------------------------------------------------------------------------
create or replace function public.credit_balance(
  p_user_id uuid,
  p_amount  numeric,
  p_type    text,           -- 'deposit' | 'adjustment' | 'refund'
  p_description text,
  p_reference_id text
)
returns numeric
language plpgsql security definer set search_path = public as $$
declare
  v_balance numeric;
begin
  if p_amount = 0 then
    raise exception 'ZERO_AMOUNT';
  end if;

  -- Idempotência para depósitos/pagamentos: não credita a mesma referência 2x.
  if p_reference_id is not null and p_type = 'deposit' then
    if exists (
      select 1 from public.wallet_transactions
      where reference_id = p_reference_id and type = 'deposit'
    ) then
      select balance into v_balance from public.wallets where user_id = p_user_id;
      return v_balance;
    end if;
  end if;

  update public.wallets
    set balance = balance + p_amount
    where user_id = p_user_id
    returning balance into v_balance;

  if not found then
    raise exception 'WALLET_NOT_FOUND';
  end if;

  if v_balance < 0 then
    raise exception 'NEGATIVE_BALANCE';
  end if;

  insert into public.wallet_transactions(user_id, type, amount, balance_after, description, reference_id)
  values (p_user_id, p_type, p_amount, v_balance, p_description, p_reference_id);

  return v_balance;
end;
$$;

-- Revoga execução direta do anon; funções chamadas via service role no backend.
revoke all on function public.create_order_and_debit(uuid,uuid,text,text,integer,numeric,numeric,text,boolean,boolean,text) from public, anon, authenticated;
revoke all on function public.refund_order(uuid,text) from public, anon, authenticated;
revoke all on function public.credit_balance(uuid,numeric,text,text,text) from public, anon, authenticated;
