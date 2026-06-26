import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { getAdminProductCategoryOptions, getAdminProductEditorRecord, getAdminProductVendorOptions } from "@/lib/admin/vps-data";
import { query } from "@/lib/db";
import { createProductEditorRecordWithClient, updateProductEditorRecordWithClient, type ProductEditorSavePayload } from "@/lib/products/actions";
import { getDatabaseServiceClient } from "@/lib/auth/request";
import type {
  ImportedPriceTier,
  ImportedProductMappedData,
  ImportedVariant,
  ProductImportDownloadedImages,
  ProductImportMode,
  ProductImportOverwriteKey,
  ProductImportReviewPayload,
  ProductImportRow,
  ProductImportSavePayload,
} from "@/types/product-import";
import type {
  JsonValue,
  ProductDbRow,
  ProductDbVariantRow,
  ProductEditorRecord,
  ProductPricingTierRow,
  ProductPricingTierSetRow,
  ProductPricingTierSetTierRow,
} from "@/types/product-db";

type UnknownRecord = Record<string, unknown>;

type Fetch1688Input = {
  sourceUrl: string;
  importMode: ProductImportMode;
  targetProductId?: string | null;
  createdBy?: string | null;
};

type Normalized1688Data = {
  source_url: string;
  source_offer_id: string;
  original_title: string;
  translated_title: string;
  short_description: string;
  full_description: string;
  product_description_images: string[];
  main_images: string[];
  sku_options: Array<{ name: string; values: string[] }>;
  variants: ImportedVariant[];
  price_tiers: ImportedPriceTier[];
  moq: number;
  currency: "CNY";
  supplier_name: string | null;
  supplier_location: string | null;
  stock_quantity: number | null;
  domestic_shipping_cost: number | null;
  raw_api_response: JsonValue;
  specifications: Array<{ label: string; value: string }>;
};

const IMAGE_DOWNLOAD_LIMIT = 40;
const LOCAL_IMPORT_IMAGE_DIR = path.join(process.cwd(), "public", "uploads", "product-imports");
const DEFAULT_OPEN_PRICING_TIER_MAX_QTY = 9999;

export function extract1688OfferId(sourceUrl: string) {
  try {
    const parsedUrl = new URL(sourceUrl.trim());
    const host = parsedUrl.hostname.toLowerCase();
    const offerMatch = parsedUrl.pathname.match(/\/offer\/(\d+)\.html/i);

    if (!host.endsWith("1688.com") || !offerMatch?.[1]) {
      return null;
    }

    return offerMatch[1];
  } catch {
    return null;
  }
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as UnknownRecord) : {};
}

function pickRecord(root: unknown, keys: string[]) {
  let current = asRecord(root);

  for (const key of keys) {
    current = asRecord(current[key]);
  }

  return current;
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function firstNumber(...values: unknown[]) {
  for (const value of values) {
    const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value.replace(/[^\d.]/g, "")) : NaN;

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function firstArray(value: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const current = value[key];

    if (Array.isArray(current)) {
      return current;
    }
  }

  return [];
}

function getProviderErrorMessage(payload: unknown) {
  const record = asRecord(payload);
  const message = firstString(record.message, record.error, record.errorMessage, record.msg);

  if (message) {
    return message;
  }

  const nestedData = asRecord(record.data);
  const nestedMessage = firstString(nestedData.message, nestedData.error, nestedData.errorMessage, nestedData.msg);

  return nestedMessage || "";
}

function normalizeImageList(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item : firstString(asRecord(item).url, asRecord(item).imageUrl, asRecord(item).image_url)))
      .filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

  return [];
}

function getNestedValue(record: UnknownRecord, pathParts: string[]) {
  let current: unknown = record;

  for (const part of pathParts) {
    current = asRecord(current)[part];
  }

  return current;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 90) || "imported-1688-product";
}

