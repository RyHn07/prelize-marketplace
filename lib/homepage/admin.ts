import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  HomepageBannerRow,
  HomepageContentBlockRow,
  HomepageProductSectionRow,
  HomepageProductSectionSourceType,
  HomepageThemeRow,
  HomepageThemeSectionKey,
  HomepageThemeSectionRow,
  HomepageThemeStatus,
  JsonValue,
} from "@/types/product-db";

type RawHomepageThemeRow = Partial<HomepageThemeRow> & {
  id: string;
  name: string;
  slug: string;
};

type RawHomepageThemeSectionRow = Partial<HomepageThemeSectionRow> & {
  id: string;
  theme_id: string;
  section_key: string;
  section_type: string;
  component_name: string;
};

type RawHomepageContentBlockRow = Partial<HomepageContentBlockRow> & {
  id: string;
  content_key: string;
};

type RawHomepageBannerRow = Partial<HomepageBannerRow> & { id: string };
type RawHomepageProductSectionRow = Partial<HomepageProductSectionRow> & {
  id: string;
  title: string;
  section_key: string;
  source_type: string;
};

export type HomepageThemeInput = {
  name: string;
  slug: string;
  description: string | null;
  preview_image_url: string | null;
  status: HomepageThemeStatus;
  is_active: boolean;
  settings_json: JsonValue;
  sections: HomepageThemeSectionInput[];
};

export type HomepageThemeSectionInput = {
  id?: string | null;
  section_key: HomepageThemeSectionKey;
  section_type: HomepageThemeSectionKey;
  component_name: string;
  sort_order: number;
  is_enabled: boolean;
  layout_settings: JsonValue;
};

export type HomepageContentBlockInput = {
  content_key: string;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  image_url: string | null;
  button_text: string | null;
  button_link: string | null;
  data_json: JsonValue;
  is_active: boolean;
};

export type HomepageBannerInput = {
  title: string | null;
  subtitle: string | null;
  image_url: string | null;
  link_url: string | null;
  placement: string | null;
  sort_order: number;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
};

export type HomepageProductSectionInput = {
  title: string;
  subtitle: string | null;
  section_key: string;
  source_type: HomepageProductSectionSourceType;
  category_id: string | null;
  product_ids: string[];
  limit_count: number;
  sort_order: number;
  is_active: boolean;
};

export type HomepageThemeEditorRecord = {
  theme: HomepageThemeRow;
  sections: HomepageThemeSectionRow[];
};

const DEFAULT_THEME_SECTIONS: HomepageThemeSectionInput[] = [
  { section_key: "hero", section_type: "hero", component_name: "hero-section", sort_order: 0, is_enabled: true, layout_settings: {} },
  { section_key: "featured_categories", section_type: "featured_categories", component_name: "featured-categories", sort_order: 1, is_enabled: true, layout_settings: {} },
  { section_key: "promo_banners", section_type: "promo_banners", component_name: "promo-banners", sort_order: 2, is_enabled: true, layout_settings: {} },
  { section_key: "product_showcase", section_type: "product_showcase", component_name: "product-showcase", sort_order: 3, is_enabled: true, layout_settings: {} },
  { section_key: "why_choose_prelize", section_type: "why_choose_prelize", component_name: "why-choose", sort_order: 4, is_enabled: true, layout_settings: {} },
  { section_key: "how_it_works", section_type: "how_it_works", component_name: "how-it-works", sort_order: 5, is_enabled: true, layout_settings: {} },
  { section_key: "lead_capture", section_type: "lead_capture", component_name: "lead-capture", sort_order: 6, is_enabled: true, layout_settings: {} },
  { section_key: "testimonials", section_type: "testimonials", component_name: "testimonials", sort_order: 7, is_enabled: true, layout_settings: {} },
];

function normalizeText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeSlug(value: unknown) {
  const raw = normalizeText(value) ?? "";
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function normalizeBoolean(value: unknown, fallback = true) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeInteger(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function normalizePositiveInteger(value: unknown, fallback = 1) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : fallback;
}

function normalizeJson(value: unknown): JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    Array.isArray(value) ||
    (typeof value === "object" && value !== null)
  ) {
    return value as JsonValue;
  }

  return {};
}

