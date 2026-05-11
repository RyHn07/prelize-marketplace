import ProductCard from "@/components/product/product-card";
import type { HomepageResolvedProductSection } from "@/types/product-db";

export default function ProductShowcase({ sections }: { sections: HomepageResolvedProductSection[] }) {
  if (sections.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto max-w-7xl space-y-12 px-4 py-16 sm:px-6 lg:px-8">
      {sections.map((section) => (
        <div key={section.id} className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#615FFF]">Product Section</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{section.title}</h2>
              {section.subtitle ? <p className="mt-2 text-sm text-slate-500">{section.subtitle}</p> : null}
            </div>
            <a href="/products" className="text-sm font-semibold text-slate-500 hover:text-slate-900">
              Browse all products
            </a>
          </div>

          {section.products.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {section.products.map((product) => (
                <ProductCard key={`${section.id}-${product.id}`} product={product} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
              No products matched this homepage section yet.
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
