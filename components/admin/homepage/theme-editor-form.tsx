"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import {
  createHomepageThemeRequest,
  saveHomepageContentBlocks,
  updateHomepageThemeRequest,
} from "@/lib/homepage/actions";
import type { HomepageThemeEditorRecord, HomepageThemeInput, HomepageThemeSectionInput } from "@/lib/homepage/admin";
import { listProductMedia, uploadProductMedia, type ProductMediaItem } from "@/lib/media/storage";
import type { HomepageContentBlockRow, JsonValue } from "@/types/product-db";

type ThemeEditorFormProps = {
  mode: "create" | "edit";
  initialRecord?: HomepageThemeEditorRecord | null;
  initialHeroContent?: HomepageContentBlockRow | null;
};

type HeroSlideEditor = {
  image_url: string;
  top_title: string;
  title: string;
  description: string;
  cta_text: string;
  cta_link: string;
};

type HeroOfferCardEditor = {
  image_url: string;
  title: string;
  highlight: string;
  cta_link: string;
};

type HeroEditorState = {
  is_active: boolean;
  active_slide: number;
  slides: HeroSlideEditor[];
  offer_cards: HeroOfferCardEditor[];
};

type HomepageMediaTarget =
  | { type: "slider"; index: number }
  | { type: "offer"; index: number };

const LEGACY_HERO_TITLE = "Source wholesale products from China with more confidence";
const LEGACY_HERO_DESCRIPTION =
  "Compare suppliers, plan MOQ-friendly orders, and move products toward Bangladesh with a cleaner sourcing workflow.";
const LEGACY_HERO_BUTTON_TEXT = "Explore Products";
const LEGACY_HERO_EYEBROW = "Prelize Marketplace";

const defaultSections: HomepageThemeSectionInput[] = [
  { section_key: "hero", section_type: "hero", component_name: "hero-section", sort_order: 0, is_enabled: true, layout_settings: {} },
  { section_key: "featured_categories", section_type: "featured_categories", component_name: "featured-categories", sort_order: 1, is_enabled: true, layout_settings: {} },
  { section_key: "promo_banners", section_type: "promo_banners", component_name: "promo-banners", sort_order: 2, is_enabled: true, layout_settings: {} },
  { section_key: "product_showcase", section_type: "product_showcase", component_name: "product-showcase", sort_order: 3, is_enabled: true, layout_settings: {} },
];

const defaultHeroSlides: HeroSlideEditor[] = [
  {
    image_url: "",
    top_title: "SPECIAL EDITION",
    title: "Apple AirPods Max",
    description: "Transparency mode and spatial audio, it delivers a premium listening experience.",
    cta_text: "Shop Now",
    cta_link: "/products",
  },
  {
    image_url: "",
    top_title: "PREMIUM DESIGN",
    title: "Apple Watch Ultra",
    description: "Advanced imaging performance with a 200MP AI camera with Enhanced image quality.",
    cta_text: "Shop Now",
    cta_link: "/products",
  },
  {
    image_url: "",
    top_title: "LIMITED OFFER",
    title: "Galaxy S24 Ultra 5G",
    description: "Performance-focused flagship hardware built for modern mobile workflows.",
    cta_text: "Explore Now",
    cta_link: "/products",
  },
];

const defaultOfferCards: HeroOfferCardEditor[] = [
  {
    image_url: "",
    title: "Smart Security Home Camera",
    highlight: "$450",
    cta_link: "/products",
  },
  {
    image_url: "",
    title: "Smart Security Home Camera",
    highlight: "$450",
    cta_link: "/products",
  },
];

function prettyJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

function normalizeJsonObject(value: JsonValue | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, JsonValue>;
  }

  return value as Record<string, JsonValue>;
}

