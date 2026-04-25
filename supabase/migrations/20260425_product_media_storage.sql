insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-media',
  'product-media',
  true,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public read product media'
  ) then
    create policy "Public read product media"
      on storage.objects
      for select
      to public
      using (bucket_id = 'product-media');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated upload product media'
  ) then
    create policy "Authenticated upload product media"
      on storage.objects
      for insert
      to authenticated
      with check (bucket_id = 'product-media');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated update product media'
  ) then
    create policy "Authenticated update product media"
      on storage.objects
      for update
      to authenticated
      using (bucket_id = 'product-media')
      with check (bucket_id = 'product-media');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated delete product media'
  ) then
    create policy "Authenticated delete product media"
      on storage.objects
      for delete
      to authenticated
      using (bucket_id = 'product-media');
  end if;
end $$;
