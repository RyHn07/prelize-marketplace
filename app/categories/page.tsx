import Header from "@/components/Header";
import CategoryCard from "@/components/product/category-card";
import { getProductCategoryOptions, getPublicProducts } from "@/lib/products/queries";

function createSlugFallback(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export default async function CategoriesPage() {
  const [{ data: categoryOptions, error: categoryError }, { data: publicProducts, error: productError }] =
    await Promise.all([getProductCategoryOptions(), getPublicProducts()]);

  const countByCategoryId = new Map<string, number>();
  const imageByCategoryId = new Map<string, string>();

  for (const product of publicProducts) {
    if (!product.category_id) {
      continue;
    }

    countByCategoryId.set(product.category_id, (countByCategoryId.get(product.category_id) ?? 0) + 1);

    if (!imageByCategoryId.has(product.category_id) && typeof product.image_url === "string" && product.image_url.trim()) {
      imageByCategoryId.set(product.category_id, product.image_url);
    }
  }

  const categories = categoryOptions
    .filter((category) => !category.parent_id)
    .map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug ?? createSlugFallback(category.name),
      image:
        (typeof category.image_url === "string" && category.image_url.trim() ? category.image_url : null) ??
        imageByCategoryId.get(category.id) ??
        "/file.svg",
      itemCount: `${countByCategoryId.get(category.id) ?? 0} products`,
      totalItems: countByCategoryId.get(category.id) ?? 0,
    }))
    .sort((left, right) => right.totalItems - left.totalItems || left.name.localeCompare(right.name));

  return (
    <main className="min-h-screen bg-white">
      <Header />

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#615FFF]">
            Wholesale Catalog
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Shop by Categories
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-slate-500 sm:text-base">
            Explore product groups built for Bangladesh import buyers sourcing from China. Browse
            by category first, then add products to cart and confirm shipping after order review.
          </p>
        </div>

        {categoryError || productError ? (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            We could not load some category data from Supabase. Showing currently available results only.
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      </section>
    </main>
  );
}
