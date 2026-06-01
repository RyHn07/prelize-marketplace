-- Return only the aggregate quantity sold for an active public product.
-- Raw customer order rows remain protected by their existing RLS policies.

create or replace function public.get_public_product_sold_count(check_product_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(order_items.quantity), 0)::bigint
  from public.products
  left join public.order_items
    on order_items.product_id = products.id::text
  left join public.orders
    on orders.id = order_items.order_id
    and orders.status = 'Delivered'
  where products.id = check_product_id
    and products.status = 'active'
    and products.is_active = true
    and (
      order_items.id is null
      or orders.id is not null
    );
$$;

revoke all on function public.get_public_product_sold_count(uuid) from public;
grant execute on function public.get_public_product_sold_count(uuid) to anon, authenticated;
