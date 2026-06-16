import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import Header from "@/components/Header";
import ProductCard from "@/components/product/product-card";
import ProductImageGallery from "@/components/product/product-image-gallery";
import ProductDetailsPurchasePanel from "@/components/product/product-details-purchase-panel";
import ProductDetailsTabs from "@/components/product/product-details-tabs";
import { getActiveCndsShippingProfileById } from "@/lib/cnds/server";
import { query } from "@/lib/db";
import { getActiveInternationalShippingMethodsForServer } from "@/lib/international-shipping/server";
import {
  getProductCategoryOptions,
  getProductImagesByProductId,
  getProductImageMapByProductIds,
  getProductSpecsByProductId,
  getPublicProductDetailBySlug,
  getPublicProductSoldCount,
  getPublicProducts,
  getResolvedProductPricingMapByProducts,
} from "@/lib/products/queries";
import { getCategoryById, mapProductDbToStorefrontProduct } from "@/lib/products/storefront";
import { getProductReviewSummaryMap, listProductReviews, mapReviewRowToStorefrontReview } from "@/lib/reviews";
import { getVendorOptions } from "@/lib/vendors/queries";
import { absoluteUrl, createPageMetadata, toJsonLdScriptContent } from "@/lib/seo";
import { hasPgDataClientEnv } from "@/lib/browser-app-client";
import type { ProductSpecification } from "@/types/product";
import type {
  CndsShippingProfileRow,
  CndsShippingTierRow,
  InternationalShippingMethodRow,
  InternationalShippingTierRow,
  ProductCategoryOption,
  ProductDbRow,
  ProductDbVariantRow,
  ProductImageRow,
  ProductPricingTierRow,
  ProductPricingTierSetRow,
  ProductPricingTierSetTierRow,
  ProductPricingType,
  ProductReviewRow,
  ProductSpecRow,
  ProductVendorOption,
  ResolvedProductPricingConfig,
  ResolvedProductPricingTier,
} from "@/types/product-db";

export const dynamic = "force-dynamic";

function isStorefrontSpecification(value: unknown): value is ProductSpecification {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "label" in value &&
    "value" in value &&
    typeof value.label === "string" &&
    typeof value.value === "string"
  );
}

function getFallbackSpecifications(specifications: unknown): ProductSpecification[] {
  if (!Array.isArray(specifications)) {
    return [];
  }

  return specifications.filter(isStorefrontSpecification);
}

type ProductDetailsPageProps = {
  params: Promise<{ slug: string }>;
};

