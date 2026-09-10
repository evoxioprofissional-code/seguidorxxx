-- Sistema de indicações confiável e financeiro-atômico.

create table if not exists public.referral_commissions (
  id             uuid primary key default gen_random_uuid(),
  payment_id     uuid not null unique references public.payments(id) on delete restrict,
  referrer_id    uuid not null references auth.users(id) on delete restrict,
  referred_id    uuid not null references auth.users(id) on delete restrict,
  deposit_amount numeric(14,4) not null check (deposit_amount > 0),
  percentage     numeric(8,2) not null check (percentage > 0),
  amount         numeric(14,4) not null check (amount > 0),
  created_at     timestamptz not null default now(),
  check (referrer_id <> referred_id)
);

create index if not exists idx_referral_commissions_referrer
  on public.referral_commissions(referrer_id, created_at desc);

alter table public.referral_commissions enable row level security;

drop policy if exists referral_commissions_select_own on public.referral_commissions;
create policy referral_commissions_select_own on public.referral_commissions
  for select using (referrer_id = auth.uid() or public.is_admin());

-- Recupera somente comissões antigas com evidência confiável: transação de
-- referral ligada a pagamento aprovado e indicador igual ao vínculo do perfil.
insert into public.referral_commissions(
  payment_id, referrer_id, referred_id, deposit_amount, percentage, amount, created_at
)
select distinct on (pay.id)
  pay.id,
  tx.user_id,
  pay.user_id,
  pay.amount,
  round((tx.amount / pay.amount * 100)::numeric, 2),
  tx.amount,
  tx.created_at
from public.wallet_transactions tx
join public.payments pay
  on tx.reference_id = 'referral_' || pay.id::text
join public.profiles referred
  on referred.id = pay.user_id and referred.referred_by = tx.user_id
where tx.type = 'referral'
  and tx.amount > 0
  and pay.amount > 0
  and pay.status = 'approved'
order by pay.id, tx.created_at asc
on conflict (payment_id) do nothing;

-- Todas as alterações de perfil deste projeto passam pelo backend/service role.
-- Revogar UPDATE direto impede adulterar código, indicador, papel ou saldo por API.
revoke update on public.profiles from anon, authenticated;

-- Cadastro resolve o indicador exclusivamente pelo código público. Não aceita
-- UUID arbitrário enviado em raw_user_meta_data.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_referrer uuid;
  v_code text;
begin
  v_code := upper(trim(coalesce(new.raw_user_meta_data->>'referral_code', '')));
  if v_code <> '' then
    select id into v_referrer
      from public.profiles
     where referral_code = v_code;
  end if;

  if v_referrer = new.id then v_referrer := null; end if;

  insert into public.profiles (id, name, email, referral_code, referred_by)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    public.gen_referral_code(),
    v_referrer
  )
  on conflict (id) do nothing;

  insert into public.wallets (user_id, balance)
  values (new.id, 0)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create or replace function public.claim_referral(p_user_id uuid, p_referral_code text)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_referrer uuid;
  v_current uuid;
  v_created_at timestamptz;
begin
  if p_user_id is null or nullif(trim(p_referral_code), '') is null then
    return false;
  end if;

  select id into v_referrer
    from public.profiles
   where referral_code = upper(trim(p_referral_code));

  if not found or v_referrer = p_user_id then
    return false;
  end if;

  select referred_by, created_at into v_current, v_created_at
    from public.profiles
   where id = p_user_id
   for update;

  if not found then
    return false;
  end if;

  -- O vínculo só pode ser reivindicado durante a criação da conta. Isso cobre
  -- o retorno imediato do OAuth sem permitir que uma conta antiga escolha um
  -- indicador posteriormente.
  if v_created_at < now() - interval '15 minutes' then
    return false;
  end if;

  -- O indicador é imutável: vínculo existente nunca é trocado.
  if v_current is not null then
    return v_current = v_referrer;
  end if;

  update public.profiles
     set referred_by = v_referrer
   where id = p_user_id and referred_by is null;

  return found;
end;
$$;

revoke all on function public.claim_referral(uuid,text) from public, anon, authenticated;
grant execute on function public.claim_referral(uuid,text) to service_role;

-- Estatísticas próprias sem abrir os perfis dos indicados pela RLS.
create or replace function public.get_my_referral_stats()
returns table(referred_count bigint, total_earned numeric)
language sql stable security definer set search_path = public as $$
  select
    (select count(*) from public.profiles p where p.referred_by = auth.uid()),
    coalesce((select sum(c.amount) from public.referral_commissions c
              where c.referrer_id = auth.uid()), 0::numeric);
$$;

revoke all on function public.get_my_referral_stats() from public, anon;
grant execute on function public.get_my_referral_stats() to authenticated;

-- Confirma e credita uma comissão em uma única transação SQL.
create or replace function public.process_referral_commission(p_payment_id uuid)
returns numeric
language plpgsql security definer set search_path = public as $$
declare
  v_payment public.payments;
  v_referrer uuid;
  v_enabled boolean;
  v_percentage numeric;
  v_minimum numeric;
  v_commission numeric(14,4);
  v_balance numeric(14,4);
begin
  select * into v_payment
    from public.payments
   where id = p_payment_id
   for update;

  if not found then
    raise exception 'PAYMENT_NOT_FOUND';
  end if;

  -- Apenas valor persistido e pagamento definitivamente aprovado.
  if v_payment.status <> 'approved' then
    return 0;
  end if;

  if exists (select 1 from public.referral_commissions where payment_id = p_payment_id) then
    return 0;
  end if;

  select referred_by into v_referrer
    from public.profiles
   where id = v_payment.user_id;

  if v_referrer is null or v_referrer = v_payment.user_id then
    return 0;
  end if;

  select coalesce((select (value #>> '{}')::boolean from public.app_settings
                   where key = 'referral_enabled'), true),
         coalesce((select (value #>> '{}')::numeric from public.app_settings
                   where key = 'referral_commission_percentage'), 10),
         coalesce((select (value #>> '{}')::numeric from public.app_settings
                   where key = 'referral_min_deposit'), 0)
    into v_enabled, v_percentage, v_minimum;

  if not v_enabled or v_percentage <= 0 or v_payment.amount < v_minimum then
    return 0;
  end if;

  v_commission := round((v_payment.amount * v_percentage / 100)::numeric, 4);
  if v_commission <= 0 then return 0; end if;

  insert into public.referral_commissions(
    payment_id, referrer_id, referred_id, deposit_amount, percentage, amount
  ) values (
    v_payment.id, v_referrer, v_payment.user_id,
    v_payment.amount, v_percentage, v_commission
  ) on conflict (payment_id) do nothing;

  if not found then return 0; end if;

  update public.wallets
     set balance = balance + v_commission
   where user_id = v_referrer
   returning balance into v_balance;

  if not found then raise exception 'REFERRER_WALLET_NOT_FOUND'; end if;

  insert into public.wallet_transactions(
    user_id, type, amount, balance_after, description, reference_id
  ) values (
    v_referrer, 'referral', v_commission, v_balance,
    'Comissão de indicação', 'referral_' || v_payment.id::text
  );

  return v_commission;
end;
$$;

revoke all on function public.process_referral_commission(uuid) from public, anon, authenticated;
grant execute on function public.process_referral_commission(uuid) to service_role;

-- Garante código para perfis antigos sem inventar relações.
update public.profiles
   set referral_code = public.gen_referral_code()
 where referral_code is null;
