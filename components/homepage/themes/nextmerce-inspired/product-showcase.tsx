import ProductCard from "@/components/product/product-card";
import type { HomepageResolvedProductSection } from "@/types/product-db";

export default function ProductShowcase({ sections }: { sections: HomepageResolvedProductSection[] }) {
  if (sections.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto max-w-7xl space-y-6 px-4 pt-3 pb-5 sm:space-y-12 sm:px-6 sm:py-10 lg:px-8 lg:py-16">
      {sections.map((section) => (
        <div key={section.id} className="space-y-3 sm:space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[14px] font-semibold tracking-tight text-slate-900 sm:text-3xl">{section.title}</h2>
            </div>
            <a href="/products" className="text-[10px] font-medium text-[#615FFF] hover:text-[#5552e6] sm:text-sm sm:font-semibold sm:text-slate-500 sm:hover:text-slate-900">
              Browse all
            </a>
          </div>

          {section.products.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:gap-5 xl:grid-cols-4">
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
