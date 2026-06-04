import Header from "@/components/Header";
import FallbackHomepage from "@/components/homepage/fallback-homepage";
import FeaturedCategories from "@/components/homepage/themes/nextmerce-inspired/featured-categories";
import HeroSection from "@/components/homepage/themes/nextmerce-inspired/hero-section";
import ProductShowcase from "@/components/homepage/themes/nextmerce-inspired/product-showcase";
import PromoBanners from "@/components/homepage/themes/nextmerce-inspired/promo-banners";
import type { HomepageRenderData } from "@/lib/homepage/queries";

function renderSection(data: HomepageRenderData, section: HomepageRenderData["sections"][number]) {
  const content = data.contentBlockMap.get(section.section_key);

  switch (section.component_name) {
    case "hero-section":
      return <HeroSection content={content} />;
    case "featured-categories":
      return <FeaturedCategories categories={data.categories} />;
    case "promo-banners":
      return <PromoBanners banners={data.banners.filter((banner) => !banner.placement || banner.placement === "promo_banners" || banner.placement === "homepage")} />;
    case "product-showcase":
      return <ProductShowcase sections={data.productSections} />;
    default:
      return null;
  }
}

function HomepageFallbackSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#615FFF]">
        Prelize Marketplace
      </p>
      <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
        Wholesale products from China, prepared for Bangladesh buyers
      </h1>
      <p className="mx-auto mt-5 max-w-2xl text-base text-slate-500">
        The homepage theme engine is ready for dynamic layouts. If no active theme is available,
        this safe fallback keeps the storefront online.
      </p>
    </section>
  );
}

export default function ThemeRenderer({
  data,
  showHeader = true,
}: {
  data: HomepageRenderData;
  showHeader?: boolean;
}) {
  if (!data.theme) {
    return showHeader ? <FallbackHomepage /> : <HomepageFallbackSection />;
  }

  const content = (
    <>
      {data.sections.map((section) => (
        <div key={section.id}>{renderSection(data, section)}</div>
      ))}
    </>
  );

  if (!showHeader) {
    return content;
  }

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <Header />
      {content}
    </main>
  );
}
