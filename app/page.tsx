import type { Metadata } from "next";
import { Suspense } from "react";

import Header from "@/components/Header";
import ThemeRenderer from "@/components/homepage/theme-renderer";
import { HomepageSectionsLoading, StorefrontHeaderSkeleton } from "@/components/loading/route-loading";
import { getHomepageRenderData } from "@/lib/homepage/queries";
import {
  absoluteUrl,
  DEFAULT_SEO_DESCRIPTION,
  DEFAULT_SEO_TITLE,
  PUBLIC_NAVIGATION_LINKS,
  toJsonLdScriptContent,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: {
    absolute: DEFAULT_SEO_TITLE,
  },
  description: DEFAULT_SEO_DESCRIPTION,
  alternates: {
    canonical: absoluteUrl("/"),
  },
};

const homepageJsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Prelize",
    url: absoluteUrl("/"),
    description: DEFAULT_SEO_DESCRIPTION,
    potentialAction: {
      "@type": "SearchAction",
      target: `${absoluteUrl("/products")}?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Prelize",
    url: absoluteUrl("/"),
  },
  {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Prelize marketplace links",
    itemListElement: PUBLIC_NAVIGATION_LINKS.map((link, index) => ({
      "@type": "SiteNavigationElement",
      position: index + 1,
      name: link.name,
      description: link.description,
      url: absoluteUrl(link.href),
    })),
  },
];

async function HomepageContent() {
  const { data } = await getHomepageRenderData();
  return <ThemeRenderer data={data} showHeader={false} />;
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLdScriptContent(homepageJsonLd) }}
      />
      <Suspense fallback={<StorefrontHeaderSkeleton />}>
        <Header />
      </Suspense>
      <Suspense fallback={<HomepageSectionsLoading />}>
        <HomepageContent />
      </Suspense>
    </main>
  );
}
