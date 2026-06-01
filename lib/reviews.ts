import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseClient } from "@/lib/supabase-client";
import type { ProductReview as StorefrontProductReview } from "@/types/product";
import type { ProductReviewRow, ReviewEligibilityItem, VendorReviewNotificationStateRow } from "@/types/product-db";

function resolveSupabaseClient(client?: SupabaseClient) {
  return client ?? getSupabaseClient();
}

function isMissingRelationError(message: string) {
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes("relation") ||
    normalizedMessage.includes("does not exist") ||
    normalizedMessage.includes("could not find")
  );
}

function normalizeText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizeRating(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.max(1, Math.min(5, Math.round(parsed)));
}

function normalizeReviewRow(row: ProductReviewRow): ProductReviewRow {
  return {
    ...row,
    vendor_id: typeof row.vendor_id === "string" ? row.vendor_id : null,
    order_item_id: typeof row.order_item_id === "string" ? row.order_item_id : null,
    user_email: normalizeText(row.user_email),
    rating: normalizeRating(row.rating) ?? 5,
    title: normalizeText(row.title),
    comment: normalizeText(row.comment) ?? "",
    created_at: typeof row.created_at === "string" ? row.created_at : new Date(0).toISOString(),
    updated_at: typeof row.updated_at === "string" ? row.updated_at : new Date(0).toISOString(),
  };
}

export function mapReviewRowToStorefrontReview(review: ProductReviewRow): StorefrontProductReview {
  const reviewerLabel =
    review.user_email && review.user_email.includes("@")
      ? `${review.user_email.split("@")[0].slice(0, 3) || "Buy"}***`
      : "Verified customer";

  return {
    reviewer: reviewerLabel,
    comment: review.comment,
    rating: review.rating,
    title: review.title ?? "Verified marketplace buyer",
    createdAt: review.created_at,
  };
}

export async function listProductReviews(productId: string, client?: SupabaseClient) {
  const supabase = resolveSupabaseClient(client);
  const { data, error } = await supabase
    .from("product_reviews")
    .select("id, product_id, vendor_id, order_id, order_item_id, user_id, user_email, rating, title, comment, created_at, updated_at")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });

  if (error && isMissingRelationError(error.message)) {
    return {
      data: [] as ProductReviewRow[],
      error: null,
    };
  }

  return {
    data: ((data ?? []) as ProductReviewRow[]).map(normalizeReviewRow),
    error,
  };
}

export async function listProductReviewsByProductIds(productIds: string[], client?: SupabaseClient) {
  const uniqueIds = Array.from(new Set(productIds.filter(Boolean)));

  if (uniqueIds.length === 0) {
    return {
      data: new Map<string, ProductReviewRow[]>(),
      error: null,
    };
  }

  const supabase = resolveSupabaseClient(client);
  const { data, error } = await supabase
    .from("product_reviews")
    .select("id, product_id, vendor_id, order_id, order_item_id, user_id, user_email, rating, title, comment, created_at, updated_at")
    .in("product_id", uniqueIds)
    .order("created_at", { ascending: false });

  if (error && isMissingRelationError(error.message)) {
    return {
      data: new Map<string, ProductReviewRow[]>(),
      error: null,
    };
  }

  const reviewMap = new Map<string, ProductReviewRow[]>();

  ((data ?? []) as ProductReviewRow[]).forEach((row) => {
    const normalized = normalizeReviewRow(row);
    const current = reviewMap.get(normalized.product_id) ?? [];
    current.push(normalized);
    reviewMap.set(normalized.product_id, current);
  });

  return {
    data: reviewMap,
    error,
  };
}

export async function getProductReviewSummaryMap(productIds: string[], client?: SupabaseClient) {
  const uniqueIds = Array.from(new Set(productIds.filter(Boolean)));

  if (uniqueIds.length === 0) {
    return {
      data: new Map<string, { averageRating: number; reviewCount: number }>(),
      error: null,
    };
  }

  const supabase = resolveSupabaseClient(client);
  const { data, error } = await supabase
    .from("product_reviews")
    .select("product_id, rating")
    .in("product_id", uniqueIds);

  if (error && isMissingRelationError(error.message)) {
    return {
      data: new Map<string, { averageRating: number; reviewCount: number }>(),
      error: null,
    };
  }

  const totals = new Map<string, { ratingTotal: number; reviewCount: number }>();

  ((data ?? []) as Array<{ product_id: string; rating: number }>).forEach((row) => {
    const current = totals.get(row.product_id) ?? { ratingTotal: 0, reviewCount: 0 };
    current.ratingTotal += normalizeRating(row.rating) ?? 0;
    current.reviewCount += 1;
    totals.set(row.product_id, current);
  });

  return {
    data: new Map(
      Array.from(totals.entries()).map(([productId, total]) => [
        productId,
        {
          averageRating: total.reviewCount > 0 ? total.ratingTotal / total.reviewCount : 0,
          reviewCount: total.reviewCount,
        },
      ]),
    ),
    error,
  };
}