function normalizeInput(record?: HomepageThemeEditorRecord | null): HomepageThemeInput {
  if (!record) {
    return {
      name: "",
      slug: "",
      description: null,
      preview_image_url: null,
      status: "draft",
      is_active: false,
      settings_json: {},
      sections: defaultSections,
    };
  }

  const allowedSectionKeys = new Set(defaultSections.map((section) => section.section_key));

  return {
    name: record.theme.name,
    slug: record.theme.slug,
    description: record.theme.description,
    preview_image_url: record.theme.preview_image_url,
    status: record.theme.status,
    is_active: record.theme.is_active,
    settings_json: record.theme.settings_json,
    sections: record.sections
      .filter((section) => allowedSectionKeys.has(section.section_key))
      .map((section) => ({
        id: section.id,
        section_key: section.section_key,
        section_type: section.section_type,
        component_name: section.component_name,
        sort_order: section.sort_order,
        is_enabled: section.is_enabled,
        layout_settings: section.layout_settings,
      })),
  };
}

function normalizeHeroContent(block?: HomepageContentBlockRow | null): HeroEditorState {
  const source = normalizeJsonObject(block?.data_json);
  const rawSlides = source.slides;
  const rawCards = source.side_cards;
  const activeSlide = typeof source.active_slide === "number" && source.active_slide > 0 ? Math.trunc(source.active_slide) : 1;
  const normalizedBlockTitle =
    block?.title?.trim() === LEGACY_HERO_TITLE ? defaultHeroSlides[0].title : block?.title;
  const normalizedBlockDescription =
    block?.description?.trim() === LEGACY_HERO_DESCRIPTION ? defaultHeroSlides[0].description : block?.description;
  const normalizedBlockButtonText =
    block?.button_text?.trim() === LEGACY_HERO_BUTTON_TEXT ? defaultHeroSlides[0].cta_text : block?.button_text;
  const normalizedBlockTopTitle =
    block?.subtitle?.trim() === LEGACY_HERO_EYEBROW ? defaultHeroSlides[0].top_title : block?.subtitle;

  const slides = defaultHeroSlides.map((fallback, index) => {
    const entry = Array.isArray(rawSlides) ? rawSlides[index] : null;

    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      if (index === 0) {
        return {
          image_url: block?.image_url ?? fallback.image_url,
          top_title: normalizedBlockTopTitle ?? fallback.top_title,
          title: normalizedBlockTitle ?? fallback.title,
          description: normalizedBlockDescription ?? fallback.description,
          cta_text: normalizedBlockButtonText ?? fallback.cta_text,
          cta_link: block?.button_link ?? fallback.cta_link,
        };
      }

      return fallback;
    }

    const record = entry as Record<string, unknown>;

    return {
      image_url: typeof record.image_url === "string" ? record.image_url : fallback.image_url,
      top_title:
        typeof record.top_title === "string" && record.top_title.trim() !== LEGACY_HERO_EYEBROW
          ? record.top_title
          : fallback.top_title,
      title:
        typeof record.title === "string" && record.title.trim() !== LEGACY_HERO_TITLE
          ? record.title
          : fallback.title,
      description:
        typeof record.description === "string" && record.description.trim() !== LEGACY_HERO_DESCRIPTION
          ? record.description
          : fallback.description,
      cta_text:
        typeof record.cta_text === "string" && record.cta_text.trim() !== LEGACY_HERO_BUTTON_TEXT
          ? record.cta_text
          : fallback.cta_text,
      cta_link: typeof record.cta_link === "string" ? record.cta_link : fallback.cta_link,
    };
  });

  const offerCards = defaultOfferCards.map((fallback, index) => {
    const entry = Array.isArray(rawCards) ? rawCards[index] : null;

    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return fallback;
    }

    const record = entry as Record<string, unknown>;

    return {
      image_url: typeof record.image_url === "string" ? record.image_url : fallback.image_url,
      title: typeof record.title === "string" ? record.title : fallback.title,
      highlight: typeof record.highlight === "string" ? record.highlight : fallback.highlight,
      cta_link: typeof record.link_url === "string" ? record.link_url : fallback.cta_link,
    };
  });

  return {
    is_active: block?.is_active ?? true,
    active_slide: activeSlide > 3 ? 1 : activeSlide,
    slides,
    offer_cards: offerCards,
  };
}