function normalizeTimestamp(value: unknown) {
  return typeof value === "string" ? value : new Date(0).toISOString();
}

function normalizeThemeRow(row: RawHomepageThemeRow): HomepageThemeRow {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: normalizeText(row.description),
    preview_image_url: normalizeText(row.preview_image_url),
    status: row.status === "active" || row.status === "archived" ? row.status : "draft",
    is_active: row.is_active === true,
    settings_json: normalizeJson(row.settings_json ?? {}),
    created_at: normalizeTimestamp(row.created_at),
    updated_at: normalizeTimestamp(row.updated_at),
  };
}

function normalizeThemeSectionRow(row: RawHomepageThemeSectionRow): HomepageThemeSectionRow {
  return {
    id: row.id,
    theme_id: row.theme_id,
    section_key: row.section_key as HomepageThemeSectionRow["section_key"],
    section_type: row.section_type as HomepageThemeSectionRow["section_type"],
    component_name: row.component_name,
    sort_order: normalizeInteger(row.sort_order, 0),
    is_enabled: normalizeBoolean(row.is_enabled, true),
    layout_settings: normalizeJson(row.layout_settings ?? {}),
    created_at: normalizeTimestamp(row.created_at),
    updated_at: normalizeTimestamp(row.updated_at),
  };
}

function normalizeContentBlockRow(row: RawHomepageContentBlockRow): HomepageContentBlockRow {
  return {
    id: row.id,
    content_key: row.content_key,
    title: normalizeText(row.title),
    subtitle: normalizeText(row.subtitle),
    description: normalizeText(row.description),
    image_url: normalizeText(row.image_url),
    button_text: normalizeText(row.button_text),
    button_link: normalizeText(row.button_link),
    data_json: normalizeJson(row.data_json ?? {}),
    is_active: normalizeBoolean(row.is_active, true),
    created_at: normalizeTimestamp(row.created_at),
    updated_at: normalizeTimestamp(row.updated_at),
  };
}

function normalizeBannerRow(row: RawHomepageBannerRow): HomepageBannerRow {
  return {
    id: row.id,
    title: normalizeText(row.title),
    subtitle: normalizeText(row.subtitle),
    image_url: normalizeText(row.image_url),
    link_url: normalizeText(row.link_url),
    placement: normalizeText(row.placement),
    sort_order: normalizeInteger(row.sort_order, 0),
    start_date: normalizeText(row.start_date),
    end_date: normalizeText(row.end_date),
    is_active: normalizeBoolean(row.is_active, true),
    created_at: normalizeTimestamp(row.created_at),
  };
}

function normalizeProductSectionRow(row: RawHomepageProductSectionRow): HomepageProductSectionRow {
  return {
    id: row.id,
    title: row.title,
    subtitle: normalizeText(row.subtitle),
    section_key: row.section_key,
    source_type:
      row.source_type === "manual" ||
      row.source_type === "featured" ||
      row.source_type === "category" ||
      row.source_type === "low_moq"
        ? row.source_type
        : "newest",
    category_id: normalizeText(row.category_id),
    product_ids: Array.isArray(row.product_ids)
      ? row.product_ids.filter((entry): entry is string => typeof entry === "string")
      : [],
    limit_count: normalizePositiveInteger(row.limit_count, 8),
    sort_order: normalizeInteger(row.sort_order, 0),
    is_active: normalizeBoolean(row.is_active, true),
    created_at: normalizeTimestamp(row.created_at),
  };
}

