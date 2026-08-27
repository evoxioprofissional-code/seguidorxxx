-- ===========================================================================
-- refund_order à prova de reembolso duplicado.
-- Garante NO MÁXIMO 1 transação de reembolso por pedido, independente de quantas
-- vezes/por quais caminhos for chamado (auto-cancelamento, retry, etc).
-- ===========================================================================
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

  -- já marcado como estornado
  if v_order.status = 'refunded' then
    return v_order;
  end if;

  -- já existe uma transação de reembolso para este pedido -> NÃO credita de novo,
  -- apenas garante o status. (bloqueia duplicidade mesmo se o status não era 'refunded')
  if exists (
    select 1 from public.wallet_transactions
    where reference_id = v_order.public_order_id and type = 'refund'
  ) then
    update public.orders set status = 'refunded', updated_at = now()
      where id = p_order_id returning * into v_order;
    return v_order;
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

revoke all on function public.refund_order(uuid,text) from public, anon, authenticated;
