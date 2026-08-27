-- ===========================================================================
-- Piso de preço de venda por 1.000 + markup padrão maior.
-- Regra: preço de venda = max(min_sale_price, custo * (1 + markup/100))
-- ===========================================================================

alter table public.services
  add column if not exists min_sale_price numeric(14,4) not null default 7.5;

-- markup padrão maior para novos serviços
alter table public.services
  alter column markup_percentage set default 175;

-- atualiza os serviços já sincronizados que ainda estão no padrão antigo (100%)
update public.services
  set markup_percentage = 175
  where markup_percentage = 100;

update public.services
  set min_sale_price = 7.5
  where min_sale_price is null or min_sale_price = 0;
