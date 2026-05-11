import type { HomepageContentBlockRow } from "@/types/product-db";

function readLeadMeta(content?: HomepageContentBlockRow) {
  if (!content?.data_json || typeof content.data_json !== "object" || Array.isArray(content.data_json)) {
    return { placeholder: "Enter your business email", note: "" };
  }

  const source = content.data_json as Record<string, unknown>;

  return {
    placeholder:
      typeof source.placeholder === "string" ? source.placeholder : "Enter your business email",
    note: typeof source.note === "string" ? source.note : "",
  };
}

export default function LeadCapture({ content }: { content?: HomepageContentBlockRow }) {
  const meta = readLeadMeta(content);

  return (
    <section className="py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] bg-slate-950 px-6 py-10 text-white sm:px-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#9E9CFF]">
                {content?.subtitle ?? "Lead Capture"}
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                {content?.title ?? "Turn homepage traffic into sourcing conversations"}
              </h2>
              {content?.description ? <p className="mt-3 text-sm leading-7 text-slate-300">{content.description}</p> : null}
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="email"
                  placeholder={meta.placeholder}
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/10 px-4 text-sm text-white placeholder:text-slate-400 outline-none"
                />
                <a
                  href={content?.button_link ?? "/quote"}
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#615FFF] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  {content?.button_text ?? "Request a Callback"}
                </a>
              </div>
              {meta.note ? <p className="mt-3 text-xs text-slate-400">{meta.note}</p> : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
