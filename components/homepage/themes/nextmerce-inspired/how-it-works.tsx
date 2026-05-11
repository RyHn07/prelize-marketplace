import type { HomepageContentBlockRow } from "@/types/product-db";

function readSteps(content?: HomepageContentBlockRow) {
  const steps =
    content?.data_json && typeof content.data_json === "object" && !Array.isArray(content.data_json)
      ? (content.data_json as Record<string, unknown>).steps
      : [];

  return Array.isArray(steps)
    ? steps.flatMap((entry, index) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
          return [];
        }

        const source = entry as Record<string, unknown>;
        return [
          {
            index: index + 1,
            title: typeof source.title === "string" ? source.title : `Step ${index + 1}`,
            description: typeof source.description === "string" ? source.description : "",
          },
        ];
      })
    : [];
}

export default function HowItWorks({ content }: { content?: HomepageContentBlockRow }) {
  const steps = readSteps(content);

  return (
    <section className="mx-auto max-w-7xl space-y-8 px-4 py-16 sm:px-6 lg:px-8">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#615FFF]">
          {content?.subtitle ?? "How It Works"}
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
          {content?.title ?? "Guide buyers through the homepage with dynamic steps"}
        </h2>
        {content?.description ? <p className="mt-3 text-sm leading-7 text-slate-500">{content.description}</p> : null}
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {steps.map((step) => (
          <div key={step.index} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#615FFF]">
              Step {step.index}
            </p>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">{step.title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-500">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
