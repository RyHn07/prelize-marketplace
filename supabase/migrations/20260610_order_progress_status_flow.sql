alter table if exists public.orders
  alter column status set default 'Order Placed';

alter table if exists public.vendor_orders
  alter column status set default 'Order Placed';

alter table if exists public.orders
  add column if not exists payment_proof_path text,
  add column if not exists payment_proof_uploaded_at timestamptz;

update public.orders
set status = case status
  when 'Pending' then 'Order Placed'
  when 'Confirmed' then 'Payment Verified'
  when 'Delivered' then 'Delivered'
  when 'Completed' then 'Delivered'
  else status
end
where status in ('Pending', 'Confirmed', 'Delivered', 'Completed');

update public.vendor_orders
set status = case status
  when 'Pending' then 'Order Placed'
  when 'Confirmed' then 'Payment Verified'
  when 'Delivered' then 'Delivered'
  when 'Completed' then 'Delivered'
  else status
end
where status in ('Pending', 'Confirmed', 'Delivered', 'Completed');

create or replace function public.can_submit_product_review(
  check_user_id uuid,
  check_product_id uuid,
  check_order_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.orders o
    join public.order_items oi on oi.order_id = o.id
    where o.id = check_order_id
      and o.user_id = check_user_id
      and o.status = 'Delivered'
      and oi.product_id = check_product_id::text
  );
$$;

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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs',
  'payment-proofs',
  false,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Customers upload own payment proofs" on storage.objects;
create policy "Customers upload own payment proofs"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'payment-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Customers read own payment proofs" on storage.objects;
create policy "Customers read own payment proofs"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'payment-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Platform admins read payment proofs" on storage.objects;
create policy "Platform admins read payment proofs"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'payment-proofs'
    and public.is_platform_admin()
  );

create or replace function public.submit_order_payment_proof(
  check_order_id uuid,
  proof_path text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if proof_path is null or trim(proof_path) = '' then
    raise exception 'Payment proof path is required';
  end if;

  if not public.user_owns_order(check_order_id) then
    raise exception 'Order is not accessible';
  end if;

  if split_part(proof_path, '/', 1) <> auth.uid()::text then
    raise exception 'Payment proof path is not allowed';
  end if;

  update public.orders
  set
    payment_proof_path = proof_path,
    payment_proof_uploaded_at = now(),
    payment_status = 'Pending'
  where id = check_order_id
    and user_id = auth.uid();
end;
$$;

grant execute on function public.submit_order_payment_proof(uuid, text) to authenticated;