export function parseHomepageThemeInput(payload: unknown): HomepageThemeInput {
  const source = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const rawSections = Array.isArray(source.sections) ? source.sections : DEFAULT_THEME_SECTIONS;

  return {
    name: normalizeText(source.name) ?? "",
    slug: normalizeSlug(source.slug),
    description: normalizeText(source.description),
    preview_image_url: normalizeText(source.preview_image_url),
    status: source.status === "active" || source.status === "archived" ? source.status : "draft",
    is_active: normalizeBoolean(source.is_active, false),
    settings_json: normalizeJson(source.settings_json ?? {}),
    sections: rawSections.map((entry, index) => {
      const section = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
      const sectionKey =
        section.section_key === "featured_categories" ||
        section.section_key === "promo_banners" ||
        section.section_key === "product_showcase" ||
        section.section_key === "why_choose_prelize" ||
        section.section_key === "how_it_works" ||
        section.section_key === "lead_capture" ||
        section.section_key === "testimonials"
          ? section.section_key
          : "hero";

      return {
        id: normalizeText(section.id),
        section_key: sectionKey,
        section_type:
          section.section_type === "featured_categories" ||
          section.section_type === "promo_banners" ||
          section.section_type === "product_showcase" ||
          section.section_type === "why_choose_prelize" ||
          section.section_type === "how_it_works" ||
          section.section_type === "lead_capture" ||
          section.section_type === "testimonials"
            ? section.section_type
            : sectionKey,
        component_name: normalizeText(section.component_name) ?? DEFAULT_THEME_SECTIONS[index]?.component_name ?? "hero-section",
        sort_order: normalizeInteger(section.sort_order, index),
        is_enabled: normalizeBoolean(section.is_enabled, true),
        layout_settings: normalizeJson(section.layout_settings ?? {}),
      };
    }),
  };
}

export function validateHomepageThemeInput(input: HomepageThemeInput) {
  if (!input.name.trim()) {
    return "Theme name is required.";
  }

  if (!input.slug.trim()) {
    return "Theme slug is required.";
  }

  if (input.sections.length === 0) {
    return "Add at least one homepage section.";
  }

  return null;
}

export function parseHomepageContentBlockInput(payload: unknown): HomepageContentBlockInput {
  const source = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};

  return {
    content_key: normalizeText(source.content_key) ?? "",
    title: normalizeText(source.title),
    subtitle: normalizeText(source.subtitle),
    description: normalizeText(source.description),
    image_url: normalizeText(source.image_url),
    button_text: normalizeText(source.button_text),
    button_link: normalizeText(source.button_link),
    data_json: normalizeJson(source.data_json ?? {}),
    is_active: normalizeBoolean(source.is_active, true),
  };
}

export function validateHomepageContentBlockInput(input: HomepageContentBlockInput) {
  if (!input.content_key.trim()) {
    return "Content key is required.";
  }

  return null;
}

export function parseHomepageBannerInput(payload: unknown): HomepageBannerInput {
  const source = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};

  return {
    title: normalizeText(source.title),
    subtitle: normalizeText(source.subtitle),
    image_url: normalizeText(source.image_url),
    link_url: normalizeText(source.link_url),
    placement: normalizeText(source.placement),
    sort_order: normalizeInteger(source.sort_order, 0),
    start_date: normalizeText(source.start_date),
    end_date: normalizeText(source.end_date),
    is_active: normalizeBoolean(source.is_active, true),
  };
}

export function parseHomepageProductSectionInput(payload: unknown): HomepageProductSectionInput {
  const source = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};

  return {
    title: normalizeText(source.title) ?? "",
    subtitle: normalizeText(source.subtitle),
    section_key: normalizeSlug(source.section_key),
    source_type:
      source.source_type === "manual" ||
      source.source_type === "featured" ||
      source.source_type === "category" ||
      source.source_type === "low_moq"
        ? source.source_type
        : "newest",
    category_id: normalizeText(source.category_id),
    product_ids: Array.isArray(source.product_ids)
      ? source.product_ids.filter((entry): entry is string => typeof entry === "string")
      : [],
    limit_count: normalizePositiveInteger(source.limit_count, 8),
    sort_order: normalizeInteger(source.sort_order, 0),
    is_active: normalizeBoolean(source.is_active, true),
  };
}

export function validateHomepageProductSectionInput(input: HomepageProductSectionInput) {
  if (!input.title.trim()) {
    return "Section title is required.";
  }

  if (!input.section_key.trim()) {
    return "Section key is required.";
  }

  return null;
}

async function fetchThemeById(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase.from("homepage_themes").select("*").eq("id", id).maybeSingle();
  return {
    data: data ? normalizeThemeRow(data as RawHomepageThemeRow) : null,
    error,
  };
}

