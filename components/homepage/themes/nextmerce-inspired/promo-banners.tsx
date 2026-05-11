import type { HomepageBannerRow } from "@/types/product-db";

export default function PromoBanners({ banners }: { banners: HomepageBannerRow[] }) {
  if (banners.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
      <div className="grid gap-5 md:grid-cols-2">
        {banners.map((banner) => (
          <a
            key={banner.id}
            href={banner.link_url ?? "#"}
            className="group relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-100"
          >
            {banner.image_url ? (
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.03]"
                style={{ backgroundImage: `url("${banner.image_url}")` }}
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-900/55 to-transparent" />
            <div className="relative min-h-[240px] space-y-3 px-8 py-8 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                {banner.placement ?? "Homepage Banner"}
              </p>
              <h3 className="max-w-sm text-3xl font-semibold tracking-tight">
                {banner.title ?? "Campaign banner"}
              </h3>
              {banner.subtitle ? <p className="max-w-md text-sm leading-6 text-white/80">{banner.subtitle}</p> : null}
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