function buildImportSlug(title: string, offerId: string) {
  const slug = slugify(title);

  return slug === "imported-1688-product" ? `1688-${offerId}` : slug;
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function normalizePriceTiers(root: UnknownRecord): ImportedPriceTier[] {
  const rawTiers = [
    ...firstArray(root, ["price_tiers", "priceTiers", "priceRanges", "ladderPrices", "skuPriceRange"]),
    ...firstArray(asRecord(root.tiered_price_info), ["prices"]),
    ...firstArray(asRecord(root.tieredPriceInfo), ["prices"]),
  ];

  const normalizedTiers = rawTiers
    .map((item) => {
      const record = asRecord(item);
      const minQuantity = firstNumber(record.min_quantity, record.minQuantity, record.beginAmount, record.startQuantity, record.min, record.quantity) ?? 1;
      const maxQuantity = firstNumber(record.max_quantity, record.maxQuantity, record.endAmount, record.endQuantity, record.max);
      const unitPrice = firstNumber(record.unit_price, record.unitPrice, record.price, record.priceCny, record.discountPrice) ?? 0;

      return {
        min_quantity: Math.max(1, Math.floor(minQuantity)),
        max_quantity: maxQuantity !== null && maxQuantity > 0 ? Math.floor(maxQuantity) : null,
        unit_price: Math.max(0, unitPrice),
        currency: "CNY" as const,
      };
    })
    .filter((tier) => tier.unit_price > 0)
    .sort((left, right) => left.min_quantity - right.min_quantity);

  if (normalizedTiers.length > 0) {
    return normalizedTiers;
  }

  const priceInfo = asRecord(root.price_info ?? root.priceInfo);
  const fallbackPrice = firstNumber(
    priceInfo.price,
    priceInfo.price_min,
    priceInfo.priceMin,
    priceInfo.origin_price_min,
    priceInfo.originPriceMin,
    root.price,
    root.price_min,
    root.priceMin,
  );
  const fallbackMoq = firstNumber(
    getNestedValue(root, ["tiered_price_info", "begin_num"]),
    root.moq,
    root.minOrderQuantity,
    root.beginAmount,
  ) ?? 1;

  return fallbackPrice !== null && fallbackPrice > 0
    ? [
        {
          min_quantity: Math.max(1, Math.floor(fallbackMoq)),
          max_quantity: null,
          unit_price: fallbackPrice,
          currency: "CNY",
        },
      ]
    : [];
}

function normalizeVariants(root: UnknownRecord): ImportedVariant[] {
  const rawVariants = firstArray(root, ["variants", "sku_infos", "skuInfos", "skus", "sku_list", "skuList"]);
  const optionImageByName = new Map<string, string>();

  firstArray(root, ["sku_props", "skuProps", "saleProps"]).forEach((option) => {
    firstArray(asRecord(option), ["values", "items", "options"]).forEach((value) => {
      const valueRecord = asRecord(value);
      const name = firstString(valueRecord.name, valueRecord.value);
      const imageUrl = firstString(valueRecord.imageUrl, valueRecord.image_url, valueRecord.image);

      if (name && imageUrl) {
        optionImageByName.set(name, imageUrl);
      }
    });
  });

  return rawVariants.map((item, index) => {
    const record = asRecord(item);
    const attributes = asRecord(record.attributes ?? record.attribute_values ?? record.specAttrs);
    const propsNames = firstString(record.props_names, record.propsNames);
    const propParts = propsNames.split(";").map((part) => part.trim()).filter(Boolean);
    const propsAttributeEntries = propParts
      .map((part) => {
        const [name, ...valueParts] = part.split(":");
        return name && valueParts.length > 0 ? [name.trim(), valueParts.join(":").trim()] : null;
      })
      .filter((entry): entry is [string, string] => entry !== null);
    const mergedAttributes = {
      ...Object.fromEntries(propsAttributeEntries),
      ...Object.fromEntries(
        Object.entries(attributes).filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim().length > 0),
      ),
    };
    const value = firstString(record.value, record.spec, record.specName, propsAttributeEntries[0]?.[1]);
    const name = firstString(record.name, record.skuName, record.title, value) || `Variant ${index + 1}`;

    return {
      sku: firstString(record.sku, record.skuId, record.sku_id, record.skuid) || null,
      name,
      value: value || null,
      price: firstNumber(record.price, record.unit_price, record.discountPrice, record.sale_price, record.salePrice, record.origin_price),
      moq: firstNumber(record.moq, record.minOrderQuantity),
      stock_quantity: firstNumber(record.stock_quantity, record.stock, record.amountOnSale),
      image_url: firstString(record.image_url, record.imageUrl, record.image) || (value ? optionImageByName.get(value) ?? null : null),
      attributes: mergedAttributes,
    };
  });
}

function normalizeSkuOptions(root: UnknownRecord, variants: ImportedVariant[]) {
  const rawOptions = firstArray(root, ["sku_options", "skuOptions", "saleProps", "attributes", "sku_props", "skuProps"]);
  const options = rawOptions
    .map((item) => {
      const record = asRecord(item);
      const name = firstString(record.name, record.propName, record.attributeName, record.prop_name);
      const values = firstArray(record, ["values", "items", "options"])
        .map((value) => (typeof value === "string" ? value : firstString(asRecord(value).name, asRecord(value).value)))
        .filter(Boolean);

      return name && values.length > 0 ? { name, values: uniqueStrings(values) } : null;
    })
    .filter((item): item is { name: string; values: string[] } => item !== null);

  if (options.length > 0) {
    return options;
  }

  const byName = new Map<string, Set<string>>();
  variants.forEach((variant) => {
    Object.entries(variant.attributes).forEach(([name, value]) => {
      const current = byName.get(name) ?? new Set<string>();
      current.add(value);
      byName.set(name, current);
    });
  });

  return Array.from(byName.entries()).map(([name, values]) => ({ name, values: Array.from(values) }));
}

function normalizeSpecifications(root: UnknownRecord) {
  const rawSpecs = firstArray(root, ["specifications", "specs", "productAttributes", "props", "product_props", "productProps"]);

  return rawSpecs
    .map((item) => {
      const record = asRecord(item);
      const label = firstString(record.label, record.name, record.key, record.attrName);
      const value = firstString(record.value, record.attrValue);

      if (!label && !value) {
        const [entry] = Object.entries(record);
        return entry ? { label: entry[0], value: String(entry[1] ?? "") } : null;
      }

      return label || value ? { label, value } : null;
    })
    .filter((item): item is { label: string; value: string } => item !== null);
}

function unwrapApiPayload(value: unknown): UnknownRecord {
  let current = asRecord(value);

  for (const key of ["data", "result", "item", "item_detail", "itemDetail", "product"]) {
    const nested = asRecord(current[key]);

    if (Object.keys(nested).length > 0) {
      current = nested;
    }
  }

  return current;
}

