-- ===========================================================================
-- Promove um usuário a admin pelo e-mail.
-- Rode DEPOIS de criar a conta pelo /cadastro.
-- Troque o e-mail abaixo pelo seu.
-- ===========================================================================
update public.profiles
set role = 'admin'
where email = 'b0redlowz@gmail.com';
