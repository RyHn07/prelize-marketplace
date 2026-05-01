alter table if exists vendors enable row level security;
alter table if exists vendor_members enable row level security;
alter table if exists vendor_orders enable row level security;
alter table if exists orders enable row level security;
alter table if exists order_items enable row level security;
alter table if exists platform_roles enable row level security;

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

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'platform_roles'
      and policyname = 'Users read own platform roles'
  ) then
    create policy "Users read own platform roles"
      on platform_roles
      for select
      to authenticated
      using (user_id = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'platform_roles'
      and policyname = 'Platform admins read platform roles'
  ) then
    create policy "Platform admins read platform roles"
      on platform_roles
      for select
      to authenticated
      using (public.is_platform_admin());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'vendors'
      and policyname = 'Authenticated read accessible vendors'
  ) then
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
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'vendors'
      and policyname = 'Platform admins insert vendors'
  ) then
    create policy "Platform admins insert vendors"
      on vendors
      for insert
      to authenticated
      with check (public.is_platform_admin());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'vendors'
      and policyname = 'Platform admins update vendors'
  ) then
    create policy "Platform admins update vendors"
      on vendors
      for update
      to authenticated
      using (public.is_platform_admin())
      with check (public.is_platform_admin());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'vendor_members'
      and policyname = 'Users read own vendor memberships'
  ) then
    create policy "Users read own vendor memberships"
      on vendor_members
      for select
      to authenticated
      using (user_id = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'vendor_members'
      and policyname = 'Platform admins read vendor memberships'
  ) then
    create policy "Platform admins read vendor memberships"
      on vendor_members
      for select
      to authenticated
      using (public.is_platform_admin());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'vendor_members'
      and policyname = 'Platform admins insert vendor memberships'
  ) then
    create policy "Platform admins insert vendor memberships"
      on vendor_members
      for insert
      to authenticated
      with check (public.is_platform_admin());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'vendor_members'
      and policyname = 'Platform admins update vendor memberships'
  ) then
    create policy "Platform admins update vendor memberships"
      on vendor_members
      for update
      to authenticated
      using (public.is_platform_admin())
      with check (public.is_platform_admin());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'orders'
      and policyname = 'Customers insert own orders'
  ) then
    create policy "Customers insert own orders"
      on orders
      for insert
      to authenticated
      with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'orders'
      and policyname = 'Customers read own orders'
  ) then
    create policy "Customers read own orders"
      on orders
      for select
      to authenticated
      using (user_id = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'orders'
      and policyname = 'Platform admins manage orders'
  ) then
    create policy "Platform admins manage orders"
      on orders
      for all
      to authenticated
      using (public.is_platform_admin())
      with check (public.is_platform_admin());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'orders'
      and policyname = 'Vendors read linked parent orders'
  ) then
    create policy "Vendors read linked parent orders"
      on orders
      for select
      to authenticated
      using (public.user_has_vendor_access_to_order(id));
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'vendor_orders'
      and policyname = 'Customers insert vendor orders for own orders'
  ) then
    create policy "Customers insert vendor orders for own orders"
      on vendor_orders
      for insert
      to authenticated
      with check (public.user_owns_order(order_id));
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'vendor_orders'
      and policyname = 'Customers read vendor orders for own orders'
  ) then
    create policy "Customers read vendor orders for own orders"
      on vendor_orders
      for select
      to authenticated
      using (public.user_owns_order(order_id));
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'vendor_orders'
      and policyname = 'Vendors read own vendor orders'
  ) then
    create policy "Vendors read own vendor orders"
      on vendor_orders
      for select
      to authenticated
      using (
        exists (
          select 1
          from vendor_members vm
          where vm.vendor_id = vendor_orders.vendor_id
            and vm.user_id = auth.uid()
            and vm.status = 'active'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'vendor_orders'
      and policyname = 'Vendors update own vendor orders'
  ) then
    create policy "Vendors update own vendor orders"
      on vendor_orders
      for update
      to authenticated
      using (
        exists (
          select 1
          from vendor_members vm
          where vm.vendor_id = vendor_orders.vendor_id
            and vm.user_id = auth.uid()
            and vm.status = 'active'
        )
      )
      with check (
        exists (
          select 1
          from vendor_members vm
          where vm.vendor_id = vendor_orders.vendor_id
            and vm.user_id = auth.uid()
            and vm.status = 'active'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'vendor_orders'
      and policyname = 'Platform admins read vendor orders'
  ) then
    create policy "Platform admins read vendor orders"
      on vendor_orders
      for select
      to authenticated
      using (public.is_platform_admin());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'vendor_orders'
      and policyname = 'Platform admins update vendor orders'
  ) then
    create policy "Platform admins update vendor orders"
      on vendor_orders
      for update
      to authenticated
      using (public.is_platform_admin())
      with check (public.is_platform_admin());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'order_items'
      and policyname = 'Customers insert order items for own orders'
  ) then
    create policy "Customers insert order items for own orders"
      on order_items
      for insert
      to authenticated
      with check (
        exists (
          select 1
          from orders o
          where o.id = order_items.order_id
            and o.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'order_items'
      and policyname = 'Customers read order items for own orders'
  ) then
    create policy "Customers read order items for own orders"
      on order_items
      for select
      to authenticated
      using (
        exists (
          select 1
          from orders o
          where o.id = order_items.order_id
            and o.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'order_items'
      and policyname = 'Vendors read own order items'
  ) then
    create policy "Vendors read own order items"
      on order_items
      for select
      to authenticated
      using (
        vendor_id is not null
        and exists (
          select 1
          from vendor_members vm
          where vm.vendor_id = order_items.vendor_id
            and vm.user_id = auth.uid()
            and vm.status = 'active'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'order_items'
      and policyname = 'Platform admins read order items'
  ) then
    create policy "Platform admins read order items"
      on order_items
      for select
      to authenticated
      using (public.is_platform_admin());
  end if;
end $$;