function buildHeroContentPayload(heroEditor: HeroEditorState) {
  const activeSlide = heroEditor.slides[Math.max(0, Math.min(heroEditor.active_slide - 1, heroEditor.slides.length - 1))];

  return {
    content_key: "hero",
    title: activeSlide.title,
    subtitle: activeSlide.top_title,
    description: activeSlide.description,
    image_url: activeSlide.image_url || null,
    button_text: activeSlide.cta_text || null,
    button_link: activeSlide.cta_link || null,
    is_active: heroEditor.is_active,
    data_json: {
      active_slide: heroEditor.active_slide,
      slides: heroEditor.slides.map((slide) => ({
        image_url: slide.image_url || null,
        top_title: slide.top_title,
        title: slide.title,
        description: slide.description,
        cta_text: slide.cta_text,
        cta_link: slide.cta_link,
      })),
      side_cards: heroEditor.offer_cards.map((card) => ({
        image_url: card.image_url || null,
        title: card.title,
        highlight: card.highlight,
        link_url: card.cta_link || null,
      })),
    },
  };
}

function PreviewBox({ label, imageUrl, removeLabel }: { label: string; imageUrl: string; removeLabel: string }) {
  return (
    <div className="space-y-3">
      <div className="flex h-[168px] items-center justify-center rounded-xl border border-slate-300 bg-slate-50 text-center text-sm text-slate-500 overflow-hidden">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={label} className="h-full w-full rounded-xl object-cover" />
        ) : (
          <span>{label}</span>
        )}
      </div>
      <p className="text-sm text-slate-500">Click the image to edit or update</p>
      <p className="text-sm font-medium text-rose-500">{removeLabel}</p>
    </div>
  );
}