function extractProductPayload(apiResponse: unknown): UnknownRecord {
  const root = asRecord(apiResponse);
  const data = asRecord(root.data);
  const detail = data.detail ? unwrapApiPayload(data.detail) : unwrapApiPayload(apiResponse);
  const description = data.description ? unwrapApiPayload(data.description) : {};
  const detailDescription = firstString(
    detail.full_description,
    detail.description,
    detail.detail,
    detail.descriptionHtml,
    detail.desc,
  );
  const descriptionText = firstString(
    description.full_description,
    description.description,
    description.detail,
    description.descriptionHtml,
    description.desc,
    description.content,
    description.html,
  );

  return {
    ...detail,
    full_description: detailDescription || descriptionText,
    product_description_images: uniqueStrings([
      ...normalizeImageList(detail.product_description_images),
      ...normalizeImageList(detail.descriptionImages),
      ...normalizeImageList(detail.detailImages),
      ...normalizeImageList(description.product_description_images),
      ...normalizeImageList(description.descriptionImages),
      ...normalizeImageList(description.detailImages),
      ...normalizeImageList(description.images),
    ]),
  };
}

function normalizeApiResponse(apiResponse: unknown, sourceUrl: string, offerId: string): Normalized1688Data {
  const product = extractProductPayload(apiResponse);
  const variants = normalizeVariants(product);
  const priceTiers = normalizePriceTiers(product);
  const title = firstString(product.original_title, product.originalTitle, product.title, product.subject, product.name);
  const descriptionImages = uniqueStrings([
    ...normalizeImageList(product.product_description_images),
    ...normalizeImageList(product.descriptionImages),
    ...normalizeImageList(product.detailImages),
  ]);
  const mainImages = uniqueStrings([
    ...normalizeImageList(product.main_images),
    ...normalizeImageList(product.mainImages),
    ...normalizeImageList(product.main_imgs),
    ...normalizeImageList(product.images),
    ...normalizeImageList(product.image_url),
  ]);
  const moq = firstNumber(product.moq, product.minOrderQuantity, product.beginAmount, getNestedValue(product, ["tiered_price_info", "begin_num"])) ?? priceTiers[0]?.min_quantity ?? 1;

  return {
    source_url: sourceUrl,
    source_offer_id: offerId,
    original_title: title,
    translated_title: firstString(product.translated_title, product.translatedTitle, product.englishTitle),
    short_description: firstString(product.short_description, product.shortDescription, product.summary),
    full_description: firstString(product.full_description, product.description, product.detail, product.descriptionHtml),
    product_description_images: descriptionImages,
    main_images: mainImages,
    sku_options: normalizeSkuOptions(product, variants),
    variants,
    price_tiers: priceTiers,
    moq: Math.max(1, Math.floor(moq)),
    currency: "CNY",
    supplier_name: firstString(product.supplier_name, product.supplierName, pickRecord(product, ["supplier"]).name, getNestedValue(product, ["shop_info", "shop_name"])) || null,
    supplier_location: firstString(product.supplier_location, product.supplierLocation, pickRecord(product, ["supplier"]).location, getNestedValue(product, ["delivery_info", "location"])) || null,
    stock_quantity: firstNumber(product.stock_quantity, product.stock, product.amountOnSale),
    domestic_shipping_cost: firstNumber(product.domestic_shipping_cost, product.domesticShippingCost, product.freight, pickRecord(product, ["shipping"]).cost, getNestedValue(product, ["delivery_info", "delivery_fee"])),
    raw_api_response: apiResponse as JsonValue,
    specifications: normalizeSpecifications(product),
  };
}

async function fetch1688ProviderProduct(sourceUrl: string, offerId: string) {
  const provider = process.env["1688_API_PROVIDER"]?.trim();
  const baseUrl = process.env["1688_API_BASE_URL"]?.trim();
  const apiKey = process.env["1688_API_KEY"]?.trim();

  if (!provider || !baseUrl || !apiKey) {
    throw new Error("1688 import provider is not configured. Add 1688_API_PROVIDER, 1688_API_BASE_URL, and 1688_API_KEY.");
  }

  if (provider.toLowerCase() === "rapidapi") {
    return fetchRapidApi1688Product(baseUrl, apiKey, offerId);
  }

  const response = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-API-Key": apiKey,
    },
    body: JSON.stringify({
      provider,
      offerId,
      sourceUrl,
    }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok || !payload) {
    throw new Error("Product data could not be fetched. Please try again.");
  }

  return payload;
}

async function fetchRapidApiJson(url: URL, apiKey: string) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "x-rapidapi-host": url.hostname,
      "x-rapidapi-key": apiKey,
    },
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok || !payload) {
    const providerMessage = getProviderErrorMessage(payload);
    const statusMessage = response.status === 403
      ? "RapidAPI rejected the request. Please subscribe to the API plan or check the RapidAPI key."
      : response.status === 429
        ? "RapidAPI request limit reached. Please wait or upgrade the API plan."
        : "Product data could not be fetched. Please try again.";

    throw new Error(providerMessage ? `${statusMessage} Provider message: ${providerMessage}` : statusMessage);
  }

  return payload;
}

async function fetchRapidApi1688Product(baseUrl: string, apiKey: string, offerId: string) {
  const detailUrl = new URL("/1688/v2/item_detail", baseUrl);
  detailUrl.searchParams.set("item_id", offerId);

  const descriptionUrl = new URL("/1688/v2/item_description", baseUrl);
  descriptionUrl.searchParams.set("item_id", offerId);

  const detail = await fetchRapidApiJson(detailUrl, apiKey);
  const description = await fetchRapidApiJson(descriptionUrl, apiKey).catch((error) => ({
    description_fetch_error: error instanceof Error ? error.message : "Product description could not be fetched.",
  }));

  return {
    provider: "rapidapi",
    data: {
      detail,
      description,
    },
  };
}

