import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import Header from "@/components/Header";
import ProductCard from "@/components/product/product-card";
import { mapProductDbToStorefrontProduct } from "@/lib/products/storefront";
import { getProductReviewSummaryMap } from "@/lib/reviews";
import {
  getProductCategoryOptions,
  getProductImageMapByProductIds,
  getPublicProductsByVendorId,
} from "@/lib/products/queries";
import { getVendorBySlug, getVendorOptions } from "@/lib/vendors/queries";

export const dynamic = "force-dynamic";

type VendorStorefrontPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: VendorStorefrontPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { data: vendor } = await getVendorBySlug(slug);

  if (!vendor) {
    return {
      title: "Vendor | Prelize",
    };
  }

  return {
    title: `${vendor.name} | Prelize`,
    description: vendor.description ?? `Browse products from ${vendor.name} on Prelize.`,
  };
}

export default async function VendorStorefrontPage({ params }: VendorStorefrontPageProps) {
  const { slug } = await params;
  const { data: vendor, error: vendorError } = await getVendorBySlug(slug);

  if (vendorError || !vendor) {
    notFound();
  }

  const [{ data: products, error: productsError }, { data: categoryOptions }, { data: vendorOptions }] = await Promise.all([
    getPublicProductsByVendorId(vendor.id),
    getProductCategoryOptions(),
    getVendorOptions(),
  ]);
  const productIds = products.map((product) => product.id);
  const [{ data: imageMap }, { data: reviewSummaryMap }] = await Promise.all([
    getProductImageMapByProductIds(productIds),
    getProductReviewSummaryMap(productIds),
  ]);

  const storefrontProducts = products.map((product) =>
    mapProductDbToStorefrontProduct(
      {
        ...product,
        gallery_images:
          imageMap.get(product.id) ??
          (Array.isArray(product.gallery_images) ? product.gallery_images : product.image_url ? [product.image_url] : []),
      },
      categoryOptions,
      vendorOptions,
      reviewSummaryMap.get(product.id),
    ),
  );

  return (
    <main className="min-h-screen bg-white">
      <Header />

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div
            className="h-40 bg-slate-100 bg-cover bg-center sm:h-52"
            style={{
              backgroundImage: vendor.banner_url ? `url("${vendor.banner_url}")` : "linear-gradient(135deg, rgba(97,95,255,0.16), rgba(15,23,42,0.04))",
            }}
          />

          <div className="px-5 pb-6 sm:px-8">
            <div className="flex flex-col gap-4 sm:-mt-10 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex min-w-0 items-end gap-4">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-slate-100 text-lg font-semibold text-slate-500 shadow-sm">
                  {vendor.logo_url ? (
                    <div
                      role="img"
                      aria-label={vendor.name}
                      className="h-full w-full bg-cover bg-center"
                      style={{ backgroundImage: `url("${vendor.logo_url}")` }}
                    />
                  ) : (
                    vendor.name.slice(0, 1).toUpperCase()
                  )}
                </div>

                <div className="min-w-0 pb-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#615FFF]">Vendor Storefront</p>
                  <h1 className="mt-2 truncate text-3xl font-semibold tracking-tight text-slate-900">{vendor.name}</h1>
                  <p className="mt-2 text-sm text-slate-500">
                    {vendor.contact_email ?? vendor.contact_phone ?? "Wholesale supplier on Prelize"}
                  </p>
                </div>
              </div>

              <div className="pb-1">
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/30 hover:text-slate-900"
                >
                  Browse All Products
                </Link>
              </div>
            </div>

            <div className="mt-5 max-w-3xl">
              <p className="text-sm leading-7 text-slate-600">
                {vendor.description?.trim() || "This vendor has not added a public description yet."}
              </p>
            </div>
          </div>
        </div>

        {productsError ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Some vendor products could not be loaded right now. Please try again later.
          </div>
        ) : null}

        <div className="mt-8 space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#615FFF]">Catalog</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-900">Products from {vendor.name}</h2>
            </div>
            <p className="text-sm text-slate-500">{storefrontProducts.length} product{storefrontProducts.length === 1 ? "" : "s"}</p>
          </div>

          {storefrontProducts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
              <h3 className="text-xl font-semibold text-slate-900">No active products yet</h3>
              <p className="mt-2 text-sm text-slate-500">
                This vendor does not have any public products available right now.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {storefrontProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
