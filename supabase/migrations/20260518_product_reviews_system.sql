create extension if not exists pgcrypto;

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  vendor_id uuid references public.vendors(id) on delete set null,
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete set null,
  user_id uuid not null,
  user_email text,
  rating integer not null,
  title text,
  comment text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create unique index if not exists product_reviews_product_order_user_idx
  on public.product_reviews (product_id, order_id, user_id);

create index if not exists product_reviews_product_id_idx
  on public.product_reviews (product_id, created_at desc);

create index if not exists product_reviews_vendor_id_idx
  on public.product_reviews (vendor_id, created_at desc);

create index if not exists product_reviews_user_id_idx
  on public.product_reviews (user_id, created_at desc);

create index if not exists product_reviews_order_id_idx
  on public.product_reviews (order_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_reviews_rating_check'
  ) then
    alter table public.product_reviews
      add constraint product_reviews_rating_check
      check (rating between 1 and 5);
  end if;
end $$;

create table if not exists public.vendor_review_notification_states (
  user_id uuid not null,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  last_read_at timestamptz not null default timezone('utc'::text, now()),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  primary key (user_id, vendor_id)
);

create or replace function public.is_platform_admin(check_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_roles
    where user_id = check_user_id
      and role = 'platform_admin'
  );
$$;

create or replace function public.is_active_vendor_member(check_user_id uuid, check_vendor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.vendor_members
    where user_id = check_user_id
      and vendor_id = check_vendor_id
      and status = 'active'
  );
$$;

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

alter table if exists public.product_reviews enable row level security;
alter table if exists public.vendor_review_notification_states enable row level security;

drop policy if exists "Public can read product reviews" on public.product_reviews;
create policy "Public can read product reviews"
  on public.product_reviews
  for select
  using (true);

drop policy if exists "Customers insert delivered product reviews" on public.product_reviews;
create policy "Customers insert delivered product reviews"
  on public.product_reviews
  for insert
  with check (
    auth.role() = 'authenticated'
    and auth.uid() = user_id
    and public.can_submit_product_review(auth.uid(), product_id, order_id)
  );

drop policy if exists "Platform admins delete product reviews" on public.product_reviews;
create policy "Platform admins delete product reviews"
  on public.product_reviews
  for delete
  using (public.is_platform_admin(auth.uid()));

drop policy if exists "Vendors read own product reviews" on public.product_reviews;
create policy "Vendors read own product reviews"
  on public.product_reviews
  for select
  using (
    vendor_id is not null
    and public.is_active_vendor_member(auth.uid(), vendor_id)
  );

drop policy if exists "Vendors read own review notification state" on public.vendor_review_notification_states;
create policy "Vendors read own review notification state"
  on public.vendor_review_notification_states
  for select
  using (
    auth.uid() = user_id
    and public.is_active_vendor_member(auth.uid(), vendor_id)
  );

drop policy if exists "Vendors insert own review notification state" on public.vendor_review_notification_states;
create policy "Vendors insert own review notification state"
  on public.vendor_review_notification_states
  for insert
  with check (
    auth.uid() = user_id
    and public.is_active_vendor_member(auth.uid(), vendor_id)
  );

drop policy if exists "Vendors update own review notification state" on public.vendor_review_notification_states;
create policy "Vendors update own review notification state"
  on public.vendor_review_notification_states
  for update
  using (
    auth.uid() = user_id
    and public.is_active_vendor_member(auth.uid(), vendor_id)
  )
  with check (
    auth.uid() = user_id
    and public.is_active_vendor_member(auth.uid(), vendor_id)
  );
