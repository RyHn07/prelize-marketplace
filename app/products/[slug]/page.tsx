import { notFound } from "next/navigation";

import Header from "@/components/Header";
import ProductCard from "@/components/product/product-card";
import ProductImageGallery from "@/components/product/product-image-gallery";
import ProductDetailsPurchasePanel from "@/components/product/product-details-purchase-panel";
import ProductDetailsTabs from "@/components/product/product-details-tabs";
import { getActiveCndsShippingProfileById } from "@/lib/cnds/server";
import { getActiveInternationalShippingMethodsForServer } from "@/lib/international-shipping/server";
import {
  getProductCategoryOptions,
  getProductImagesByProductId,
  getProductImageMapByProductIds,
  getProductSpecsByProductId,
  getPublicProductDetailBySlug,
  getPublicProducts,
  getResolvedProductPricingMapByProducts,
} from "@/lib/products/queries";
import { getCategoryById, mapProductDbToStorefrontProduct } from "@/lib/products/storefront";
import { listProductReviews, mapReviewRowToStorefrontReview } from "@/lib/reviews";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import { getVendorOptions } from "@/lib/vendors/queries";
import type { ProductSpecification } from "@/types/product";

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

export default async function ProductDetailsPage({ params }: ProductDetailsPageProps) {
  const { slug } = await params;
  const supabase = getSupabaseServiceRoleClient();
  const [{ data: categoryOptions }, { data: vendorOptions }, { data: productDetail }, { data: publicProducts }] = await Promise.all([
    getProductCategoryOptions(),
    getVendorOptions(),
    getPublicProductDetailBySlug(slug, supabase),
    getPublicProducts(),
  ]);

  if (!productDetail) {
    notFound();
  }

  const { product: productRow, variants } = productDetail;
  const [{ data: productImages }, { data: productSpecs }, { data: resolvedPricingMap }, { data: cndsProfile }, { data: internationalShippingMethods }, { data: productReviews }] = await Promise.all([
    getProductImagesByProductId(productRow.id),
    getProductSpecsByProductId(productRow.id),
    getResolvedProductPricingMapByProducts([productRow], supabase),
    getActiveCndsShippingProfileById(productRow.cnds_profile_id),
    getActiveInternationalShippingMethodsForServer(),
    listProductReviews(productRow.id, supabase),
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
  const relatedProductRows = publicProducts
    .filter((item) => item.category_id === productRow.category_id && item.slug !== productRow.slug)
    .slice(0, 4);
  const { data: relatedImageMap } = await getProductImageMapByProductIds(
    relatedProductRows.map((item) => item.id),
  );
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
    ),
  );

  return (
    <main className="min-h-screen bg-white">
      <Header />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <nav className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>Home</span>
            <span>&gt;</span>
            <span>Categories</span>
            <span>&gt;</span>
            <span>{category?.name ?? "Catalog"}</span>
            <span>&gt;</span>
            <span className="font-medium text-slate-700">{product.name}</span>
          </nav>
        </div>

        <div className="grid gap-8 xl:grid-cols-[1.15fr_0.95fr_0.8fr]">
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
