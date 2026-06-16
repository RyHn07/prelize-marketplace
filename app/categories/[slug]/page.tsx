import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import Header from "@/components/Header";
import ProductCatalog from "@/components/product/product-catalog";
import {
  type ProductBrowseSort,
} from "@/lib/products/queries";
import {
  getServerProductCategoryBySlug,
  getServerProductCategoryOptions,
  getServerProductImageMapByProductIds,
  getServerProductReviewSummaryMap,
  getServerPublicProductsByBrowseParams,
} from "@/lib/products/server-catalog";
import { mapProductDbToStorefrontProduct } from "@/lib/products/storefront";
import { getServerVendorOptions } from "@/lib/vendors/server-queries";
import { createPageMetadata } from "@/lib/seo";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    search?: string;
    subcategory?: string;
    min?: string;
    max?: string;
    moq?: string;
    vendor?: string;
    sort?: ProductBrowseSort;
    page?: string;
    limit?: string;
  }>;
};

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { data: category } = await getServerProductCategoryBySlug(slug);

  if (!category) {
    return {
      title: "Category",
    };
  }

  return createPageMetadata({
    title: `${category.name} Wholesale Products`,
    description: `Browse ${category.name} wholesale products, vendors, prices, and MOQ options on Prelize.`,
    path: `/categories/${category.slug ?? slug}`,
    image: category.image_url,
  });
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const filters = await searchParams;
  const [{ data: category }, { data: categoryOptions }, { data: vendorOptions }] = await Promise.all([
    getServerProductCategoryBySlug(slug),
    getServerProductCategoryOptions(),
    getServerVendorOptions(),
  ]);

  if (!category) {
    notFound();
  }
  const {
    data: scopedProducts,
    error,
    totalCount,
    page,
    limit,
    availableMinPrice,
    availableMaxPrice,
  } = await getServerPublicProductsByBrowseParams({
    ...filters,
    category: slug,
  });
  const productIds = scopedProducts.map((product) => product.id);
  const [{ data: imageMap }, { data: reviewSummaryMap }] = await Promise.all([
    getServerProductImageMapByProductIds(productIds),
    getServerProductReviewSummaryMap(productIds),
  ]);
  const storefrontProducts = scopedProducts.map((product) =>
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
            <span aria-current="page" className="font-medium text-slate-700">
              {category.name}
            </span>
          </nav>
        </div>

        {error ? (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            We could not load some category data from DataClient. Showing currently available results only.
          </div>
        ) : null}

        <ProductCatalog
          products={storefrontProducts}
          totalCount={totalCount}
          categories={categoryOptions}
          vendors={vendorOptions}
          availableMinPrice={availableMinPrice}
          availableMaxPrice={availableMaxPrice}
          currentFilters={{
            search: typeof filters.search === "string" ? filters.search : "",
            category: slug,
            min: typeof filters.min === "string" ? filters.min : "",
            max: typeof filters.max === "string" ? filters.max : "",
            moq: typeof filters.moq === "string" ? filters.moq : "",
            vendor: typeof filters.vendor === "string" ? filters.vendor : "",
            sort: filters.sort ?? "newest",
            page: String(page),
            limit: String(limit),
          }}
        />
      </section>
    </main>
  );
}