export async function listOrderReviewEligibility(
  userId: string,
  userEmail: string | null,
  orderId: string,
  client?: SupabaseClient,
) {
  const supabase = resolveSupabaseClient(client);
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, user_id, user_email, status")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !order) {
    return {
      data: [] as ReviewEligibilityItem[],
      error: orderError,
    };
  }

  const matchesUserId = typeof order.user_id === "string" && order.user_id === userId;
  const matchesUserEmail =
    userEmail !== null &&
    typeof order.user_email === "string" &&
    order.user_email.toLowerCase() === userEmail.toLowerCase();

  if (!matchesUserId && !matchesUserEmail) {
    return {
      data: [] as ReviewEligibilityItem[],
      error: { message: "You do not have access to review this order." },
    };
  }

  const [{ data: orderItems, error: itemsError }, { data: reviews, error: reviewsError }] = await Promise.all([
    supabase
      .from("order_items")
      .select("id, order_id, product_id, product_name, product_image, vendor_id, quantity, variant_name, variant_value")
      .eq("order_id", orderId),
    supabase
      .from("product_reviews")
      .select("id, product_id, vendor_id, order_id, order_item_id, user_id, user_email, rating, title, comment, created_at, updated_at")
      .eq("order_id", orderId)
      .eq("user_id", userId),
  ]);

  if (itemsError || reviewsError) {
    return {
      data: [] as ReviewEligibilityItem[],
      error: itemsError ?? reviewsError,
    };
  }

  const reviewByProductId = new Map(
    ((reviews ?? []) as ProductReviewRow[]).map((row) => {
      const normalized = normalizeReviewRow(row);
      return [normalized.product_id, normalized] as const;
    }),
  );

  const items = ((orderItems ?? []) as Array<{
    id: string;
    order_id: string;
    product_id: string;
    product_name: string;
    product_image: string | null;
    vendor_id?: string | null;
    quantity: number;
    variant_name?: string | null;
    variant_value?: string | null;
  }>).map(
    (item): ReviewEligibilityItem => ({
      order_id: item.order_id,
      order_item_id: item.id,
      product_id: item.product_id,
      product_name: item.product_name,
      product_image: typeof item.product_image === "string" ? item.product_image : null,
      vendor_id: typeof item.vendor_id === "string" ? item.vendor_id : null,
      quantity: Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : 0,
      variant_name: typeof item.variant_name === "string" ? item.variant_name : null,
      variant_value: typeof item.variant_value === "string" ? item.variant_value : null,
      can_review: order.status === "Delivered",
      review: reviewByProductId.get(item.product_id) ?? null,
    }),
  );

  return {
    data: items,
    error: null,
  };
}

export async function createProductReview(
  payload: {
    product_id: string;
    vendor_id: string | null;
    order_id: string;
    order_item_id: string | null;
    user_id: string;
    user_email: string | null;
    rating: number;
    title: string | null;
    comment: string;
  },
  client?: SupabaseClient,
) {
  const supabase = resolveSupabaseClient(client);
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("product_reviews")
    .insert({
      ...payload,
      created_at: now,
      updated_at: now,
    } as never)
    .select("id, product_id, vendor_id, order_id, order_item_id, user_id, user_email, rating, title, comment, created_at, updated_at")
    .single();

  return {
    data: data ? normalizeReviewRow(data as ProductReviewRow) : null,
    error,
  };
}

export async function deleteProductReview(reviewId: string, client?: SupabaseClient) {
  const supabase = resolveSupabaseClient(client);
  const { error } = await supabase.from("product_reviews").delete().eq("id", reviewId);

  return {
    data: { id: reviewId },
    error,
  };
}