async function fetchThemeSections(supabase: SupabaseClient, themeId: string) {
  const { data, error } = await supabase
    .from("homepage_theme_sections")
    .select("*")
    .eq("theme_id", themeId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return {
    data: ((data ?? []) as RawHomepageThemeSectionRow[]).map(normalizeThemeSectionRow),
    error,
  };
}

async function syncThemeSections(supabase: SupabaseClient, themeId: string, sections: HomepageThemeSectionInput[]) {
  const { error: deleteError } = await supabase.from("homepage_theme_sections").delete().eq("theme_id", themeId);

  if (deleteError) {
    return deleteError;
  }

  if (sections.length === 0) {
    return null;
  }

  const rows = sections.map((section, index) => ({
    theme_id: themeId,
    section_key: section.section_key,
    section_type: section.section_type,
    component_name: section.component_name,
    sort_order: section.sort_order ?? index,
    is_enabled: section.is_enabled,
    layout_settings: section.layout_settings,
  }));

  const { error } = await supabase.from("homepage_theme_sections").insert(rows as never);
  return error;
}

export async function listHomepageThemes(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("homepage_themes")
    .select("*")
    .order("updated_at", { ascending: false });

  return {
    data: ((data ?? []) as RawHomepageThemeRow[]).map(normalizeThemeRow),
    error,
  };
}

export async function getHomepageThemeEditorRecord(supabase: SupabaseClient, id: string) {
  const [themeResult, sectionResult] = await Promise.all([
    fetchThemeById(supabase, id),
    fetchThemeSections(supabase, id),
  ]);

  return {
    data:
      themeResult.data
        ? ({
            theme: themeResult.data,
            sections: sectionResult.data,
          } satisfies HomepageThemeEditorRecord)
        : null,
    error: themeResult.error ?? sectionResult.error,
  };
}

export async function createHomepageTheme(supabase: SupabaseClient, input: HomepageThemeInput) {
  const { data, error } = await supabase
    .from("homepage_themes")
    .insert({
      name: input.name.trim(),
      slug: input.slug,
      description: input.description,
      preview_image_url: input.preview_image_url,
      status: input.is_active ? "active" : input.status,
      is_active: input.is_active,
      settings_json: input.settings_json,
    } as never)
    .select("id")
    .single();

  if (error || !data) {
    return {
      data: null as HomepageThemeEditorRecord | null,
      error,
    };
  }

  if (input.is_active) {
    await supabase.from("homepage_themes").update({ is_active: false } as never).neq("id", (data as { id: string }).id);
  }

  const sectionError = await syncThemeSections(supabase, (data as { id: string }).id, input.sections);

  if (sectionError) {
    return {
      data: null as HomepageThemeEditorRecord | null,
      error: sectionError,
    };
  }

  return getHomepageThemeEditorRecord(supabase, (data as { id: string }).id);
}

export async function updateHomepageTheme(
  supabase: SupabaseClient,
  id: string,
  input: HomepageThemeInput,
) {
  const { error } = await supabase
    .from("homepage_themes")
    .update({
      name: input.name.trim(),
      slug: input.slug,
      description: input.description,
      preview_image_url: input.preview_image_url,
      status: input.is_active ? "active" : input.status,
      is_active: input.is_active,
      settings_json: input.settings_json,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", id);

  if (error) {
    return {
      data: null as HomepageThemeEditorRecord | null,
      error,
    };
  }

  if (input.is_active) {
    await supabase.from("homepage_themes").update({ is_active: false } as never).neq("id", id);
    await supabase.from("homepage_themes").update({ is_active: true, status: "active" } as never).eq("id", id);
  }

  const sectionError = await syncThemeSections(supabase, id, input.sections);

  if (sectionError) {
    return {
      data: null as HomepageThemeEditorRecord | null,
      error: sectionError,
    };
  }

  return getHomepageThemeEditorRecord(supabase, id);
}

export async function activateHomepageTheme(supabase: SupabaseClient, id: string) {
  const { error: resetError } = await supabase
    .from("homepage_themes")
    .update({ is_active: false } as never)
    .neq("id", "");

  if (resetError) {
    return resetError;
  }

  const { error } = await supabase
    .from("homepage_themes")
    .update({ is_active: true, status: "active", updated_at: new Date().toISOString() } as never)
    .eq("id", id);

  return error;
}

export async function archiveHomepageTheme(supabase: SupabaseClient, id: string) {
  const { error } = await supabase
    .from("homepage_themes")
    .update({ status: "archived", is_active: false, updated_at: new Date().toISOString() } as never)
    .eq("id", id);

  return error;
}

export async function duplicateHomepageTheme(supabase: SupabaseClient, id: string) {
  const editorResult = await getHomepageThemeEditorRecord(supabase, id);

  if (editorResult.error || !editorResult.data) {
    return {
      data: null as HomepageThemeEditorRecord | null,
      error: editorResult.error,
    };
  }

  const duplicateInput: HomepageThemeInput = {
    name: `${editorResult.data.theme.name} Copy`,
    slug: `${editorResult.data.theme.slug}-copy-${Date.now().toString().slice(-5)}`,
    description: editorResult.data.theme.description,
    preview_image_url: editorResult.data.theme.preview_image_url,
    status: "draft",
    is_active: false,
    settings_json: editorResult.data.theme.settings_json,
    sections: editorResult.data.sections.map((section) => ({
      section_key: section.section_key,
      section_type: section.section_type,
      component_name: section.component_name,
      sort_order: section.sort_order,
      is_enabled: section.is_enabled,
      layout_settings: section.layout_settings,
    })),
  };

  return createHomepageTheme(supabase, duplicateInput);
}

export async function deleteHomepageTheme(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("homepage_themes").delete().eq("id", id);
  return error;
}

export async function listHomepageContentBlocks(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("homepage_content_blocks")
    .select("*")
    .order("content_key", { ascending: true });

  return {
    data: ((data ?? []) as RawHomepageContentBlockRow[]).map(normalizeContentBlockRow),
    error,
  };
}

export async function upsertHomepageContentBlock(
  supabase: SupabaseClient,
  input: HomepageContentBlockInput,
) {
  const { data, error } = await supabase
    .from("homepage_content_blocks")
    .upsert(
      {
        content_key: input.content_key,
        title: input.title,
        subtitle: input.subtitle,
        description: input.description,
        image_url: input.image_url,
        button_text: input.button_text,
        button_link: input.button_link,
        data_json: input.data_json,
        is_active: input.is_active,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "content_key" },
    )
    .select("*")
    .single();

  return {
    data: data ? normalizeContentBlockRow(data as RawHomepageContentBlockRow) : null,
    error,
  };
}

export async function listHomepageBanners(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("homepage_banners")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return {
    data: ((data ?? []) as RawHomepageBannerRow[]).map(normalizeBannerRow),
    error,
  };
}

export async function createHomepageBanner(supabase: SupabaseClient, input: HomepageBannerInput) {
  const { data, error } = await supabase
    .from("homepage_banners")
    .insert(input as never)
    .select("*")
    .single();

  return {
    data: data ? normalizeBannerRow(data as RawHomepageBannerRow) : null,
    error,
  };
}

export async function updateHomepageBanner(
  supabase: SupabaseClient,
  id: string,
  input: HomepageBannerInput,
) {
  const { data, error } = await supabase
    .from("homepage_banners")
    .update(input as never)
    .eq("id", id)
    .select("*")
    .single();

  return {
    data: data ? normalizeBannerRow(data as RawHomepageBannerRow) : null,
    error,
  };
}

export async function deleteHomepageBanner(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("homepage_banners").delete().eq("id", id);
  return error;
}

export async function listHomepageProductSections(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("homepage_product_sections")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return {
    data: ((data ?? []) as RawHomepageProductSectionRow[]).map(normalizeProductSectionRow),
    error,
  };
}

export async function createHomepageProductSection(
  supabase: SupabaseClient,
  input: HomepageProductSectionInput,
) {
  const { data, error } = await supabase
    .from("homepage_product_sections")
    .insert(input as never)
    .select("*")
    .single();

  return {
    data: data ? normalizeProductSectionRow(data as RawHomepageProductSectionRow) : null,
    error,
  };
}

export async function updateHomepageProductSection(
  supabase: SupabaseClient,
  id: string,
  input: HomepageProductSectionInput,
) {
  const { data, error } = await supabase
    .from("homepage_product_sections")
    .update(input as never)
    .eq("id", id)
    .select("*")
    .single();

  return {
    data: data ? normalizeProductSectionRow(data as RawHomepageProductSectionRow) : null,
    error,
  };
}

export async function deleteHomepageProductSection(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("homepage_product_sections").delete().eq("id", id);
  return error;
}
