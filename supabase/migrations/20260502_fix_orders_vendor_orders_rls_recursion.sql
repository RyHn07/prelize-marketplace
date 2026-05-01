create or replace function public.user_owns_order(target_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.orders
    where id = target_order_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.user_has_vendor_access_to_order(target_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.vendor_orders vo
    join public.vendor_members vm on vm.vendor_id = vo.vendor_id
    where vo.order_id = target_order_id
      and vm.user_id = auth.uid()
      and vm.status = 'active'
  );
$$;

drop policy if exists "Vendors read linked parent orders" on orders;
create policy "Vendors read linked parent orders"
  on orders
  for select
  to authenticated
  using (public.user_has_vendor_access_to_order(id));

drop policy if exists "Customers insert vendor orders for own orders" on vendor_orders;
create policy "Customers insert vendor orders for own orders"
  on vendor_orders
  for insert
  to authenticated
  with check (public.user_owns_order(order_id));

drop policy if exists "Customers read vendor orders for own orders" on vendor_orders;
create policy "Customers read vendor orders for own orders"
  on vendor_orders
  for select
  to authenticated
  using (public.user_owns_order(order_id));
