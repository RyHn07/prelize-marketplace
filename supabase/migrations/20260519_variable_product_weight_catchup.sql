alter table if exists public.product_variants
  add column if not exists weight numeric(12,2) null;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'weight'
  ) then
    update public.product_variants variants
    set weight = nullif(trim(products.weight::text), '')::numeric
    from public.products products
    where variants.product_id = products.id
      and variants.weight is null
      and products.weight is not null
      and trim(products.weight::text) ~ '^[0-9]+(\.[0-9]+)?$';
  end if;
end $$;
