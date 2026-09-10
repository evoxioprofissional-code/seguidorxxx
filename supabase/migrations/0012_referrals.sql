-- ===========================================================================
-- Sistema de indicação (referral): cada usuário tem um código/link.
-- Quando um indicado deposita, o indicador ganha comissão (% configurável).
-- ===========================================================================

alter table public.profiles
  add column if not exists referral_code text unique,
  add column if not exists referred_by uuid references auth.users(id) on delete set null;

create index if not exists idx_profiles_referred_by on public.profiles(referred_by);

-- gera um código curto e único
create or replace function public.gen_referral_code()
returns text language plpgsql security definer set search_path = public as $$
declare c text;
begin
  loop
    c := upper(substr(md5(gen_random_uuid()::text), 1, 8));
    exit when not exists (select 1 from public.profiles where referral_code = c);
  end loop;
  return c;
end;
$$;

-- backfill dos usuários existentes
update public.profiles set referral_code = public.gen_referral_code()
  where referral_code is null;

-- novos usuários já nascem com código e com o indicador (se veio no cadastro)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email, referral_code, referred_by)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    public.gen_referral_code(),
    nullif(new.raw_user_meta_data->>'referred_by', '')::uuid
  )
  on conflict (id) do nothing;

  insert into public.wallets (user_id, balance)
  values (new.id, 0)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- transação de comissão de indicação
alter table public.wallet_transactions drop constraint if exists wallet_transactions_type_check;
alter table public.wallet_transactions add constraint wallet_transactions_type_check
  check (type in ('deposit','purchase','refund','adjustment','referral'));

-- configurações do programa de indicação
insert into public.app_settings(key, value) values
  ('referral_enabled', 'true'::jsonb),
  ('referral_commission_percentage', '10'::jsonb),
  ('referral_min_deposit', '0'::jsonb)
on conflict (key) do nothing;
