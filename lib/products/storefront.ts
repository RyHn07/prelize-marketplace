import type { Product, ProductBadge, ProductSpecification } from "@/types/product";
import type { ProductCategoryOption, ProductDbRow, ProductDbWeight } from "@/types/product-db";

function normalizeBadge(value: string | null): ProductBadge | undefined {
  return value === "Hot" || value === "New" || value === "Best Value" ? value : undefined;
}

function normalizeWeight(weight: ProductDbWeight) {
  if (weight === null || weight === undefined || weight === "") {
    return "Weight on request";
  }

  return String(weight);
}

function buildGallery(product: ProductDbRow) {
  const galleryImages = (product.gallery_images ?? []).filter((image): image is string => Boolean(image));

  if (galleryImages.length > 0) {
    return galleryImages;
  }

  if (product.image_url) {
    return [product.image_url];
  }

  return [];
}

function buildSpecifications(product: ProductDbRow): ProductSpecification[] {
  const attributeSpecifications = (product.attributes ?? [])
    .filter((attribute) => attribute.name.trim().length > 0 && attribute.values.length > 0)
    .map((attribute) => ({
      label: attribute.name,
      value: attribute.values.join(", "),
    }));

  if (attributeSpecifications.length > 0) {
    return attributeSpecifications;
  }

  return [
    {
      label: "Minimum Order",
      value: `${product.moq} unit${product.moq === 1 ? "" : "s"}`,
    },
    {
      label: "Shipping Profile",
      value: product.cdd_shipping_profile ?? "standard",
    },
    {
      label: "Availability",
      value: product.status === "draft" ? "Draft" : product.is_active ? "Active" : "Disabled",
    },
  ];
}

function buildBuyerNotes(product: ProductDbRow) {
  return [
    {
      title: "Shipping note",
      description:
        "Final Bangladesh shipping cost is confirmed after order review based on packed weight, route, and consolidation needs.",
    },
    {
      title: "MOQ reminder",
      description: `Current minimum order quantity starts from ${product.moq}.`,
    },
  ];
}

function buildShortDescription(product: ProductDbRow) {
  if (product.description) {
    return product.description.length > 120 ? `${product.description.slice(0, 117).trimEnd()}...` : product.description;
  }

  return `Wholesale sourcing option with MOQ ${product.moq} and flexible fulfillment review.`;
}

export function getCategoryById(
  categoryId: string | null,
  categories: ProductCategoryOption[],
) {
  if (!categoryId) {
    return null;
  }

  return categories.find((category) => category.id === categoryId) ?? null;
}

export function mapProductDbToStorefrontProduct(
  product: ProductDbRow,
  categories: ProductCategoryOption[] = [],
): Product {
  const category = getCategoryById(product.category_id, categories);
  const gallery = buildGallery(product);
  const primaryImage = product.image_url ?? gallery[0] ?? "/file.svg";

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    image: primaryImage,
    gallery: gallery.length > 0 ? gallery : [primaryImage],
    priceFrom: product.price,
    moq: `${product.moq} unit${product.moq === 1 ? "" : "s"}`,
    weight: normalizeWeight(product.weight),
    badge: normalizeBadge(product.badge),
    shortDescription: buildShortDescription(product),
    description: product.description ?? "Product description will be updated soon.",
    specifications: buildSpecifications(product),
    buyerNotes: buildBuyerNotes(product),
    category: category?.slug ?? "uncategorized",
  };
}
