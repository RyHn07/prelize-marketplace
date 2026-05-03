import { notFound } from "next/navigation";

import Header from "@/components/Header";
import CategoryBrowseContent from "./category-browse-content";
import { getProductCategoryOptions, getProductImageMapByProductIds, getPublicProducts } from "@/lib/products/queries";
import { mapProductDbToStorefrontProduct } from "@/lib/products/storefront";
import { getVendorOptions } from "@/lib/vendors/queries";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const [{ data: categoryOptions }, { data: vendorOptions }, { data: publicProducts }] = await Promise.all([
    getProductCategoryOptions(),
    getVendorOptions(),
    getPublicProducts(),
  ]);

  const category = categoryOptions.find((item) => item.slug === slug) ?? null;

  if (!category) {
    notFound();
  }

  const subcategories = categoryOptions
    .filter((item) => item.parent_id === category.id)
    .sort((left, right) => left.name.localeCompare(right.name));
  const categoryIds = new Set([category.id, ...subcategories.map((item) => item.id)]);
  const scopedProducts = publicProducts.filter((product) => categoryIds.has(product.category_id ?? ""));
  const { data: imageMap } = await getProductImageMapByProductIds(scopedProducts.map((product) => product.id));
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
            <span className="font-medium text-slate-700">{category.name}</span>
          </nav>
        </div>

        <CategoryBrowseContent
          category={category}
          subcategories={subcategories}
          products={storefrontProducts}
        />
      </section>
    </main>
  );
}
