create table if not exists public.product_media_metadata (
  path text primary key,
  alt_text text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.product_media_metadata enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'product_media_metadata'
      and policyname = 'Public read product media metadata'
  ) then
    create policy "Public read product media metadata"
      on public.product_media_metadata
      for select
      to public
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'product_media_metadata'
      and policyname = 'Authenticated insert product media metadata'
  ) then
    create policy "Authenticated insert product media metadata"
      on public.product_media_metadata
      for insert
      to authenticated
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'product_media_metadata'
      and policyname = 'Authenticated update product media metadata'
  ) then
    create policy "Authenticated update product media metadata"
      on public.product_media_metadata
      for update
      to authenticated
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'product_media_metadata'
      and policyname = 'Authenticated delete product media metadata'
  ) then
    create policy "Authenticated delete product media metadata"
      on public.product_media_metadata
      for delete
      to authenticated
      using (true);
  end if;
end $$;