export async function ensureCustomerRole(userId: string, client?: SupabaseClient) {
  const supabase = resolveSupabaseClient(client);
  const { error } = await supabase
    .from("platform_roles")
    .upsert(
      {
        user_id: userId,
        role: "customer",
      } as never,
      { onConflict: "user_id,role" },
    );

  return {
    data: { userId, role: "customer" },
    error,
  };
}

export async function listAdminReviewRows(client?: SupabaseClient) {
  const supabase = resolveSupabaseClient(client);
  const [reviewsResult, productsResult, vendorsResult] = await Promise.all([
    supabase
      .from("product_reviews")
      .select("id, product_id, vendor_id, order_id, order_item_id, user_id, user_email, rating, title, comment, created_at, updated_at")
      .order("created_at", { ascending: false }),
    supabase.from("products").select("id, name, slug, vendor_id"),
    supabase.from("vendors").select("id, name"),
  ]);

  const productsById = new Map(
    ((productsResult.data ?? []) as Array<{ id: string; name: string; slug: string; vendor_id: string | null }>).map((product) => [
      product.id,
      product,
    ]),
  );
  const vendorsById = new Map(
    ((vendorsResult.data ?? []) as Array<{ id: string; name: string }>).map((vendor) => [vendor.id, vendor]),
  );

  return {
    data: ((reviewsResult.data ?? []) as ProductReviewRow[]).map((row) => {
      const review = normalizeReviewRow(row);
      const product = productsById.get(review.product_id) ?? null;
      const vendor = review.vendor_id ? vendorsById.get(review.vendor_id) ?? null : null;

      return {
        ...review,
        product_name: product?.name ?? "Unknown product",
        product_slug: product?.slug ?? "",
        vendor_name: vendor?.name ?? null,
      };
    }),
    error: reviewsResult.error ?? productsResult.error ?? vendorsResult.error,
  };
}

export async function listVendorReviewRows(vendorId: string, client?: SupabaseClient) {
  const supabase = resolveSupabaseClient(client);
  const [{ data: reviews, error: reviewsError }, { data: products, error: productsError }] = await Promise.all([
    supabase
      .from("product_reviews")
      .select("id, product_id, vendor_id, order_id, order_item_id, user_id, user_email, rating, title, comment, created_at, updated_at")
      .eq("vendor_id", vendorId)
      .order("created_at", { ascending: false }),
    supabase.from("products").select("id, name, slug").eq("vendor_id", vendorId),
  ]);

  const productsById = new Map(
    ((products ?? []) as Array<{ id: string; name: string; slug: string }>).map((product) => [product.id, product]),
  );

  return {
    data: ((reviews ?? []) as ProductReviewRow[]).map((row) => {
      const review = normalizeReviewRow(row);
      const product = productsById.get(review.product_id) ?? null;

      return {
        ...review,
        product_name: product?.name ?? "Unknown product",
        product_slug: product?.slug ?? "",
      };
    }),
    error: reviewsError ?? productsError,
  };
}

export async function getVendorReviewNotificationState(
  userId: string,
  vendorId: string,
  client?: SupabaseClient,
) {
  const supabase = resolveSupabaseClient(client);
  const { data, error } = await supabase
    .from("vendor_review_notification_states")
    .select("user_id, vendor_id, last_read_at, created_at, updated_at")
    .eq("user_id", userId)
    .eq("vendor_id", vendorId)
    .maybeSingle();

  if (error || !data) {
    return {
      data: {
        user_id: userId,
        vendor_id: vendorId,
        last_read_at: "1970-01-01T00:00:00.000Z",
        created_at: "1970-01-01T00:00:00.000Z",
        updated_at: "1970-01-01T00:00:00.000Z",
      } satisfies VendorReviewNotificationStateRow,
      error,
    };
  }

  return {
    data: data as VendorReviewNotificationStateRow,
    error: null,
  };
}

export async function markVendorReviewNotificationsRead(
  userId: string,
  vendorId: string,
  client?: SupabaseClient,
) {
  const supabase = resolveSupabaseClient(client);
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("vendor_review_notification_states")
    .upsert(
      {
        user_id: userId,
        vendor_id: vendorId,
        last_read_at: now,
        updated_at: now,
      } as never,
      { onConflict: "user_id,vendor_id" },
    );

  return {
    data: { lastReadAt: now },
    error,
  };
}
