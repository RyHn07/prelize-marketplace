create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_roles
    where user_id = auth.uid()
      and role = 'platform_admin'
  );
$$;

alter table if exists platform_roles enable row level security;

drop policy if exists "Platform admins read platform roles" on platform_roles;
create policy "Platform admins read platform roles"
  on platform_roles
  for select
  to authenticated
  using (public.is_platform_admin());

drop policy if exists "Authenticated read accessible vendors" on vendors;
create policy "Authenticated read accessible vendors"
  on vendors
  for select
  to authenticated
  using (
    status = 'active'
    or exists (
      select 1
      from vendor_members vm
      where vm.vendor_id = vendors.id
        and vm.user_id = auth.uid()
        and vm.status in ('active', 'invited')
    )
    or public.is_platform_admin()
  );

drop policy if exists "Platform admins insert vendors" on vendors;
create policy "Platform admins insert vendors"
  on vendors
  for insert
  to authenticated
  with check (public.is_platform_admin());

drop policy if exists "Platform admins update vendors" on vendors;
create policy "Platform admins update vendors"
  on vendors
  for update
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "Platform admins read vendor memberships" on vendor_members;
create policy "Platform admins read vendor memberships"
  on vendor_members
  for select
  to authenticated
  using (public.is_platform_admin());

drop policy if exists "Platform admins insert vendor memberships" on vendor_members;
create policy "Platform admins insert vendor memberships"
  on vendor_members
  for insert
  to authenticated
  with check (public.is_platform_admin());

drop policy if exists "Platform admins update vendor memberships" on vendor_members;
create policy "Platform admins update vendor memberships"
  on vendor_members
  for update
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "Platform admins manage orders" on orders;
create policy "Platform admins manage orders"
  on orders
  for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "Platform admins read vendor orders" on vendor_orders;
create policy "Platform admins read vendor orders"
  on vendor_orders
  for select
  to authenticated
  using (public.is_platform_admin());

drop policy if exists "Platform admins update vendor orders" on vendor_orders;
create policy "Platform admins update vendor orders"
  on vendor_orders
  for update
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "Platform admins read order items" on order_items;
create policy "Platform admins read order items"
  on order_items
  for select
  to authenticated
  using (public.is_platform_admin());
