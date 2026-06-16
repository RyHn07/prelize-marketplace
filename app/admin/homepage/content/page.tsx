"use client";

import { useEffect, useState } from "react";

import AdminEmptyState from "@/components/admin/admin-empty-state";
import { getAdminAccessState } from "@/lib/admin-access";
import { fetchHomepageContentBlocks, saveHomepageContentBlocks } from "@/lib/homepage/actions";
import { getPgDataClient } from "@/lib/browser-app-client";
import type { HomepageContentBlockRow, JsonValue } from "@/types/product-db";

type EditableBlock = HomepageContentBlockRow & {
  data_json_text: string;
};

type HeroSideCardEditor = {
  title: string;
  subtitle: string;
  highlight: string;
  image_url: string;
  link_url: string;
  background: string;
  accent: string;
};

function normalizeJsonObject(value: JsonValue | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, JsonValue>;
  }

  return value as Record<string, JsonValue>;
}

function readHeroSideCards(block: EditableBlock) {
  const source = normalizeJsonObject(block.data_json);
  const rawCards = source.side_cards;
  const defaults: HeroSideCardEditor[] = [
    {
      title: "Smart Security Home Camera",
      subtitle: "",
      highlight: "$450",
      image_url: "",
      link_url: "/products",
      background: "bg-[#dff3ff]",
      accent: "text-[#153a7a]",
    },
    {
      title: "Galaxy S24 Ultra 5G",
      subtitle: "",
      highlight: "$600",
      image_url: "",
      link_url: "/products",
      background: "bg-[#f3efe4]",
      accent: "text-[#17346c]",
    },
  ];

  if (!Array.isArray(rawCards)) {
    return defaults;
  }

  return defaults.map((fallback, index) => {
    const card = rawCards[index];

    if (!card || typeof card !== "object" || Array.isArray(card)) {
      return fallback;
    }

    const record = card as Record<string, unknown>;

    return {
      title: typeof record.title === "string" ? record.title : fallback.title,
      subtitle: typeof record.subtitle === "string" ? record.subtitle : fallback.subtitle,
      highlight: typeof record.highlight === "string" ? record.highlight : fallback.highlight,
      image_url: typeof record.image_url === "string" ? record.image_url : fallback.image_url,
      link_url: typeof record.link_url === "string" ? record.link_url : fallback.link_url,
      background: typeof record.background === "string" ? record.background : fallback.background,
      accent: typeof record.accent === "string" ? record.accent : fallback.accent,
    };
  });
}

