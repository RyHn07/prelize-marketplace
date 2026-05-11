import type { HomepageContentBlockRow } from "@/types/product-db";

function readItems(content?: HomepageContentBlockRow) {
  const items =
    content?.data_json && typeof content.data_json === "object" && !Array.isArray(content.data_json)
      ? (content.data_json as Record<string, unknown>).items
      : [];

  return Array.isArray(items)
    ? items.flatMap((entry) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
          return [];
        }

        const source = entry as Record<string, unknown>;
        return [
          {
            title: typeof source.title === "string" ? source.title : "Why Prelize",
            description: typeof source.description === "string" ? source.description : "",
          },
        ];
      })
    : [];
}

export default function WhyChoose({ content }: { content?: HomepageContentBlockRow }) {
  const items = readItems(content);

  return (
    <section className="bg-slate-50/80 py-16">
      <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#615FFF]">
            {content?.subtitle ?? "Why Choose Prelize"}
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {content?.title ?? "Flexible homepage content, reusable across themes"}
          </h2>
          {content?.description ? <p className="mt-3 text-sm leading-7 text-slate-500">{content.description}</p> : null}
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {items.map((item) => (
            <div key={item.title} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#615FFF]/10 text-lg font-bold text-[#615FFF]">
                P
              </div>
              <h3 className="mt-5 text-lg font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-500">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
