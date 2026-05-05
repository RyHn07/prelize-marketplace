type WorkspaceTone = "admin" | "vendor";

function SkeletonBlock({
  className,
}: {
  className: string;
}) {
  return <div className={`animate-pulse rounded-2xl bg-slate-200/80 ${className}`} />;
}

function StorefrontHeaderSkeleton() {
  return (
    <header className="border-b border-slate-200/80 bg-white">
      <div className="border-b border-slate-200/80 bg-slate-50/80">
        <div className="mx-auto flex max-w-7xl justify-end px-4 py-2.5 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <SkeletonBlock className="h-4 w-16 rounded-full" />
            <SkeletonBlock className="h-4 w-16 rounded-full" />
            <SkeletonBlock className="h-4 w-20 rounded-full" />
            <SkeletonBlock className="h-4 w-14 rounded-full" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-8">
          <SkeletonBlock className="h-10 w-36" />
          <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center lg:gap-5">
            <SkeletonBlock className="h-11 w-40 rounded-full" />
            <SkeletonBlock className="h-[3.2rem] flex-1 rounded-full" />
            <div className="flex gap-3">
              <SkeletonBlock className="h-10 w-10 rounded-full" />
              <SkeletonBlock className="h-10 w-10 rounded-full" />
              <SkeletonBlock className="h-10 w-24 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export function StorefrontCatalogLoading({
  eyebrow,
  titleWidth = "w-64",
}: {
  eyebrow: string;
  titleWidth?: string;
}) {
  return (
    <main className="min-h-screen bg-white">
      <StorefrontHeaderSkeleton />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#615FFF]">
            {eyebrow}
          </p>
          <SkeletonBlock className={`h-10 ${titleWidth}`} />
          <SkeletonBlock className="h-4 w-full max-w-3xl" />
          <SkeletonBlock className="h-4 w-full max-w-2xl" />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
          <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="space-y-5">
              <SkeletonBlock className="h-11 w-full" />
              <SkeletonBlock className="h-11 w-full" />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <SkeletonBlock className="h-11 w-full" />
                <SkeletonBlock className="h-11 w-full" />
              </div>
              <SkeletonBlock className="h-11 w-full" />
              <SkeletonBlock className="h-11 w-full" />
              <div className="flex gap-3">
                <SkeletonBlock className="h-11 flex-1" />
                <SkeletonBlock className="h-11 w-28" />
              </div>
            </div>
          </aside>

          <section className="space-y-4">
            <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <SkeletonBlock className="h-4 w-52" />
              <div className="grid gap-3 sm:grid-cols-2">
                <SkeletonBlock className="h-11 w-44" />
                <SkeletonBlock className="h-11 w-64" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <article
                  key={index}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <SkeletonBlock className="aspect-[1.05] w-full" />
                  <SkeletonBlock className="mt-4 h-4 w-24" />
                  <SkeletonBlock className="mt-3 h-5 w-full" />
                  <SkeletonBlock className="mt-2 h-5 w-3/4" />
                  <div className="mt-5 flex items-center justify-between">
                    <SkeletonBlock className="h-5 w-20" />
                    <SkeletonBlock className="h-5 w-16" />
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

export function StorefrontProductLoading() {
  return (
    <main className="min-h-screen bg-white">
      <StorefrontHeaderSkeleton />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SkeletonBlock className="h-4 w-72" />

        <div className="mt-6 grid gap-8 xl:grid-cols-[1.15fr_0.95fr_0.8fr]">
          <div className="space-y-4">
            <SkeletonBlock className="aspect-square w-full" />
            <div className="flex gap-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <SkeletonBlock key={index} className="h-20 w-20 sm:h-24 sm:w-24" />
              ))}
            </div>
          </div>

          <div className="space-y-4 xl:col-span-2">
            <SkeletonBlock className="h-5 w-24" />
            <SkeletonBlock className="h-11 w-full max-w-xl" />
            <SkeletonBlock className="h-4 w-full max-w-2xl" />
            <SkeletonBlock className="h-4 w-full max-w-xl" />
            <div className="grid gap-3 sm:grid-cols-2">
              <SkeletonBlock className="h-24 w-full" />
              <SkeletonBlock className="h-24 w-full" />
            </div>
            <SkeletonBlock className="h-56 w-full" />
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex gap-3">
            <SkeletonBlock className="h-10 w-24" />
            <SkeletonBlock className="h-10 w-32" />
            <SkeletonBlock className="h-10 w-28" />
          </div>
          <SkeletonBlock className="mt-6 h-4 w-full" />
          <SkeletonBlock className="mt-3 h-4 w-full" />
          <SkeletonBlock className="mt-3 h-4 w-4/5" />
        </div>

        <section className="mt-10 space-y-5">
          <SkeletonBlock className="h-8 w-56" />
          <SkeletonBlock className="h-4 w-full max-w-lg" />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <article
                key={index}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <SkeletonBlock className="aspect-[1.05] w-full" />
                <SkeletonBlock className="mt-4 h-4 w-20" />
                <SkeletonBlock className="mt-3 h-5 w-full" />
                <SkeletonBlock className="mt-2 h-5 w-2/3" />
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

export function WorkspaceLoading({
  tone,
  title,
  description,
}: {
  tone: WorkspaceTone;
  title: string;
  description: string;
}) {
  const accentClass = tone === "vendor" ? "text-emerald-600" : "text-[#615FFF]";
  const sidebarClass = tone === "vendor" ? "bg-slate-950 border-slate-800" : "bg-white border-slate-200";
  const sidebarBlockClass = tone === "vendor" ? "bg-slate-800/90" : "bg-slate-200/80";
  const pageClass = tone === "vendor" ? "bg-slate-100" : "bg-[#f6f7fb]";

  return (
    <div className={`min-h-screen ${pageClass} text-slate-900 md:flex`}>
      <aside className={`hidden h-screen w-[260px] shrink-0 border-r md:sticky md:top-0 md:flex md:flex-col ${sidebarClass}`}>
        <div className="space-y-3 border-b border-inherit px-6 py-6">
          <div className={`h-3 w-28 animate-pulse rounded-full ${sidebarBlockClass}`} />
          <div className={`h-8 w-36 animate-pulse rounded-2xl ${sidebarBlockClass}`} />
          <div className={`h-3 w-20 animate-pulse rounded-full ${sidebarBlockClass}`} />
        </div>

        <div className="flex flex-1 flex-col gap-2 px-4 py-5">
          {Array.from({ length: 7 }).map((_, index) => (
            <div
              key={index}
              className={`h-11 animate-pulse rounded-xl ${sidebarBlockClass}`}
            />
          ))}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="px-4 py-4 sm:px-6 lg:px-8">
            <div className={`text-sm font-semibold uppercase tracking-[0.18em] ${accentClass}`}>
              {title}
            </div>
            <div className="mt-3 h-5 w-48 animate-pulse rounded-2xl bg-slate-200/80" />
          </div>
        </div>

        <main className="p-4 sm:p-6 lg:p-8">
          <section className="mx-auto max-w-7xl space-y-6">
            <div className="space-y-3">
              <p className={`text-sm font-semibold uppercase tracking-[0.18em] ${accentClass}`}>
                {title}
              </p>
              <SkeletonBlock className="h-10 w-64" />
              <SkeletonBlock className="h-4 w-full max-w-2xl" />
              <p className="text-sm text-slate-500">{description}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <SkeletonBlock className="h-3 w-24" />
                  <SkeletonBlock className="mt-4 h-8 w-16" />
                  <SkeletonBlock className="mt-3 h-4 w-full" />
                </div>
              ))}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <SkeletonBlock className="h-11 flex-1" />
                <SkeletonBlock className="h-11 w-full lg:w-56" />
                <SkeletonBlock className="h-11 w-28" />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-2">
                        <SkeletonBlock className="h-4 w-40" />
                        <SkeletonBlock className="h-4 w-28" />
                      </div>
                      <div className="flex gap-2">
                        <SkeletonBlock className="h-8 w-24 rounded-full" />
                        <SkeletonBlock className="h-8 w-28" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
