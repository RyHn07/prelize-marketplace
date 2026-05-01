create extension if not exists pgcrypto;

create table if not exists vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  logo_url text,
  banner_url text,
  description text,
  contact_email text,
  contact_phone text,
  address text,
  status text not null default 'pending',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create unique index if not exists vendors_slug_unique_idx on vendors (slug);
create index if not exists vendors_status_idx on vendors (status);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'vendors_status_check'
  ) then
    alter table vendors
      add constraint vendors_status_check
      check (status in ('pending', 'active', 'suspended'));
  end if;
end $$;

create table if not exists vendor_members (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendors(id) on delete cascade,
  user_id uuid not null,
  role text not null,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc'::text, now())
);

create unique index if not exists vendor_members_vendor_user_role_idx
  on vendor_members (vendor_id, user_id, role);

create index if not exists vendor_members_user_id_idx on vendor_members (user_id);
create index if not exists vendor_members_vendor_id_idx on vendor_members (vendor_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'vendor_members_role_check'
  ) then
    alter table vendor_members
      add constraint vendor_members_role_check
      check (role in ('owner', 'staff'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'vendor_members_status_check'
  ) then
    alter table vendor_members
      add constraint vendor_members_status_check
      check (status in ('active', 'invited', 'disabled'));
  end if;
end $$;

alter table if exists products
  add column if not exists vendor_id uuid references vendors(id) on delete set null;

create index if not exists products_vendor_id_idx on products (vendor_id);

create table if not exists vendor_orders (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  vendor_id uuid not null references vendors(id) on delete cascade,
  status text not null default 'Pending',
  summary jsonb not null default '{}'::jsonb,
  shipping_method jsonb,
  vendor_note text,
  admin_note text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create unique index if not exists vendor_orders_order_vendor_idx
  on vendor_orders (order_id, vendor_id);

create index if not exists vendor_orders_vendor_id_idx on vendor_orders (vendor_id);

alter table if exists order_items
  add column if not exists vendor_id uuid references vendors(id) on delete set null,
  add column if not exists vendor_order_id uuid references vendor_orders(id) on delete set null;

create index if not exists order_items_vendor_id_idx on order_items (vendor_id);
create index if not exists order_items_vendor_order_id_idx on order_items (vendor_order_id);
