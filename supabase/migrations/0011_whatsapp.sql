-- ===========================================================================
-- WhatsApp no cadastro: guarda o número do cliente no perfil.
-- ===========================================================================

alter table public.profiles add column if not exists whatsapp text;

-- Atualiza o trigger de novo usuário para capturar o whatsapp enviado no cadastro
-- (raw_user_meta_data->>'whatsapp').
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email, whatsapp)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'whatsapp'
  )
  on conflict (id) do nothing;

  insert into public.wallets (user_id, balance)
  values (new.id, 0)
  on conflict (user_id) do nothing;

  return new;
end;
$$;
