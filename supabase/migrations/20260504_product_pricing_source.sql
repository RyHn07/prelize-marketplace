alter table if exists public.products
  add column if not exists pricing_source text not null default 'use_variant_price';

update public.products
set pricing_source = 'use_pricing_tiers'
where product_type = 'variable'
  and exists (
    select 1
    from public.product_pricing_tiers
    where product_pricing_tiers.product_id = products.id
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_pricing_source_check'
  ) then
    alter table public.products
      add constraint products_pricing_source_check
      check (pricing_source in ('use_pricing_tiers', 'use_variant_price'));
  end if;
end $$;

create index if not exists products_pricing_source_idx
  on public.products (pricing_source);
