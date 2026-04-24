import Header from "@/components/Header";
import CategoryCard from "@/components/product/category-card";
import { mockCategories } from "@/data/mock-categories";

export default function CategoriesPage() {
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

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {mockCategories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      </section>
    </main>
  );
}
