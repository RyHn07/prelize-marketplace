import Header from "@/components/Header";

export default function FallbackHomepage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <Header />
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
    </main>
  );
}
