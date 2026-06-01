-- Normalize legacy product gallery URLs into the relational product_images table.
-- The legacy products.gallery_images column remains available during the transition.

update public.product_images
set image_url = btrim(image_url)
where image_url <> btrim(image_url);

delete from public.product_images
where image_url = '';

delete from public.product_images extra
using public.product_images kept
where extra.product_id = kept.product_id
  and extra.image_url = kept.image_url
  and (
    coalesce(extra.sort_order, 2147483647),
    extra.created_at,
    extra.id
  ) > (
    coalesce(kept.sort_order, 2147483647),
    kept.created_at,
    kept.id
  );

create unique index if not exists product_images_product_url_unique_idx
  on public.product_images (product_id, image_url);

with legacy_gallery_images as (
  select
    products.id as product_id,
    btrim(gallery.image_url) as image_url,
    (gallery.ordinality - 1)::integer as sort_order
  from public.products products
  cross join lateral jsonb_array_elements_text(
    case
      when jsonb_typeof(products.gallery_images) = 'array' then products.gallery_images
      else '[]'::jsonb
    end
  ) with ordinality as gallery(image_url, ordinality)
  where btrim(gallery.image_url) <> ''
),
deduplicated_legacy_gallery_images as (
  select
    product_id,
    image_url,
    min(sort_order) as sort_order
  from legacy_gallery_images
  group by product_id, image_url
),
products_without_gallery_images as (
  select
    products.id as product_id,
    btrim(products.image_url) as image_url,
    0 as sort_order
  from public.products products
  where products.image_url is not null
    and btrim(products.image_url) <> ''
    and not exists (
      select 1
      from deduplicated_legacy_gallery_images legacy
      where legacy.product_id = products.id
    )
),
normalized_images as (
  select product_id, image_url, sort_order
  from deduplicated_legacy_gallery_images

  union all

  select product_id, image_url, sort_order
  from products_without_gallery_images
)
insert into public.product_images (product_id, image_url, sort_order)
select product_id, image_url, sort_order
from normalized_images
on conflict (product_id, image_url) do update
set sort_order = least(
  coalesce(public.product_images.sort_order, excluded.sort_order),
  excluded.sort_order
);
