import Header from "@/components/Header";
import ProductCatalog from "@/components/product/product-catalog";
import {
  getProductCategoryOptions,
  getProductImageMapByProductIds,
  getPublicProductsByBrowseParams,
  type ProductBrowseSort,
} from "@/lib/products/queries";
import { mapProductDbToStorefrontProduct } from "@/lib/products/storefront";
import { getVendorOptions } from "@/lib/vendors/queries";

type ProductsPageProps = {
  searchParams: Promise<{
    search?: string;
    category?: string;
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

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const [
    {
      data: publicProducts,
      error,
      totalCount,
      page,
      limit,
      availableMinPrice,
      availableMaxPrice,
    },
    { data: categoryOptions },
    { data: vendorOptions },
  ] =
    await Promise.all([
      getPublicProductsByBrowseParams(params),
      getProductCategoryOptions(),
      getVendorOptions(),
    ]);
  const { data: imageMap } = await getProductImageMapByProductIds(publicProducts.map((product) => product.id));

  const storefrontProducts = publicProducts.map((product) =>
    mapProductDbToStorefrontProduct(
      {
        ...product,
        gallery_images:
          imageMap.get(product.id) ??
          (Array.isArray(product.gallery_images) ? product.gallery_images : product.image_url ? [product.image_url] : []),
      },
      categoryOptions,
      vendorOptions,
    ),
  );

  return (
    <main className="min-h-screen bg-white">
      <Header />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {error ? (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            We could not load some catalog data from Supabase. Showing currently available results only.
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
            search: typeof params.search === "string" ? params.search : "",
            category: typeof params.category === "string" ? params.category : "",
            min: typeof params.min === "string" ? params.min : "",
            max: typeof params.max === "string" ? params.max : "",
            moq: typeof params.moq === "string" ? params.moq : "",
            vendor: typeof params.vendor === "string" ? params.vendor : "",
            sort: params.sort ?? "newest",
            page: String(page),
            limit: String(limit),
          }}
        />
      </section>
    </main>
  );
}
