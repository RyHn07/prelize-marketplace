import Header from "@/components/Header";
import ProductCatalog from "@/components/product/product-catalog";
import { getProductCategoryOptions, getPublicProducts } from "@/lib/products/queries";
import { getVendorOptions } from "@/lib/vendors/queries";
import { mapProductDbToStorefrontProduct } from "@/lib/products/storefront";

type ProductsPageProps = {
  searchParams: Promise<{ category?: string }>;
};

function formatCategoryLabel(category: string) {
  return category
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const { category } = await searchParams;
  const activeCategory =
    typeof category === "string" && category.length > 0 ? category : undefined;
  const [{ data: categoryOptions }, { data: vendorOptions }, { data: publicProducts, error }] = await Promise.all([
    getProductCategoryOptions(),
    getVendorOptions(),
    getPublicProducts(),
  ]);

  const storefrontProducts = publicProducts.map((product) =>
    mapProductDbToStorefrontProduct(product, categoryOptions, vendorOptions),
  );

  const filteredProducts = activeCategory
    ? storefrontProducts.filter((product) => product.category === activeCategory)
    : storefrontProducts;

  const breadcrumbCategory = activeCategory ? formatCategoryLabel(activeCategory) : "Bags";

  return (
    <main className="min-h-screen bg-white">
      <Header />

      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="mb-4">
          <nav className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>Home</span>
            <span>&gt;</span>
            <span>Categories</span>
            <span>&gt;</span>
            <span>{breadcrumbCategory}</span>
            <span>&gt;</span>
            <span className="font-medium text-slate-700">Crossbody Bags</span>
          </nav>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            We could not load some catalog data from Supabase. Showing currently available results only.
          </div>
        ) : null}

        <ProductCatalog products={filteredProducts} />
      </section>
    </main>
  );
}