export default function HomepageContentPage() {
  const [loading, setLoading] = useState(true);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<EditableBlock[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const updateBlockDataJson = (
    blockId: string,
    updater: (current: Record<string, JsonValue>) => Record<string, JsonValue>,
  ) => {
    setBlocks((current) =>
      current.map((entry) => {
        if (entry.id !== blockId) {
          return entry;
        }

        const nextJson = updater(normalizeJsonObject(entry.data_json));

        return {
          ...entry,
          data_json: nextJson,
          data_json_text: JSON.stringify(nextJson, null, 2),
        };
      }),
    );
  };

  useEffect(() => {
    let isMounted = true;
    const dataClient = getPgDataClient();

    const loadPage = async () => {
      const access = await getAdminAccessState(dataClient);

      if (!isMounted) {
        return;
      }

      setUserEmail(access.userEmail);
      setHasAdminAccess(access.hasAdminAccess);

      if (!access.userEmail || !access.hasAdminAccess) {
        setLoading(false);
        return;
      }

      if (!isMounted) {
        return;
      }

      try {
        const result = await fetchHomepageContentBlocks();
        setBlocks(
          (result.blocks ?? []).map((block: HomepageContentBlockRow) => ({
            ...block,
            data_json_text: JSON.stringify(block.data_json ?? {}, null, 2),
          })),
        );
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unable to load homepage content blocks.");
        setLoading(false);
        return;
      }
      setLoading(false);
    };

    void loadPage();

    return () => {
      isMounted = false;
    };
  }, []);

  const saveBlocks = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const payload = {
        blocks: blocks.map((block) => ({
          ...block,
          data_json: JSON.parse(block.data_json_text || "{}"),
        })),
      };

      await saveHomepageContentBlocks(payload);
      setSuccessMessage("Homepage content saved.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save homepage content.");
    }
  };

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">Loading homepage content...</div>;
  }

  if (!userEmail) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">Please login as admin.</div>;
  }

  if (!hasAdminAccess) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">You do not have admin access.</div>;
  }

  return (
    <section className="w-full space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-base font-medium text-gray-800">Homepage Content Blocks</h3>
            <p className="mt-1 text-sm text-gray-500">
              These blocks stay reusable across themes. Update the text and structured JSON without changing the active layout.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-lg bg-[#615FFF]/8 px-3 py-2 text-sm font-medium text-[#615FFF]">
              {blocks.length} visible
            </div>
            <button
              type="button"
              onClick={() => void saveBlocks()}
              className="inline-flex items-center justify-center rounded-lg bg-[#615FFF] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Save Content
            </button>
          </div>
        </div>

        {errorMessage ? (
          <div className="border-b border-rose-100 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-600 sm:px-6">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="border-b border-emerald-100 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-600 sm:px-6">
            {successMessage}
          </div>
        ) : null}

        {blocks.length === 0 ? (
          <div className="p-6">
            <AdminEmptyState
              title="No content blocks found"
              description="Homepage content blocks will appear here once they are available."
            />
          </div>
        ) : (
          <div className="space-y-5 p-5 sm:p-6">
            {blocks.map((block, index) => (
              <div key={block.id} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{block.content_key}</h2>
                    <p className="text-sm text-slate-500">Shared content block {index + 1}</p>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={block.is_active}
                      onChange={(event) =>
                        setBlocks((current) =>
                          current.map((entry) => (entry.id === block.id ? { ...entry, is_active: event.target.checked } : entry)),
                        )
                      }
                    />
                    Active
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
              <input value={block.title ?? ""} onChange={(event) => setBlocks((current) => current.map((entry) => (entry.id === block.id ? { ...entry, title: event.target.value || null } : entry)))} placeholder="Title" className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#615FFF]" />
              <input value={block.subtitle ?? ""} onChange={(event) => setBlocks((current) => current.map((entry) => (entry.id === block.id ? { ...entry, subtitle: event.target.value || null } : entry)))} placeholder="Subtitle" className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#615FFF]" />
              <input value={block.image_url ?? ""} onChange={(event) => setBlocks((current) => current.map((entry) => (entry.id === block.id ? { ...entry, image_url: event.target.value || null } : entry)))} placeholder="Image URL" className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#615FFF]" />
              <input value={block.button_link ?? ""} onChange={(event) => setBlocks((current) => current.map((entry) => (entry.id === block.id ? { ...entry, button_link: event.target.value || null } : entry)))} placeholder="Button Link" className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#615FFF]" />
              <input value={block.button_text ?? ""} onChange={(event) => setBlocks((current) => current.map((entry) => (entry.id === block.id ? { ...entry, button_text: event.target.value || null } : entry)))} placeholder="Button Text" className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#615FFF] md:col-span-2" />
              <textarea value={block.description ?? ""} onChange={(event) => setBlocks((current) => current.map((entry) => (entry.id === block.id ? { ...entry, description: event.target.value || null } : entry)))} placeholder="Description" className="min-h-24 rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-[#615FFF] md:col-span-2" />
              {block.content_key === "hero" ? (
                <>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                    <h3 className="text-sm font-semibold text-slate-900">Hero Main Banner</h3>
                    <p className="mt-1 text-xs text-slate-500">Update the main image, eyebrow text, CTA name, slider dots, and watermark from here.</p>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <input
                        value={String(normalizeJsonObject(block.data_json).eyebrow ?? "")}
                        onChange={(event) =>
                          updateBlockDataJson(block.id, (current) => ({
                            ...current,
                            eyebrow: event.target.value,
                          }))
                        }
                        placeholder="Eyebrow text"
                        className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#615FFF]"
                      />
                      <input
                        value={String(normalizeJsonObject(block.data_json).watermark ?? "")}
                        onChange={(event) =>
                          updateBlockDataJson(block.id, (current) => ({
                            ...current,
                            watermark: event.target.value,
                          }))
                        }
                        placeholder="Watermark text"
                        className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#615FFF]"
                      />
                      <input
                        value={String(normalizeJsonObject(block.data_json).secondary_button_text ?? "")}
                        onChange={(event) =>
                          updateBlockDataJson(block.id, (current) => ({
                            ...current,
                            secondary_button_text: event.target.value,
                          }))
                        }
                        placeholder="Secondary CTA name"
                        className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#615FFF]"
                      />
                      <input
                        value={String(normalizeJsonObject(block.data_json).secondary_button_link ?? "")}
                        onChange={(event) =>
                          updateBlockDataJson(block.id, (current) => ({
                            ...current,
                            secondary_button_link: event.target.value,
                          }))
                        }
                        placeholder="Secondary CTA link"
                        className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#615FFF]"
                      />
                      <input
                        type="number"
                        value={String(normalizeJsonObject(block.data_json).slide_count ?? 3)}
                        onChange={(event) =>
                          updateBlockDataJson(block.id, (current) => ({
                            ...current,
                            slide_count: Number(event.target.value) || 3,
                          }))
                        }
                        placeholder="Slide count"
                        className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#615FFF]"
                      />
                      <input
                        type="number"
                        value={String(normalizeJsonObject(block.data_json).active_slide ?? 1)}
                        onChange={(event) =>
                          updateBlockDataJson(block.id, (current) => ({
                            ...current,
                            active_slide: Number(event.target.value) || 1,
                          }))
                        }
                        placeholder="Active slide"
                        className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#615FFF]"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                    <h3 className="text-sm font-semibold text-slate-900">Right Side Promo Cards</h3>
                    <p className="mt-1 text-xs text-slate-500">Any image size will fit inside the fixed frame automatically.</p>
                    <div className="mt-4 space-y-4">
                      {readHeroSideCards(block).map((card, cardIndex) => (
                        <div key={`${block.id}-side-card-${cardIndex}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                          <h4 className="text-sm font-semibold text-slate-800">Card {cardIndex + 1}</h4>
                          <div className="mt-3 grid gap-4 md:grid-cols-2">
                            <input
                              value={card.title}
                              onChange={(event) =>
                                updateBlockDataJson(block.id, (current) => {
                                  const nextCards = readHeroSideCards({
                                    ...block,
                                    data_json: current,
                                  } as EditableBlock);
                                  nextCards[cardIndex] = { ...nextCards[cardIndex], title: event.target.value };
                                  return { ...current, side_cards: nextCards };
                                })
                              }
                              placeholder="Card title"
                              className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#615FFF]"
                            />
                            <input
                              value={card.subtitle}
                              onChange={(event) =>
                                updateBlockDataJson(block.id, (current) => {
                                  const nextCards = readHeroSideCards({
                                    ...block,
                                    data_json: current,
                                  } as EditableBlock);
                                  nextCards[cardIndex] = { ...nextCards[cardIndex], subtitle: event.target.value };
                                  return { ...current, side_cards: nextCards };
                                })
                              }
                              placeholder="Card subtitle"
                              className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#615FFF]"
                            />
                            <input
                              value={card.image_url}
                              onChange={(event) =>
                                updateBlockDataJson(block.id, (current) => {
                                  const nextCards = readHeroSideCards({
                                    ...block,
                                    data_json: current,
                                  } as EditableBlock);
                                  nextCards[cardIndex] = { ...nextCards[cardIndex], image_url: event.target.value };
                                  return { ...current, side_cards: nextCards };
                                })
                              }
                              placeholder="Card image URL"
                              className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#615FFF]"
                            />
                            <input
                              value={card.link_url}
                              onChange={(event) =>
                                updateBlockDataJson(block.id, (current) => {
                                  const nextCards = readHeroSideCards({
                                    ...block,
                                    data_json: current,
                                  } as EditableBlock);
                                  nextCards[cardIndex] = { ...nextCards[cardIndex], link_url: event.target.value };
                                  return { ...current, side_cards: nextCards };
                                })
                              }
                              placeholder="Card link"
                              className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#615FFF]"
                            />
                            <input
                              value={card.highlight}
                              onChange={(event) =>
                                updateBlockDataJson(block.id, (current) => {
                                  const nextCards = readHeroSideCards({
                                    ...block,
                                    data_json: current,
                                  } as EditableBlock);
                                  nextCards[cardIndex] = { ...nextCards[cardIndex], highlight: event.target.value };
                                  return { ...current, side_cards: nextCards };
                                })
                              }
                              placeholder="Highlight text"
                              className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#615FFF]"
                            />
                            <input
                              value={card.background}
                              onChange={(event) =>
                                updateBlockDataJson(block.id, (current) => {
                                  const nextCards = readHeroSideCards({
                                    ...block,
                                    data_json: current,
                                  } as EditableBlock);
                                  nextCards[cardIndex] = { ...nextCards[cardIndex], background: event.target.value };
                                  return { ...current, side_cards: nextCards };
                                })
                              }
                              placeholder="Background class"
                              className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#615FFF]"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
                  <textarea value={block.data_json_text} onChange={(event) => setBlocks((current) => current.map((entry) => (entry.id === block.id ? { ...entry, data_json_text: event.target.value } : entry)))} placeholder="Structured JSON for cards, steps, stats, or testimonials" className="min-h-40 rounded-xl border border-slate-300 px-3 py-3 font-mono text-xs outline-none focus:border-[#615FFF] md:col-span-2" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