function HomepageMediaModal({
  isOpen,
  target,
  onClose,
  onSelect,
}: {
  isOpen: boolean;
  target: HomepageMediaTarget | null;
  onClose: () => void;
  onSelect: (imageUrl: string) => void;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const [items, setItems] = useState<ProductMediaItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setIsMounted(true);

    return () => {
      setIsMounted(false);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isActive = true;

    const loadItems = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const result = await listProductMedia();

        if (!isActive) {
          return;
        }

        if (result.error) {
          setItems([]);
          setErrorMessage(result.error.message);
          return;
        }

        setItems(result.data);
      } catch (error) {
        if (isActive) {
          setItems([]);
          setErrorMessage(error instanceof Error ? error.message : "Unable to load media library.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadItems();

    return () => {
      isActive = false;
    };
  }, [isOpen]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return items;
    }

    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(normalizedQuery) ||
        item.publicUrl.toLowerCase().includes(normalizedQuery),
    );
  }, [items, searchQuery]);

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) {
      return;
    }

    setIsUploading(true);
    setErrorMessage("");

    try {
      const uploaded: ProductMediaItem[] = [];

      for (const file of files) {
        const result = await uploadProductMedia(file);

        if (result.error || !result.data) {
          setErrorMessage(result.error?.message ?? "Unable to upload image.");
          continue;
        }

        uploaded.push(result.data);
      }

      if (uploaded.length > 0) {
        setItems((current) => [...uploaded, ...current]);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to upload image.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  if (!isMounted || !isOpen || !target) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[1000000] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]">
      <div className="flex h-[85vh] w-full max-w-6xl flex-col overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_40px_120px_rgba(15,23,42,0.22)]">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <h3 className="text-[28px] font-semibold tracking-[-0.02em] text-slate-900">Image Gallery</h3>
            <p className="mt-1 text-sm text-slate-500">
              Select or upload an image for this {target.type === "slider" ? `slider ${target.index + 1}` : `cart ${target.index + 1}`}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
            aria-label="Close gallery modal"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search media"
            className="h-11 w-full max-w-sm rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
          />
          <label className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-[#615FFF] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90">
            {isUploading ? "Uploading..." : "Upload Image"}
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {errorMessage ? (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {errorMessage}
            </div>
          ) : null}

          {isLoading ? (
            <div className="flex h-full min-h-[320px] items-center justify-center text-sm text-slate-500">Loading media library...</div>
          ) : filteredItems.length === 0 ? (
            <div className="flex h-full min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
              No media items found.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-5">
              {filteredItems.map((item) => (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => onSelect(item.publicUrl)}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left transition-all hover:border-[#615FFF]/40 hover:shadow-sm"
                >
                  <div
                    role="img"
                    aria-label={item.name}
                    className="aspect-square bg-slate-100 bg-cover bg-center"
                    style={{ backgroundImage: `url("${item.publicUrl}")` }}
                  />
                  <div className="border-t border-slate-100 px-3 py-2">
                    <p className="truncate text-xs font-medium text-slate-700">{item.name}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-slate-200 px-6 py-4">
          <p className="text-sm text-slate-500">Click any image to use it instantly in the editor.</p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function ThemeEditorForm({ mode, initialRecord, initialHeroContent }: ThemeEditorFormProps) {
  const router = useRouter();
  const initialInput = useMemo(() => normalizeInput(initialRecord), [initialRecord]);
  const [values, setValues] = useState(initialInput);
  const [settingsJsonText, setSettingsJsonText] = useState(prettyJson(initialInput.settings_json));
  const [sectionJsonMap, setSectionJsonMap] = useState<Record<string, string>>(
    Object.fromEntries(initialInput.sections.map((section) => [section.section_key, prettyJson(section.layout_settings)])),
  );
  const [heroEditor, setHeroEditor] = useState(() => normalizeHeroContent(initialHeroContent));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"details" | "sections">("details");
  const [activeSlideTab, setActiveSlideTab] = useState(0);
  const [activeOfferTab, setActiveOfferTab] = useState(0);
  const [openMediaTarget, setOpenMediaTarget] = useState<HomepageMediaTarget | null>(null);

  const heroSectionIndex = values.sections.findIndex((section) => section.section_key === "hero");
  const heroSection = heroSectionIndex >= 0 ? values.sections[heroSectionIndex] : values.sections[0];

  const updateHeroSection = (updater: (current: HomepageThemeSectionInput) => HomepageThemeSectionInput) => {
    setValues((current) => ({
      ...current,
      sections: current.sections.map((section, index) =>
        index === heroSectionIndex ? updater(section) : section,
      ),
    }));
  };

  const submit = async () => {
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const payload: HomepageThemeInput = {
        ...values,
        settings_json: JSON.parse(settingsJsonText),
        sections: values.sections.map((section) => ({
          ...section,
          layout_settings: JSON.parse(sectionJsonMap[section.section_key] ?? "{}"),
        })),
      };

      const result =
        mode === "create"
          ? await createHomepageThemeRequest(payload)
          : await updateHomepageThemeRequest(initialRecord?.theme.id ?? "", payload);

      await saveHomepageContentBlocks({
        blocks: [buildHeroContentPayload(heroEditor)],
      });

      const nextId = result.record?.theme?.id ?? initialRecord?.theme.id;
      router.push(nextId ? `/admin/homepage/themes/${nextId}/edit?saved=1` : "/admin/homepage/themes");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save the homepage theme.");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
  };

  const activeSlide = heroEditor.slides[activeSlideTab];
  const activeOffer = heroEditor.offer_cards[activeOfferTab];

  const handleMediaSelect = (imageUrl: string) => {
    if (!openMediaTarget) {
      return;
    }

    if (openMediaTarget.type === "slider") {
      setHeroEditor((current) => ({
        ...current,
        slides: current.slides.map((slide, index) =>
          index === openMediaTarget.index ? { ...slide, image_url: imageUrl } : slide,
        ),
      }));
    } else {
      setHeroEditor((current) => ({
        ...current,
        offer_cards: current.offer_cards.map((card, index) =>
          index === openMediaTarget.index ? { ...card, image_url: imageUrl } : card,
        ),
      }));
    }

    setOpenMediaTarget(null);
  };

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            {mode === "create" ? "Create Homepage Theme" : "Edit Homepage Theme"}
          </h1>
          <p className="mt-3 text-base text-slate-500">
            Themes define structure and layout only. The content itself stays dynamic and reusable.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void submit()}
            disabled={isSubmitting}
            className="inline-flex min-w-[128px] items-center justify-center rounded-xl bg-[#615FFF] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? "Saving..." : "Save Theme"}
          </button>
          {initialRecord?.theme.id ? (
            <a
              href={`/admin/homepage/themes/${initialRecord.theme.id}/preview`}
              className="inline-flex min-w-[136px] items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-900"
            >
              Open Preview
            </a>
          ) : null}
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {errorMessage}
        </div>
      ) : null}

      <div className="border-b border-slate-200">
        <div className="flex items-center gap-8">
          <button
            type="button"
            onClick={() => setActiveTab("details")}
            className={`border-b-2 px-0 py-3 text-base font-semibold transition-colors ${
              activeTab === "details"
                ? "border-[#615FFF] text-[#615FFF]"
                : "border-transparent text-slate-700 hover:text-slate-950"
            }`}
          >
            Theme Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("sections")}
            className={`border-b-2 px-0 py-3 text-base font-semibold transition-colors ${
              activeTab === "sections"
                ? "border-[#615FFF] text-[#615FFF]"
                : "border-transparent text-slate-700 hover:text-slate-950"
            }`}
          >
            Theme Sections
          </button>
        </div>
      </div>

      {activeTab === "details" ? (
        <div className="space-y-6">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-800">Name</label>
              <input
                value={values.name}
                onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition-colors focus:border-[#615FFF]"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-800">Slug</label>
              <input
                value={values.slug}
                onChange={(event) => setValues((current) => ({ ...current, slug: event.target.value }))}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition-colors focus:border-[#615FFF]"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-800">Description</label>
            <textarea
              value={values.description ?? ""}
              onChange={(event) => setValues((current) => ({ ...current, description: event.target.value || null }))}
              className="min-h-[120px] w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-[#615FFF]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-800">Preview Image URL</label>
            <input
              value={values.preview_image_url ?? ""}
              onChange={(event) => setValues((current) => ({ ...current, preview_image_url: event.target.value || null }))}
              className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition-colors focus:border-[#615FFF]"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_296px] lg:items-end">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-800">Status</label>
              <select
                value={values.status}
                onChange={(event) => setValues((current) => ({ ...current, status: event.target.value as HomepageThemeInput["status"] }))}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition-colors focus:border-[#615FFF]"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <label className="flex h-12 items-center gap-3 rounded-xl border border-slate-300 bg-slate-50 px-4 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={values.is_active}
                onChange={(event) => setValues((current) => ({ ...current, is_active: event.target.checked }))}
                className="h-4 w-4 accent-[#615FFF]"
              />
              Activate this theme after save
            </label>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-800">Settings JSON</label>
            <textarea
              value={settingsJsonText}
              onChange={(event) => setSettingsJsonText(event.target.value)}
              className="min-h-[118px] w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-mono text-xs text-slate-900 outline-none transition-colors focus:border-[#615FFF]"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-800">Section Key</label>
              <input
                value={heroSection?.section_key ?? "hero"}
                disabled
                className="h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 text-sm text-slate-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-800">Component Name</label>
              <input
                value={heroSection?.component_name ?? "hero-section"}
                onChange={(event) => updateHeroSection((current) => ({ ...current, component_name: event.target.value }))}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition-colors focus:border-[#615FFF]"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-800">Section Type</label>
              <select
                value={heroSection?.section_type ?? "hero"}
                onChange={(event) =>
                  updateHeroSection((current) => ({
                    ...current,
                    section_type: event.target.value as HomepageThemeSectionInput["section_type"],
                  }))
                }
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition-colors focus:border-[#615FFF]"
              >
                {defaultSections.map((entry) => (
                  <option key={entry.section_key} value={entry.section_key}>
                    {entry.section_key}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-800">Sort Order</label>
              <input
                type="number"
                value={heroSection?.sort_order ?? 0}
                onChange={(event) => updateHeroSection((current) => ({ ...current, sort_order: Number(event.target.value) || 0 }))}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition-colors focus:border-[#615FFF]"
              />
            </div>
          </div>

          <label className="flex h-12 items-center gap-3 rounded-xl border border-slate-300 bg-slate-50 px-4 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={heroSection?.is_enabled ?? true}
              onChange={(event) => updateHeroSection((current) => ({ ...current, is_enabled: event.target.checked }))}
              className="h-4 w-4 accent-[#615FFF]"
            />
            Activate this section
          </label>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-800">Settings JSON</label>
            <textarea
              value={sectionJsonMap.hero ?? "{}"}
              onChange={(event) =>
                setSectionJsonMap((current) => ({
                  ...current,
                  hero: event.target.value,
                }))
              }
              className="min-h-[118px] w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-mono text-xs text-slate-900 outline-none transition-colors focus:border-[#615FFF]"
            />
          </div>

          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-4">
              <h2 className="text-[28px] font-semibold tracking-tight text-slate-900">Slider Content</h2>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="flex items-center gap-6 border-b border-slate-200 px-6">
                  {heroEditor.slides.map((_, index) => (
                    <button
                      key={`slider-tab-${index + 1}`}
                      type="button"
                      onClick={() => {
                        setActiveSlideTab(index);
                        setHeroEditor((current) => ({ ...current, active_slide: index + 1 }));
                      }}
                      className={`border-b-2 px-0 py-4 text-base font-semibold transition-colors ${
                        activeSlideTab === index
                          ? "border-[#615FFF] text-[#615FFF]"
                          : "border-transparent text-slate-700 hover:text-slate-950"
                      }`}
                    >
                      Slider {index + 1}
                    </button>
                  ))}
                </div>

                <div className="grid gap-6 p-6 lg:grid-cols-[250px_minmax(0,1fr)]">
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-slate-800">Slider Image</label>
                    <button
                      type="button"
                      onClick={() => setOpenMediaTarget({ type: "slider", index: activeSlideTab })}
                      className="block w-full text-left"
                    >
                      <PreviewBox
                        label="Slider image preview"
                        imageUrl={activeSlide.image_url}
                        removeLabel="Remove slider image"
                      />
                    </button>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setOpenMediaTarget({ type: "slider", index: activeSlideTab })}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-[#615FFF] hover:text-slate-900"
                      >
                        {activeSlide.image_url ? "Change Image" : "Select Image"}
                      </button>
                      {activeSlide.image_url ? (
                        <button
                          type="button"
                          onClick={() =>
                            setHeroEditor((current) => ({
                              ...current,
                              slides: current.slides.map((slide, index) =>
                                index === activeSlideTab ? { ...slide, image_url: "" } : slide,
                              ),
                            }))
                          }
                          className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-600 transition-colors hover:border-rose-300"
                        >
                          Remove Image
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-800">Top Title</label>
                      <input
                        value={activeSlide.top_title}
                        onChange={(event) =>
                          setHeroEditor((current) => ({
                            ...current,
                            slides: current.slides.map((slide, index) =>
                              index === activeSlideTab ? { ...slide, top_title: event.target.value } : slide,
                            ),
                          }))
                        }
                        className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition-colors focus:border-[#615FFF]"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-800">Title</label>
                      <input
                        value={activeSlide.title}
                        onChange={(event) =>
                          setHeroEditor((current) => ({
                            ...current,
                            slides: current.slides.map((slide, index) =>
                              index === activeSlideTab ? { ...slide, title: event.target.value } : slide,
                            ),
                          }))
                        }
                        className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition-colors focus:border-[#615FFF]"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-800">Description</label>
                      <textarea
                        value={activeSlide.description}
                        onChange={(event) =>
                          setHeroEditor((current) => ({
                            ...current,
                            slides: current.slides.map((slide, index) =>
                              index === activeSlideTab ? { ...slide, description: event.target.value } : slide,
                            ),
                          }))
                        }
                        className="min-h-[96px] w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-[#615FFF]"
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-800">CTA Text</label>
                        <input
                          value={activeSlide.cta_text}
                          onChange={(event) =>
                            setHeroEditor((current) => ({
                              ...current,
                              slides: current.slides.map((slide, index) =>
                                index === activeSlideTab ? { ...slide, cta_text: event.target.value } : slide,
                              ),
                            }))
                          }
                          className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition-colors focus:border-[#615FFF]"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-800">CTA Navigation</label>
                        <input
                          value={activeSlide.cta_link}
                          onChange={(event) =>
                            setHeroEditor((current) => ({
                              ...current,
                              slides: current.slides.map((slide, index) =>
                                index === activeSlideTab ? { ...slide, cta_link: event.target.value } : slide,
                              ),
                            }))
                          }
                          className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition-colors focus:border-[#615FFF]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-[28px] font-semibold tracking-tight text-slate-900">Offer Cart</h2>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="flex items-center gap-6 border-b border-slate-200 px-6">
                  {heroEditor.offer_cards.map((_, index) => (
                    <button
                      key={`offer-tab-${index + 1}`}
                      type="button"
                      onClick={() => setActiveOfferTab(index)}
                      className={`border-b-2 px-0 py-4 text-base font-semibold transition-colors ${
                        activeOfferTab === index
                          ? "border-[#615FFF] text-[#615FFF]"
                          : "border-transparent text-slate-700 hover:text-slate-950"
                      }`}
                    >
                      Cart {index + 1}
                    </button>
                  ))}
                </div>

                <div className="grid gap-6 p-6 lg:grid-cols-[250px_minmax(0,1fr)]">
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-slate-800">Cart Image</label>
                    <button
                      type="button"
                      onClick={() => setOpenMediaTarget({ type: "offer", index: activeOfferTab })}
                      className="block w-full text-left"
                    >
                      <PreviewBox
                        label=".png image preview"
                        imageUrl={activeOffer.image_url}
                        removeLabel="Remove cart image"
                      />
                    </button>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setOpenMediaTarget({ type: "offer", index: activeOfferTab })}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-[#615FFF] hover:text-slate-900"
                      >
                        {activeOffer.image_url ? "Change Image" : "Select Image"}
                      </button>
                      {activeOffer.image_url ? (
                        <button
                          type="button"
                          onClick={() =>
                            setHeroEditor((current) => ({
                              ...current,
                              offer_cards: current.offer_cards.map((card, index) =>
                                index === activeOfferTab ? { ...card, image_url: "" } : card,
                              ),
                            }))
                          }
                          className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-600 transition-colors hover:border-rose-300"
                        >
                          Remove Image
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-800">Title</label>
                      <input
                        value={activeOffer.title}
                        onChange={(event) =>
                          setHeroEditor((current) => ({
                            ...current,
                            offer_cards: current.offer_cards.map((card, index) =>
                              index === activeOfferTab ? { ...card, title: event.target.value } : card,
                            ),
                          }))
                        }
                        className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition-colors focus:border-[#615FFF]"
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-800">CTA Text</label>
                        <input
                          value={activeOffer.highlight}
                          onChange={(event) =>
                            setHeroEditor((current) => ({
                              ...current,
                              offer_cards: current.offer_cards.map((card, index) =>
                                index === activeOfferTab ? { ...card, highlight: event.target.value } : card,
                              ),
                            }))
                          }
                          className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition-colors focus:border-[#615FFF]"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-800">CTA Navigation</label>
                        <input
                          value={activeOffer.cta_link}
                          onChange={(event) =>
                            setHeroEditor((current) => ({
                              ...current,
                              offer_cards: current.offer_cards.map((card, index) =>
                                index === activeOfferTab ? { ...card, cta_link: event.target.value } : card,
                              ),
                            }))
                          }
                          className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition-colors focus:border-[#615FFF]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void submit()}
              disabled={isSubmitting}
              className="inline-flex min-w-[160px] items-center justify-center rounded-xl bg-[#615FFF] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : "Save Section Changes"}
            </button>
          </div>
        </div>
      )}

      <HomepageMediaModal
        isOpen={openMediaTarget !== null}
        target={openMediaTarget}
        onClose={() => setOpenMediaTarget(null)}
        onSelect={handleMediaSelect}
      />
    </section>
  );
}
