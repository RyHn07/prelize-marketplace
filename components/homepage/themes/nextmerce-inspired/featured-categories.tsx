import CategoryCard from "@/components/product/category-card";
import type { Category } from "@/types/product";

export default function FeaturedCategories({ categories }: { categories: Category[] }) {
  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto max-w-7xl space-y-8 px-4 py-16 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#615FFF]">Browse Faster</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Featured Categories</h2>
        </div>
        <a href="/categories" className="text-sm font-semibold text-slate-500 hover:text-slate-900">
          See all categories
        </a>
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {categories.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>
    </section>
  );
}