function createProductMetaDescription(product: { name: string; short_description?: string | null; description?: string | null }) {
  const source =
    product.short_description?.trim() ||
    product.description?.replace(/\s+/g, " ").trim() ||
    `Source ${product.name} wholesale on Prelize with vendor, MOQ, shipping, and product details.`;

  return source.length > 155 ? `${source.slice(0, 152).trim()}...` : source;
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeLocalPricingType(value: unknown): ProductPricingType {
  return value === "fixed" ? "fixed" : "unit";
}

function mapLocalPricingTier(row: ProductPricingTierRow | ProductPricingTierSetTierRow): ResolvedProductPricingTier {
  return {
    id: row.id,
    min_qty: Math.max(1, toNumber(row.min_qty, 1)),
    max_qty: row.max_qty === null || row.max_qty === undefined ? null : Math.max(1, toNumber(row.max_qty, 1)),
    price: Math.max(0, toNumber(row.price)),
    sort_order: row.sort_order ?? null,
  };
}

function normalizeLocalProduct(row: ProductDbRow): ProductDbRow {
  return {
    ...row,
    price: toNumber(row.price),
    moq: toNumber(row.moq, 1),
    is_active: row.is_active !== false,
    status: row.status ?? "active",
    product_type: row.product_type ?? "single",
    gallery_images: Array.isArray(row.gallery_images) ? row.gallery_images : [],
    attributes: Array.isArray(row.attributes) ? row.attributes : [],
    cdd_shipping_profile: row.cdd_shipping_profile ?? "standard",
    regular_price: row.regular_price === null || row.regular_price === undefined ? null : toNumber(row.regular_price),
    discount_price: row.discount_price === null || row.discount_price === undefined ? null : toNumber(row.discount_price),
    buying_price_cny: row.buying_price_cny === null || row.buying_price_cny === undefined ? null : toNumber(row.buying_price_cny),
    profit_percent: row.profit_percent === null || row.profit_percent === undefined ? null : toNumber(row.profit_percent),
    profit_amount_cny: row.profit_amount_cny === null || row.profit_amount_cny === undefined ? null : toNumber(row.profit_amount_cny),
    selling_price_cny: row.selling_price_cny === null || row.selling_price_cny === undefined ? null : toNumber(row.selling_price_cny),
    exchange_rate_cny_to_bdt:
      row.exchange_rate_cny_to_bdt === null || row.exchange_rate_cny_to_bdt === undefined
        ? null
        : toNumber(row.exchange_rate_cny_to_bdt),
  };
}

function normalizeLocalVariant(row: ProductDbVariantRow): ProductDbVariantRow {
  return {
    ...row,
    price: toNumber(row.price),
    regular_price: row.regular_price === null || row.regular_price === undefined ? null : toNumber(row.regular_price),
    discount_price: row.discount_price === null || row.discount_price === undefined ? null : toNumber(row.discount_price),
    moq: toNumber(row.moq, 1),
    stock: toNumber(row.stock, 0),
    weight: row.weight === null || row.weight === undefined ? null : toNumber(row.weight),
    min_order_quantity:
      row.min_order_quantity === null || row.min_order_quantity === undefined ? null : toNumber(row.min_order_quantity),
    attribute_values: row.attribute_values ?? {},
  };
}

async function getLocalProductDetailBySlug(slug: string) {
  const productResult = await query<ProductDbRow>(
    `
      select
        id, vendor_id, category_id, brand_id, name, slug, sku, description,
        coalesce(image_url, image) as image_url,
        coalesce(price, price_from, 0)::float8 as price,
        coalesce(moq, 1)::int as moq,
        coalesce(weight::text, '') as weight,
        badge, coalesce(is_active, true) as is_active, created_at, status, product_type,
        regular_price::float8 as regular_price, discount_price::float8 as discount_price,
        gallery_images, attributes, cdd_shipping_profile, short_description, specifications,
        reviews, cnds_profile_id, pricing_tier_profile_id, pricing_source,
        buying_price_cny::float8 as buying_price_cny,
        profit_percent::float8 as profit_percent,
        profit_amount_cny::float8 as profit_amount_cny,
        selling_price_cny::float8 as selling_price_cny,
        exchange_rate_cny_to_bdt::float8 as exchange_rate_cny_to_bdt
      from public.products
      where slug = $1 and coalesce(is_active, true) = true and coalesce(status, 'active') = 'active'
      limit 1
    `,
    [slug],
  );
  const product = productResult.rows[0] ? normalizeLocalProduct(productResult.rows[0]) : null;

  if (!product) {
    return null;
  }

  const [
    variantsResult,
    imagesResult,
    specsResult,
    categoryResult,
    vendorResult,
    allProductsResult,
    reviewsResult,
    soldCountResult,
    pricingTiersResult,
    pricingTierSetsResult,
    pricingTierSetRowsResult,
    cndsTierResult,
    shippingMethodsResult,
    shippingTiersResult,
  ] = await Promise.all([
    query<ProductDbVariantRow>(
      `
        select
          id, product_id, name, value, sku,
          regular_price::float8 as regular_price,
          discount_price::float8 as discount_price,
          price::float8 as price,
          moq, stock, weight::float8 as weight, image_url,
          min_order_quantity, is_active, sort_order, pricing_tier_set_id,
          attribute_values, created_at
        from public.product_variants
        where product_id = $1 and coalesce(is_active, true) = true
        order by sort_order asc nulls last, created_at asc
      `,
      [product.id],
    ),
    query<ProductImageRow>(
      `
        select id, product_id, image_url, sort_order, created_at
        from public.product_images
        where product_id = $1
        order by sort_order asc, created_at asc
      `,
      [product.id],
    ),
    query<ProductSpecRow>(
      `
        select id, product_id, label, value, sort_order, created_at
        from public.product_specs
        where product_id = $1
        order by sort_order asc, created_at asc
      `,
      [product.id],
    ),
    query<ProductCategoryOption>(
      `
        select id, name, slug, parent_id, coalesce(image_url, image) as image_url
        from public.categories
        order by name asc
      `,
    ),
    query<ProductVendorOption>("select id, name, slug, status from public.vendors order by name asc"),
    query<ProductDbRow>(
      `
        select
          id, vendor_id, category_id, brand_id, name, slug, sku, description,
          coalesce(image_url, image) as image_url,
          coalesce(price, price_from, 0)::float8 as price,
          coalesce(moq, 1)::int as moq,
          coalesce(weight::text, '') as weight,
          badge, coalesce(is_active, true) as is_active, created_at, status, product_type,
          regular_price::float8 as regular_price, discount_price::float8 as discount_price,
          gallery_images, attributes, cdd_shipping_profile, short_description, specifications,
          reviews, cnds_profile_id, pricing_tier_profile_id, pricing_source,
          buying_price_cny::float8 as buying_price_cny,
          profit_percent::float8 as profit_percent,
          profit_amount_cny::float8 as profit_amount_cny,
          selling_price_cny::float8 as selling_price_cny,
          exchange_rate_cny_to_bdt::float8 as exchange_rate_cny_to_bdt
        from public.products
        where coalesce(is_active, true) = true and coalesce(status, 'active') = 'active'
        order by created_at desc
      `,
    ),
    query<ProductReviewRow>(
      `
        select id, product_id, vendor_id, order_id, order_item_id, user_id, user_email, rating, title, comment, created_at, updated_at
        from public.product_reviews
        where product_id = $1
        order by created_at desc
      `,
      [product.id],
    ),
    query<{ sold_count: string }>("select public.get_public_product_sold_count($1)::text as sold_count", [product.id]),
    query<ProductPricingTierRow>(
      `
        select
          id, product_id, pricing_type, min_qty, max_qty,
          price::float8 as price, sort_order, created_at
        from public.product_pricing_tiers
        where product_id = $1
        order by min_qty asc, sort_order asc nulls last, created_at asc
      `,
      [product.id],
    ),
    query<ProductPricingTierSetRow>(
      `
        select
          id, product_id, name, fallback_price::float8 as fallback_price,
          pricing_type, sort_order, created_at
        from public.product_pricing_tier_sets
        where product_id = $1
        order by sort_order asc nulls last, created_at asc
      `,
      [product.id],
    ),
    query<ProductPricingTierSetTierRow>(
      `
        select
          rows.id, rows.tier_set_id, rows.min_qty, rows.max_qty,
          rows.price::float8 as price, rows.sort_order, rows.created_at
        from public.product_pricing_tier_set_rows rows
        join public.product_pricing_tier_sets sets on sets.id = rows.tier_set_id
        where sets.product_id = $1
        order by rows.sort_order asc nulls last, rows.min_qty asc, rows.created_at asc
      `,
      [product.id],
    ),
    product.cnds_profile_id
      ? query<CndsShippingTierRow>(
          `
            select id, profile_id, min_qty, max_qty, price::float8 as price, sort_order, created_at
            from public.cnds_shipping_tiers
            where profile_id = $1
            order by sort_order asc, min_qty asc
          `,
          [product.cnds_profile_id],
        )
      : Promise.resolve({ rows: [] as CndsShippingTierRow[] }),
    query<InternationalShippingMethodRow>(
      `
        select id, name, slug, description, delivery_min_days, delivery_max_days,
               minimum_weight_kg::float8 as minimum_weight_kg, is_active, sort_order, created_at
        from public.international_shipping_methods
        where is_active = true
        order by sort_order asc, created_at desc
      `,
    ),
    query<InternationalShippingTierRow>(
      `
        select id, method_id, min_weight_kg::float8 as min_weight_kg, max_weight_kg::float8 as max_weight_kg,
               price_per_kg::float8 as price_per_kg, sort_order, created_at
        from public.international_shipping_tiers
        order by sort_order asc
      `,
    ),
  ]);

  const cndsProfile = product.cnds_profile_id
    ? await query<Omit<CndsShippingProfileRow, "tiers">>(
        `
          select id, vendor_id, name, description, pricing_type, is_active, created_at
          from public.cnds_shipping_profiles
          where id = $1 and is_active = true
          limit 1
        `,
        [product.cnds_profile_id],
      ).then((result) =>
        result.rows[0]
          ? {
              ...result.rows[0],
              tiers: cndsTierResult.rows.map((tier) => ({ ...tier, price: toNumber(tier.price) })),
            }
          : null,
      )
    : null;

  const tiersByMethodId = new Map<string, InternationalShippingTierRow[]>();

  for (const tier of shippingTiersResult.rows) {
    const current = tiersByMethodId.get(tier.method_id) ?? [];
    current.push({
      ...tier,
      min_weight_kg: toNumber(tier.min_weight_kg),
      max_weight_kg: tier.max_weight_kg === null ? null : toNumber(tier.max_weight_kg),
      price_per_kg: toNumber(tier.price_per_kg),
    });
    tiersByMethodId.set(tier.method_id, current);
  }

  const internationalShippingMethods = shippingMethodsResult.rows.map((method) => ({
    ...method,
    minimum_weight_kg: toNumber(method.minimum_weight_kg),
    tiers: tiersByMethodId.get(method.id) ?? [],
  }));

  const productPricingConfig: ResolvedProductPricingConfig = {
    source:
      pricingTiersResult.rows.length > 0 || pricingTierSetsResult.rows.length > 0
        ? "legacy"
        : null,
    profile_id: null,
    profile_name: null,
    pricing_type:
      pricingTiersResult.rows.length > 0
        ? normalizeLocalPricingType(pricingTiersResult.rows[0]?.pricing_type)
        : null,
    tiers: pricingTiersResult.rows.map(mapLocalPricingTier),
    variant_tier_sets: pricingTierSetsResult.rows.map((set) => ({
      id: set.id,
      name: set.name,
      fallback_price: Math.max(0, toNumber(set.fallback_price)),
      pricing_type: normalizeLocalPricingType(set.pricing_type),
      tiers: pricingTierSetRowsResult.rows
        .filter((row) => row.tier_set_id === set.id)
        .map(mapLocalPricingTier),
      sort_order: set.sort_order ?? null,
    })),
    variant_assignments: variantsResult.rows.map((variant) => ({
      variant_id: variant.id,
      tier_set_id: variant.pricing_tier_set_id ?? null,
    })),
  };

  return {
    product,
    variants: variantsResult.rows.map(normalizeLocalVariant),
    productImages: imagesResult.rows,
    productSpecs: specsResult.rows,
    categoryOptions: categoryResult.rows,
    vendorOptions: vendorResult.rows,
    publicProducts: allProductsResult.rows.map(normalizeLocalProduct),
    productReviews: reviewsResult.rows,
    soldCount: Number(soldCountResult.rows[0]?.sold_count ?? 0),
    cndsProfile,
    internationalShippingMethods,
    productPricingConfig,
  };
}

export async function generateMetadata({ params }: ProductDetailsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const productDetail = hasPgDataClientEnv()
    ? (await getPublicProductDetailBySlug(slug)).data
    : await getLocalProductDetailBySlug(slug);

  if (!productDetail) {
    return {
      title: "Product",
    };
  }

  const product = productDetail.product;
  const image = product.gallery_images?.[0] ?? product.image_url;

  return createPageMetadata({
    title: product.name,
    description: createProductMetaDescription(product),
    path: `/products/${product.slug}`,
    image,
  });
}

export default async function ProductDetailsPage({ params }: ProductDetailsPageProps) {
  const { slug } = await params;
  if (!hasPgDataClientEnv()) {
    const localData = await getLocalProductDetailBySlug(slug);

    if (!localData) {
      notFound();
    }

    const {
      product: productRow,
      variants,
      productImages,
      productSpecs,
      categoryOptions,
      vendorOptions,
      publicProducts,
      productReviews,
      soldCount,
      cndsProfile,
      internationalShippingMethods,
      productPricingConfig,
    } = localData;
    const galleryFromTable = productImages.map((item) => item.image_url).filter(Boolean);
    const fallbackGallery =
      productRow.gallery_images && productRow.gallery_images.length > 0
        ? productRow.gallery_images
        : productRow.image_url
          ? [productRow.image_url]
          : [];
    const gallery = galleryFromTable.length > 0 ? galleryFromTable : fallbackGallery;
    const specifications: ProductSpecification[] =
      productSpecs.length > 0
        ? productSpecs
            .map((item) => ({
              label: item.label,
              value: item.value,
            }))
            .filter((item) => item.label.trim().length > 0 || item.value.trim().length > 0)
        : getFallbackSpecifications(productRow.specifications);
    const baseProduct = mapProductDbToStorefrontProduct(productRow, categoryOptions, vendorOptions);
    const product = {
      ...baseProduct,
      image: gallery[0] ?? baseProduct.image,
      gallery: gallery.length > 0 ? gallery : [baseProduct.image],
      specifications,
      reviews: productReviews.map(mapReviewRowToStorefrontReview),
    };
    const category = getCategoryById(productRow.category_id, categoryOptions);
    const relatedProductRows = publicProducts
      .filter((item) => item.category_id === productRow.category_id && item.slug !== productRow.slug)
      .slice(0, 4);
    const relatedProducts = relatedProductRows.map((item) =>
      mapProductDbToStorefrontProduct(item, categoryOptions, vendorOptions),
    );
    const categoryHref = category?.slug ? `/categories/${category.slug}` : "/categories";
    const productJsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      image: product.gallery.filter(Boolean),
      description: createProductMetaDescription(productRow),
      sku: productRow.sku ?? undefined,
      category: category?.name,
      url: absoluteUrl(`/products/${productRow.slug}`),
      offers: {
        "@type": "Offer",
        url: absoluteUrl(`/products/${productRow.slug}`),
        price: productRow.price,
        priceCurrency: "BDT",
        availability: productRow.is_active ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      },
    };

    return (
      <main className="min-h-screen bg-white">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toJsonLdScriptContent(productJsonLd) }}
        />
        <Header />

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6">
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <Link href="/" className="transition-colors hover:text-[#615FFF]">
                Home
              </Link>
              <span>&gt;</span>
              <Link href="/categories" className="transition-colors hover:text-[#615FFF]">
                Categories
              </Link>
              <span>&gt;</span>
              <Link href={categoryHref} className="transition-colors hover:text-[#615FFF]">
                {category?.name ?? "Catalog"}
              </Link>
              <span>&gt;</span>
              <span aria-current="page" className="font-medium text-slate-700">
                {product.name}
              </span>
            </nav>
          </div>

          <div className="grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.95fr)_minmax(0,0.8fr)]">
            <ProductImageGallery
              productId={product.id}
              productName={product.name}
              mainImage={product.image}
              galleryImages={product.gallery}
            />

            <ProductDetailsPurchasePanel
              product={product}
              productRecord={productRow}
              variants={variants}
              productPricingConfig={productPricingConfig}
              cndsProfile={cndsProfile}
              internationalShippingMethods={internationalShippingMethods}
              soldCount={soldCount}
            />
          </div>

          <ProductDetailsTabs product={product} variants={variants} />

          {relatedProducts.length > 0 ? (
            <section className="mt-10 space-y-5">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  Related Products
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Similar wholesale products you can source from the same category.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
                {relatedProducts.map((relatedProduct) => (
                  <ProductCard key={relatedProduct.id} product={relatedProduct} />
                ))}
              </div>
            </section>
          ) : null}
        </section>
      </main>
    );
  }

  const [{ data: categoryOptions }, { data: vendorOptions }, { data: productDetail }, { data: publicProducts }] = await Promise.all([
    getProductCategoryOptions(),
    getVendorOptions(),
    getPublicProductDetailBySlug(slug),
    getPublicProducts(),
  ]);

  if (!productDetail) {
    notFound();
  }

  const { product: productRow, variants } = productDetail;
  const [{ data: productImages }, { data: productSpecs }, { data: resolvedPricingMap }, { data: cndsProfile }, { data: internationalShippingMethods }, { data: productReviews }, { data: soldCount }] = await Promise.all([
    getProductImagesByProductId(productRow.id),
    getProductSpecsByProductId(productRow.id),
    getResolvedProductPricingMapByProducts([productRow]),
    getActiveCndsShippingProfileById(productRow.cnds_profile_id),
    getActiveInternationalShippingMethodsForServer(),
    listProductReviews(productRow.id),
    getPublicProductSoldCount(productRow.id),
  ]);
  const productPricingConfig = resolvedPricingMap.get(productRow.id) ?? {
    source: null,
    profile_id: null,
    profile_name: null,
    pricing_type: null,
    tiers: [],
  };
  const galleryFromTable = productImages.map((item) => item.image_url).filter(Boolean);
  const fallbackGallery =
    productRow.gallery_images && productRow.gallery_images.length > 0
      ? productRow.gallery_images
      : productRow.image_url
        ? [productRow.image_url]
        : [];
  const gallery = galleryFromTable.length > 0 ? galleryFromTable : fallbackGallery;
  const specifications: ProductSpecification[] =
    productSpecs.length > 0
      ? productSpecs
          .map((item) => ({
            label: item.label,
            value: item.value,
          }))
          .filter((item) => item.label.trim().length > 0 || item.value.trim().length > 0)
      : getFallbackSpecifications(productRow.specifications);
  const baseProduct = mapProductDbToStorefrontProduct(productRow, categoryOptions, vendorOptions);
  const product = {
    ...baseProduct,
    image: gallery[0] ?? baseProduct.image,
    gallery: gallery.length > 0 ? gallery : [baseProduct.image],
    specifications,
    reviews: productReviews.map(mapReviewRowToStorefrontReview),
  };
  const category = getCategoryById(productRow.category_id, categoryOptions);
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.gallery.filter(Boolean),
    description: createProductMetaDescription(productRow),
    sku: productRow.sku ?? undefined,
    category: category?.name,
    url: absoluteUrl(`/products/${productRow.slug}`),
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/products/${productRow.slug}`),
      price: productRow.price,
      priceCurrency: "USD",
      availability: productRow.is_active ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };
  const relatedProductRows = publicProducts
    .filter((item) => item.category_id === productRow.category_id && item.slug !== productRow.slug)
    .slice(0, 4);
  const relatedProductIds = relatedProductRows.map((item) => item.id);
  const [{ data: relatedImageMap }, { data: relatedReviewSummaryMap }] = await Promise.all([
    getProductImageMapByProductIds(relatedProductIds),
    getProductReviewSummaryMap(relatedProductIds),
  ]);
  const relatedProducts = relatedProductRows.map((item) =>
    mapProductDbToStorefrontProduct(
      {
        ...item,
        gallery_images:
          relatedImageMap.get(item.id) ??
          (Array.isArray(item.gallery_images) ? item.gallery_images : item.image_url ? [item.image_url] : []),
      },
      categoryOptions,
      vendorOptions,
      relatedReviewSummaryMap.get(item.id),
    ),
  );
  const categoryHref = category?.slug ? `/categories/${category.slug}` : "/categories";

  return (
    <main className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLdScriptContent(productJsonLd) }}
      />
      <Header />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <Link href="/" className="transition-colors hover:text-[#615FFF]">
              Home
            </Link>
            <span>&gt;</span>
            <Link href="/categories" className="transition-colors hover:text-[#615FFF]">
              Categories
            </Link>
            <span>&gt;</span>
            <Link href={categoryHref} className="transition-colors hover:text-[#615FFF]">
              {category?.name ?? "Catalog"}
            </Link>
            <span>&gt;</span>
            <span aria-current="page" className="font-medium text-slate-700">
              {product.name}
            </span>
          </nav>
        </div>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.95fr)_minmax(0,0.8fr)]">
          <ProductImageGallery
            productId={product.id}
            productName={product.name}
            mainImage={product.image}
            galleryImages={product.gallery}
          />

          <ProductDetailsPurchasePanel
          product={product}
          productRecord={productRow}
          variants={variants}
          productPricingConfig={productPricingConfig}
          cndsProfile={cndsProfile}
          internationalShippingMethods={internationalShippingMethods}
          soldCount={soldCount}
        />
        </div>

        <ProductDetailsTabs product={product} variants={variants} />

        {relatedProducts.length > 0 ? (
          <section className="mt-10 space-y-5">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                Related Products
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Similar wholesale products you can source from the same category.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} />
              ))}
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}