function guessImageExtension(contentType: string | null, imageUrl: string) {
  if (contentType?.includes("png")) {
    return "png";
  }

  if (contentType?.includes("webp")) {
    return "webp";
  }

  if (contentType?.includes("gif")) {
    return "gif";
  }

  try {
    const extension = new URL(imageUrl).pathname.split(".").pop()?.toLowerCase();
    return extension && extension.length <= 5 ? extension : "jpg";
  } catch {
    return "jpg";
  }
}

async function downloadImage(imageUrl: string, offerId: string, index: number) {
  const response = await fetch(imageUrl, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Image download failed with status ${response.status}.`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  const extension = guessImageExtension(response.headers.get("content-type"), imageUrl);
  const fileName = `${Date.now()}-${index}.${extension}`;
  const localDir = path.join(LOCAL_IMPORT_IMAGE_DIR, offerId);
  const localPath = path.join(localDir, fileName);

  await mkdir(localDir, { recursive: true });
  await writeFile(localPath, bytes);

  return `/uploads/product-imports/${offerId}/${fileName}`;
}

async function downloadProductImages(data: Normalized1688Data): Promise<ProductImportDownloadedImages> {
  const imageSources = uniqueStrings([
    ...data.main_images,
    ...data.product_description_images,
    ...data.variants.map((variant) => variant.image_url ?? ""),
  ]).slice(0, IMAGE_DOWNLOAD_LIMIT);
  const sourceToLocal = new Map<string, string>();
  const failed: ProductImportDownloadedImages["failed"] = [];

  for (const [index, imageUrl] of imageSources.entries()) {
    try {
      sourceToLocal.set(imageUrl, await downloadImage(imageUrl, data.source_offer_id, index));
    } catch (error) {
      failed.push({
        source_url: imageUrl,
        error: error instanceof Error ? error.message : "Some images could not be downloaded. You can upload images manually.",
      });
    }
  }

  return {
    main_images: data.main_images.map((imageUrl) => sourceToLocal.get(imageUrl)).filter((value): value is string => Boolean(value)),
    product_description_images: data.product_description_images.map((imageUrl) => sourceToLocal.get(imageUrl)).filter((value): value is string => Boolean(value)),
    variant_images: data.variants
      .map((variant) => {
        if (!variant.image_url) {
          return null;
        }

        const localUrl = sourceToLocal.get(variant.image_url);
        return localUrl ? { source_url: variant.image_url, local_url: localUrl } : null;
      })
      .filter((value): value is { source_url: string; local_url: string } => value !== null),
    failed,
  };
}

async function cleanWithOpenAi(data: Normalized1688Data) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return {
      clean_title: data.translated_title || data.original_title,
      short_description: data.short_description,
      full_description: data.full_description,
      seo_title: data.translated_title || data.original_title,
      seo_description: data.short_description,
      tags: [] as string[],
      suggested_category: null as string | null,
      product_highlights: [] as string[],
      specifications: data.specifications,
      error: "AI processing skipped because OPENAI_API_KEY is not configured.",
    };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content:
              "You prepare imported marketplace product copy. Do not invent facts. Translate, clean, organize, and leave uncertain fields empty.",
          },
          {
            role: "user",
            content: JSON.stringify({
              title: data.translated_title || data.original_title,
              short_description: data.short_description,
              full_description: data.full_description,
              specifications: data.specifications,
              price_tiers: data.price_tiers,
              supplier: {
                name: data.supplier_name,
                location: data.supplier_location,
              },
            }),
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "clean_product_import",
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                clean_title: { type: "string" },
                short_description: { type: "string" },
                full_description: { type: "string" },
                seo_title: { type: "string" },
                seo_description: { type: "string" },
                tags: { type: "array", items: { type: "string" } },
                suggested_category: { type: ["string", "null"] },
                product_highlights: { type: "array", items: { type: "string" } },
                specifications: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      label: { type: "string" },
                      value: { type: "string" },
                    },
                    required: ["label", "value"],
                  },
                },
              },
              required: [
                "clean_title",
                "short_description",
                "full_description",
                "seo_title",
                "seo_description",
                "tags",
                "suggested_category",
                "product_highlights",
                "specifications",
              ],
            },
          },
        },
      }),
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as UnknownRecord | null;
    const output = extractOpenAiJsonText(payload);
    const parsed = output ? JSON.parse(output) : null;
    const parsedRecord = asRecord(parsed);

    if (!response.ok || !parsedRecord.clean_title) {
      throw new Error("AI processing failed.");
    }

    return {
      clean_title: firstString(parsedRecord.clean_title),
      short_description: firstString(parsedRecord.short_description),
      full_description: firstString(parsedRecord.full_description),
      seo_title: firstString(parsedRecord.seo_title),
      seo_description: firstString(parsedRecord.seo_description),
      tags: Array.isArray(parsedRecord.tags) ? parsedRecord.tags.filter((tag): tag is string => typeof tag === "string") : [],
      suggested_category: firstString(parsedRecord.suggested_category) || null,
      product_highlights: Array.isArray(parsedRecord.product_highlights)
        ? parsedRecord.product_highlights.filter((item): item is string => typeof item === "string")
        : [],
      specifications: Array.isArray(parsedRecord.specifications)
        ? parsedRecord.specifications
            .map((item) => {
              const record = asRecord(item);
              return { label: firstString(record.label), value: firstString(record.value) };
            })
            .filter((item) => item.label || item.value)
        : data.specifications,
      error: null,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "AI processing failed.";
    const friendlyError = errorMessage === "fetch failed"
      ? "AI processing failed because OpenAI API could not be reached from this server. Imported source data is still available for manual review."
      : errorMessage;

    return {
      clean_title: data.translated_title || data.original_title,
      short_description: data.short_description,
      full_description: data.full_description,
      seo_title: data.translated_title || data.original_title,
      seo_description: data.short_description,
      tags: [] as string[],
      suggested_category: null as string | null,
      product_highlights: [] as string[],
      specifications: data.specifications,
      error: friendlyError,
    };
  }
}

function extractOpenAiJsonText(payload: UnknownRecord | null) {
  const outputText = firstString(payload?.output_text);

  if (outputText) {
    return outputText;
  }

  const output = Array.isArray(payload?.output) ? payload.output : [];

  for (const outputItem of output) {
    const rawContent = asRecord(outputItem).content;
    const content = Array.isArray(rawContent) ? rawContent : [];

    for (const contentItem of content) {
      const record = asRecord(contentItem);
      const text = firstString(record.text);

      if (text) {
        return text;
      }
    }
  }

  return "";
}

function buildMappedData(data: Normalized1688Data, images: ProductImportDownloadedImages, ai: Awaited<ReturnType<typeof cleanWithOpenAi>>): ImportedProductMappedData {
  const cleanTitle = ai.clean_title || data.translated_title || data.original_title;
  const shippingNote =
    data.domestic_shipping_cost === null
      ? "Shipping cost was not found. Please enter it manually."
      : "Estimated Shipping Cost from 1688 domestic freight data.";
  const variantImageBySource = new Map(images.variant_images.map((image) => [image.source_url, image.local_url]));

  return {
    source_url: data.source_url,
    source_offer_id: data.source_offer_id,
    original_title: data.original_title,
    translated_title: data.translated_title,
    clean_title: cleanTitle,
    slug: buildImportSlug(cleanTitle, data.source_offer_id),
    sku: `1688-${data.source_offer_id}`,
    short_description: ai.short_description || data.short_description,
    full_description: ai.full_description || data.full_description,
    seo_title: ai.seo_title || cleanTitle,
    seo_description: ai.seo_description || ai.short_description || data.short_description,
    tags: ai.tags,
    suggested_category: ai.suggested_category,
    product_highlights: ai.product_highlights,
    specifications: ai.specifications,
    main_images: images.main_images,
    product_description_images: images.product_description_images,
    sku_options: data.sku_options,
    variants: data.variants.map((variant) => ({
      ...variant,
      image_url: variant.image_url ? variantImageBySource.get(variant.image_url) ?? null : null,
    })),
    price_tiers: data.price_tiers,
    moq: data.moq,
    currency: "CNY",
    supplier_name: data.supplier_name,
    supplier_location: data.supplier_location,
    stock_quantity: data.stock_quantity,
    domestic_shipping_cost_cny: data.domestic_shipping_cost,
    estimated_international_shipping_cost: null,
    shipping_note: shippingNote,
  };
}

export async function create1688ProductImport(input: Fetch1688Input) {
  const offerId = extract1688OfferId(input.sourceUrl);

  if (!offerId) {
    throw new Error("Invalid 1688 product URL. Please enter a valid 1688 product link.");
  }

  if (input.importMode === "update" && !input.targetProductId) {
    throw new Error("Select a target product before importing update data.");
  }

  const rawApiResponse = await fetch1688ProviderProduct(input.sourceUrl, offerId);
  const normalized = normalizeApiResponse(rawApiResponse, input.sourceUrl, offerId);

  if (!normalized.original_title && !normalized.translated_title) {
    throw new Error("Missing title. Product data could not be fetched. Please try again.");
  }

  const downloadedImages = await downloadProductImages(normalized);
  const ai = await cleanWithOpenAi(normalized);
  const mappedData = buildMappedData(normalized, downloadedImages, ai);
  const errors = [
    ...downloadedImages.failed.map((failure) => failure.error),
    ai.error,
    mappedData.price_tiers.length === 0 ? "Missing price tier. Please enter pricing manually." : null,
    mappedData.main_images.length === 0 ? "Missing product images. You can upload images manually." : null,
    mappedData.domestic_shipping_cost_cny === null ? "Shipping cost was not found. Please enter it manually." : null,
  ].filter(Boolean);

  const result = await query<ProductImportRow>(
    `
      insert into public.product_imports (
        source,
        source_url,
        source_offer_id,
        target_product_id,
        import_mode,
        status,
        raw_data,
        mapped_data,
        downloaded_images,
        errors,
        created_by
      )
      values ('1688', $1, $2, $3, $4, 'ready_for_review', $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9)
      returning *
    `,
    [
      input.sourceUrl,
      offerId,
      input.targetProductId ?? null,
      input.importMode,
      JSON.stringify(normalized),
      JSON.stringify(mappedData),
      JSON.stringify(downloadedImages),
      errors.length > 0 ? JSON.stringify(errors) : null,
      input.createdBy ?? null,
    ],
  );

  return result.rows[0];
}

async function getImportRow(id: string) {
  const result = await query<ProductImportRow>("select * from public.product_imports where id = $1 limit 1", [id]);
  return result.rows[0] ?? null;
}

export async function get1688ProductImportReview(id: string): Promise<ProductImportReviewPayload | null> {
  const importRow = await getImportRow(id);

  if (!importRow) {
    return null;
  }

  const [categoryResult, vendorResult, brandResult, productsResult, targetProductResult] = await Promise.all([
    getAdminProductCategoryOptions(),
    getAdminProductVendorOptions(),
    query<{ id: string; name: string }>("select id, name from public.brands order by name asc"),
    query<{ id: string; name: string; slug: string }>("select id, name, slug from public.products order by created_at desc limit 500"),
    importRow.target_product_id ? getAdminProductEditorRecord(importRow.target_product_id) : Promise.resolve({ data: null }),
  ]);

  return {
    ...importRow,
    target_product: targetProductResult.data ?? null,
    product_options: {
      categories: categoryResult.rows.map((category) => ({ id: category.id, name: category.name })),
      brands: brandResult.rows,
      vendors: vendorResult.rows.map((vendor) => ({ id: vendor.id, name: vendor.name })),
      products: productsResult.rows,
    },
  };
}

function toProductPayload(mapped: ImportedProductMappedData, fields: ProductImportSavePayload["fields"], status: "draft" | "active") {
  const title = (fields.title ?? fields.clean_title ?? mapped.clean_title).trim();
  const priceTierPrice = fields.price_tiers?.[0]?.unit_price ?? mapped.price_tiers[0]?.unit_price ?? 0;
  const price = Number(fields.price ?? priceTierPrice);
  const salePrice = fields.sale_price ?? null;
  const mainImages = fields.main_images ?? mapped.main_images;
  const galleryImages = uniqueStrings([...(fields.main_images ?? mapped.main_images), ...(fields.product_description_images ?? mapped.product_description_images)]);
  const specifications = fields.specifications ?? mapped.specifications;

  return {
    vendor_id: fields.vendor_id ?? null,
    category_id: fields.category_id ?? null,
    brand_id: fields.brand_id ?? null,
    name: title,
    slug: fields.slug ?? mapped.slug,
    sku: fields.sku ?? mapped.sku,
    description: fields.full_description ?? mapped.full_description,
    image_url: mainImages[0] ?? null,
    price,
    moq: fields.moq ?? mapped.moq,
    weight: null,
    badge: null,
    is_active: status === "active",
    status,
    product_type: "variable" as const,
    regular_price: null,
    discount_price: salePrice,
    gallery_images: galleryImages,
    attributes: (fields.sku_options ?? mapped.sku_options).map((option) => ({ name: option.name, values: option.values })),
    specifications,
    cdd_shipping_profile: "standard" as const,
    cnds_profile_id: null,
    pricing_tier_profile_id: null,
    pricing_source: "use_product_tier" as const,
    buying_price_cny: price,
    profit_percent: 0,
    profit_amount_cny: 0,
    selling_price_cny: price,
    exchange_rate_cny_to_bdt: 16,
    short_description: fields.short_description ?? mapped.short_description,
    seo_title: fields.seo_title ?? mapped.seo_title,
    seo_description: fields.seo_description ?? mapped.seo_description,
    tags: fields.tags ?? mapped.tags,
    domestic_shipping_cost_cny: fields.domestic_shipping_cost_cny ?? mapped.domestic_shipping_cost_cny,
    estimated_international_shipping_cost: fields.estimated_international_shipping_cost ?? mapped.estimated_international_shipping_cost,
    shipping_note: fields.shipping_note ?? mapped.shipping_note,
    source: "1688",
    source_url: mapped.source_url,
    source_offer_id: mapped.source_offer_id,
  };
}

function toPricingTiers(mapped: ImportedProductMappedData, fields: ProductImportSavePayload["fields"]) {
  const sourceTiers = fields.price_tiers ?? mapped.price_tiers;
  const fallbackVariantPrices = (fields.variants ?? mapped.variants)
    .map((variant) => variant.price)
    .filter((price): price is number => typeof price === "number" && Number.isFinite(price) && price > 0);
  const fallbackTiers = sourceTiers.length > 0
    ? sourceTiers
    : [
        {
          min_quantity: fields.moq ?? mapped.moq,
          max_quantity: null,
          unit_price: fallbackVariantPrices.length > 0 ? Math.min(...fallbackVariantPrices) : Number(fields.price ?? 0),
          currency: "CNY" as const,
        },
      ];

  return fallbackTiers.map((tier, index) => ({
      pricing_type: "unit" as const,
      min_qty: Math.max(1, Math.floor(tier.min_quantity)),
      max_qty: tier.max_quantity !== null ? Math.max(Math.floor(tier.min_quantity), Math.floor(tier.max_quantity)) : null,
      price: Number(tier.unit_price),
      sort_order: index,
    }))
    .map((tier, index, rows) => {
      const nextMinQty = rows[index + 1]?.min_qty;
      const autoMaxQty = nextMinQty ? Math.max(tier.min_qty, nextMinQty - 1) : DEFAULT_OPEN_PRICING_TIER_MAX_QTY;

      return {
        ...tier,
        max_qty: tier.max_qty ?? autoMaxQty,
      };
    });
}

function toVariants(mapped: ImportedProductMappedData, fields: ProductImportSavePayload["fields"]) {
  const variants = fields.variants ?? mapped.variants;
  const fallbackPrice = (fields.price_tiers ?? mapped.price_tiers)[0]?.unit_price ?? 0;
  const variantRows = variants.length > 0
    ? variants
    : [
        {
          sku: mapped.sku,
          name: mapped.clean_title || mapped.original_title || "Default",
          value: null,
          price: fallbackPrice,
          moq: mapped.moq,
          stock_quantity: mapped.stock_quantity,
          image_url: mapped.main_images[0] ?? null,
          attributes: {},
        },
      ];

  return variantRows.map((variant) => ({
    sku: variant.sku,
    name: variant.name,
    value: variant.value,
    regular_price: variant.price ?? fallbackPrice,
    discount_price: null,
    price: variant.price ?? fallbackPrice,
    buying_price_cny: variant.price ?? fallbackPrice,
    profit_amount_cny: 0,
    selling_price_cny: variant.price ?? fallbackPrice,
    moq: variant.moq ?? mapped.moq,
    stock: variant.stock_quantity ?? mapped.stock_quantity ?? 0,
    weight: null,
    image_url: variant.image_url,
    pricing_tier_set_id: "imported-1688-default",
    attribute_values: variant.attributes,
  }));
}

function toPayload(mapped: ImportedProductMappedData, fields: ProductImportSavePayload["fields"], status: "draft" | "active"): ProductEditorSavePayload {
  const product = toProductPayload(mapped, fields, status);
  const variants = toVariants(mapped, fields);

  return {
    product,
    variants,
    pricing_tiers: [],
    pricing_tier_sets: [
      {
        temp_id: "imported-1688-default",
        name: "1688 Imported Pricing",
        fallback_price: (fields.price_tiers ?? mapped.price_tiers)[0]?.unit_price ?? product.price,
        pricing_type: "unit",
        sort_order: 0,
        rows: toPricingTiers(mapped, fields),
      },
    ],
  };
}

function existingProductToPayload(record: ProductEditorRecord): ProductEditorSavePayload {
  const product = record.product;
  const specifications = Array.isArray(product.specifications)
    ? product.specifications
        .map((item) => {
          const recordItem = asRecord(item);
          const label = firstString(recordItem.label);
          const value = firstString(recordItem.value);
          return label || value ? { label, value } : null;
        })
        .filter((item): item is { label: string; value: string } => item !== null)
    : [];

  return {
    product: {
      vendor_id: product.vendor_id ?? null,
      category_id: product.category_id ?? null,
      brand_id: product.brand_id ?? null,
      name: product.name,
      slug: product.slug,
      sku: product.sku ?? null,
      description: product.description ?? null,
      image_url: product.image_url ?? null,
      price: product.price,
      moq: product.moq,
      weight: product.weight,
      badge: product.badge,
      is_active: product.is_active,
      status: (product.status ?? (product.is_active ? "active" : "disabled")) as "active" | "disabled" | "draft",
      product_type: product.product_type ?? (record.variants.length > 0 ? "variable" : "single"),
      regular_price: product.regular_price ?? product.price,
      discount_price: product.discount_price ?? null,
      gallery_images: product.gallery_images ?? [],
      attributes: product.attributes ?? [],
      specifications,
      cdd_shipping_profile: product.cdd_shipping_profile ?? "standard",
      cnds_profile_id: product.cnds_profile_id ?? null,
      pricing_tier_profile_id: product.pricing_tier_profile_id ?? null,
      pricing_source: product.pricing_source ?? "use_product_tier",
      buying_price_cny: product.buying_price_cny ?? product.price,
      profit_percent: product.profit_percent ?? 0,
      profit_amount_cny: product.profit_amount_cny ?? 0,
      selling_price_cny: product.selling_price_cny ?? product.price,
      exchange_rate_cny_to_bdt: product.exchange_rate_cny_to_bdt ?? 16,
    },
    variants: record.variants.map((variant: ProductDbVariantRow) => ({
      name: variant.name,
      value: variant.value ?? null,
      regular_price: variant.regular_price,
      discount_price: variant.discount_price,
      price: variant.price,
      buying_price_cny: variant.buying_price_cny ?? variant.price,
      profit_amount_cny: variant.profit_amount_cny ?? 0,
      selling_price_cny: variant.selling_price_cny ?? variant.price,
      moq: variant.moq,
      stock: variant.stock ?? 0,
      weight: variant.weight ?? null,
      image_url: variant.image_url,
      pricing_tier_set_id: variant.pricing_tier_set_id ?? null,
      attribute_values: variant.attribute_values ?? {},
    })),
    pricing_tiers: record.pricing_tiers.map((tier: ProductPricingTierRow, index) => ({
      pricing_type: tier.pricing_type,
      min_qty: tier.min_qty,
      max_qty: tier.max_qty,
      price: tier.buying_price_cny ?? tier.price,
      sort_order: tier.sort_order ?? index,
    })),
    pricing_tier_sets: record.pricing_tier_sets.map(({ set, rows }: { set: ProductPricingTierSetRow; rows: ProductPricingTierSetTierRow[] }, index) => ({
      temp_id: set.id,
      name: set.name,
      fallback_price: set.buying_price_cny ?? set.fallback_price,
      pricing_type: set.pricing_type,
      sort_order: set.sort_order ?? index,
      rows: rows.map((row, rowIndex) => ({
        pricing_type: set.pricing_type,
        min_qty: row.min_qty,
        max_qty: row.max_qty,
        price: row.buying_price_cny ?? row.price,
        sort_order: row.sort_order ?? rowIndex,
      })),
    })),
  };
}

function shouldOverwrite(overwrite: ProductImportSavePayload["overwrite"], key: ProductImportOverwriteKey) {
  return Boolean(overwrite[key]);
}

function mergeUpdatePayload(existing: ProductEditorSavePayload, imported: ProductEditorSavePayload, overwrite: ProductImportSavePayload["overwrite"]) {
  const product = { ...existing.product };

  if (shouldOverwrite(overwrite, "title")) {
    product.name = imported.product.name;
    product.slug = imported.product.slug;
    product.sku = imported.product.sku;
  }

  if (shouldOverwrite(overwrite, "short_description")) {
    (product as typeof product & { short_description?: string | null }).short_description = (imported.product as typeof imported.product & { short_description?: string | null }).short_description ?? null;
  }

  if (shouldOverwrite(overwrite, "full_description")) {
    product.description = imported.product.description;
    product.specifications = imported.product.specifications;
  }

  if (shouldOverwrite(overwrite, "images")) {
    product.image_url = imported.product.image_url;
    product.gallery_images = imported.product.gallery_images;
  }

  if (shouldOverwrite(overwrite, "shipping_cost")) {
    Object.assign(product, {
      domestic_shipping_cost_cny: (imported.product as UnknownRecord).domestic_shipping_cost_cny,
      estimated_international_shipping_cost: (imported.product as UnknownRecord).estimated_international_shipping_cost,
      shipping_note: (imported.product as UnknownRecord).shipping_note,
    });
  }

  if (shouldOverwrite(overwrite, "tags")) {
    Object.assign(product, { tags: (imported.product as UnknownRecord).tags });
  }

  if (shouldOverwrite(overwrite, "category")) {
    product.category_id = imported.product.category_id;
    product.brand_id = imported.product.brand_id;
    product.vendor_id = imported.product.vendor_id;
  }

  if (shouldOverwrite(overwrite, "seo")) {
    Object.assign(product, {
      seo_title: (imported.product as UnknownRecord).seo_title,
      seo_description: (imported.product as UnknownRecord).seo_description,
    });
  }

  const nextVariants = shouldOverwrite(overwrite, "sku_variants") ? imported.variants : existing.variants;
  const nextPricingTiers = shouldOverwrite(overwrite, "price_tiers") ? imported.pricing_tiers : existing.pricing_tiers;
  const nextPricingTierSets = shouldOverwrite(overwrite, "price_tiers") ? imported.pricing_tier_sets : existing.pricing_tier_sets;

  if (shouldOverwrite(overwrite, "sku_variants")) {
    product.product_type = imported.product.product_type;
    product.attributes = imported.product.attributes;
  }

  return {
    product,
    variants: nextVariants,
    pricing_tiers: nextPricingTiers,
    pricing_tier_sets: nextPricingTierSets,
  };
}

async function validateSku(payload: ProductEditorSavePayload, excludeProductId?: string | null) {
  const skus = uniqueStrings([
    payload.product.sku ?? "",
    ...payload.variants.map((variant) => firstString((variant as UnknownRecord).sku)),
  ]);

  if (skus.length === 0) {
    return;
  }

  const productsResult = await query<{ sku: string }>(
    `
      select sku from public.products
      where sku = any($1::text[])
      and ($2::uuid is null or id <> $2::uuid)
      limit 1
    `,
    [skus, excludeProductId ?? null],
  );

  if (productsResult.rows[0]) {
    throw new Error("SKU already exists. Please change the SKU before saving.");
  }
}

export async function save1688ProductImport(id: string, payload: ProductImportSavePayload) {
  const importRow = await getImportRow(id);

  if (!importRow) {
    throw new Error("Import record not found.");
  }

  if (importRow.status === "cancelled") {
    throw new Error("This import was cancelled.");
  }

  const status = payload.action === "publish" ? "active" : "draft";
  const importedPayload = toPayload(importRow.mapped_data, payload.fields, status);
  const dataClient = getDatabaseServiceClient();
  let productId: string | null = null;

  if (payload.action === "update") {
    if (!importRow.target_product_id) {
      throw new Error("Product not found. Select an existing product before updating.");
    }

    const existing = await getAdminProductEditorRecord(importRow.target_product_id);

    if (!existing.data) {
      throw new Error("Product not found.");
    }

    const mergedPayload = mergeUpdatePayload(existingProductToPayload(existing.data), importedPayload, payload.overwrite);
    await validateSku(mergedPayload, importRow.target_product_id);
    const result = await updateProductEditorRecordWithClient(dataClient, importRow.target_product_id, mergedPayload);

    if (result.error || !result.data) {
      throw new Error(result.error?.message ?? "Existing product update failed.");
    }

    productId = result.data.id;
  } else {
    await validateSku(importedPayload);
    const result = await createProductEditorRecordWithClient(dataClient, importedPayload);

    if (result.error || !result.data) {
      throw new Error(result.error?.message ?? "Database save error.");
    }

    productId = result.data.id;
  }

  await query(
    `
      update public.product_imports
      set status = 'saved',
          mapped_data = $2::jsonb,
          updated_at = timezone('utc'::text, now())
      where id = $1
    `,
    [id, JSON.stringify({ ...importRow.mapped_data, ...payload.fields })],
  );

  return { productId, product: importedPayload };
}

export async function cancel1688ProductImport(id: string) {
  await query(
    `
      update public.product_imports
      set status = 'cancelled',
          updated_at = timezone('utc'::text, now())
      where id = $1
    `,
    [id],
  );
}
