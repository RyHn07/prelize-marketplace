import { Suspense } from "react";

import Header from "@/components/Header";
import ThemeRenderer from "@/components/homepage/theme-renderer";
import { HomepageSectionsLoading, StorefrontHeaderSkeleton } from "@/components/loading/route-loading";
import { getHomepageRenderData } from "@/lib/homepage/queries";

async function HomepageContent() {
  const { data } = await getHomepageRenderData();
  return <ThemeRenderer data={data} showHeader={false} />;
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <Suspense fallback={<StorefrontHeaderSkeleton />}>
        <Header />
      </Suspense>
      <Suspense fallback={<HomepageSectionsLoading />}>
        <HomepageContent />
      </Suspense>
    </main>
  );
}
