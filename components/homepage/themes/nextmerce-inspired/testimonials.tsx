import type { HomepageContentBlockRow } from "@/types/product-db";

function readTestimonials(content?: HomepageContentBlockRow) {
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
            name: typeof source.name === "string" ? source.name : "Marketplace Buyer",
            role: typeof source.role === "string" ? source.role : "Buyer",
            quote: typeof source.quote === "string" ? source.quote : "",
          },
        ];
      })
    : [];
}

export default function Testimonials({ content }: { content?: HomepageContentBlockRow }) {
  const testimonials = readTestimonials(content);

  return (
    <section className="mx-auto max-w-7xl space-y-8 px-4 py-16 sm:px-6 lg:px-8">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#615FFF]">
          {content?.subtitle ?? "Testimonials"}
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
          {content?.title ?? "Customer proof that can follow any active theme"}
        </h2>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {testimonials.map((item) => (
          <div key={`${item.name}-${item.role}`} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm leading-7 text-slate-600">“{item.quote}”</p>
            <div className="mt-5 border-t border-slate-200 pt-4">
              <p className="font-semibold text-slate-900">{item.name}</p>
              <p className="text-sm text-slate-500">{item.role}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
