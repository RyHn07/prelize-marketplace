import Header from "@/components/Header";
import FallbackHomepage from "@/components/homepage/fallback-homepage";
import FeaturedCategories from "@/components/homepage/themes/nextmerce-inspired/featured-categories";
import HeroSection from "@/components/homepage/themes/nextmerce-inspired/hero-section";
import HowItWorks from "@/components/homepage/themes/nextmerce-inspired/how-it-works";
import LeadCapture from "@/components/homepage/themes/nextmerce-inspired/lead-capture";
import ProductShowcase from "@/components/homepage/themes/nextmerce-inspired/product-showcase";
import PromoBanners from "@/components/homepage/themes/nextmerce-inspired/promo-banners";
import Testimonials from "@/components/homepage/themes/nextmerce-inspired/testimonials";
import WhyChoose from "@/components/homepage/themes/nextmerce-inspired/why-choose";
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
    case "why-choose":
      return <WhyChoose content={content} />;
    case "how-it-works":
      return <HowItWorks content={content} />;
    case "lead-capture":
      return <LeadCapture content={content} />;
    case "testimonials":
      return <Testimonials content={content} />;
    default:
      return null;
  }
}

export default function ThemeRenderer({ data }: { data: HomepageRenderData }) {
  if (!data.theme) {
    return <FallbackHomepage />;
  }

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <Header />
      {data.sections.map((section) => (
        <div key={section.id}>{renderSection(data, section)}</div>
      ))}
    </main>
  );
}
