import type { Product, ProductBadge, ProductReview, ProductSpecification } from "@/types/product";
import type {
  JsonValue,
  ProductCategoryOption,
  ProductDbRow,
  ProductDbWeight,
  ProductReview as ProductDbReview,
  ProductSpecification as ProductDbSpecification,
  ProductVendorOption,
} from "@/types/product-db";

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

function isSpecificationRecord(value: JsonValue): value is ProductDbSpecification {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    typeof value.label === "string" &&
    typeof value.value === "string"
  );
}

function buildSpecifications(product: ProductDbRow): ProductSpecification[] {
  if (Array.isArray(product.specifications)) {
    const explicitSpecifications = product.specifications.flatMap((specification) =>
      isSpecificationRecord(specification)
        ? [{ label: specification.label, value: specification.value }]
        : [],
    );

    if (explicitSpecifications.length > 0) {
      return explicitSpecifications;
    }
  }

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
  if (product.short_description && product.short_description.trim().length > 0) {
    return product.short_description;
  }

  if (product.description) {
    return product.description.length > 120 ? `${product.description.slice(0, 117).trimEnd()}...` : product.description;
  }

  return `Wholesale sourcing option with MOQ ${product.moq} and flexible fulfillment review.`;
}

function isReviewRecord(value: unknown): value is ProductDbReview {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildReviews(product: ProductDbRow): ProductReview[] {
  if (!Array.isArray(product.reviews)) {
    return [];
  }

  return product.reviews.filter(isReviewRecord).map((review, index) => ({
    reviewer:
      typeof review.author === "string" && review.author.trim().length > 0
        ? review.author
        : `Buyer ${index + 1}`,
    comment: typeof review.comment === "string" ? review.comment : "No review comment provided.",
    rating: typeof review.rating === "number" ? review.rating : undefined,
    title: typeof review.title === "string" ? review.title : undefined,
    createdAt: typeof review.created_at === "string" ? review.created_at : undefined,
  }));
}

function getVendorName(product: ProductDbRow, vendors: ProductVendorOption[]) {
  if (!product.vendor_id) {
    return null;
  }

  return vendors.find((vendor) => vendor.id === product.vendor_id)?.name ?? null;
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
  vendors: ProductVendorOption[] = [],
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
    reviews: buildReviews(product),
    buyerNotes: buildBuyerNotes(product),
    category: category?.slug ?? "uncategorized",
    vendorName: getVendorName(product, vendors),
  };
}
