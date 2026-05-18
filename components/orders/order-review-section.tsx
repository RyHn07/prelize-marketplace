"use client";

import { useEffect, useState } from "react";

import { getSupabaseClient } from "@/lib/supabase-client";
import type { ProductReviewRow, ReviewEligibilityItem } from "@/types/product-db";

type ReviewEligibilityResponse = {
  data: ReviewEligibilityItem[];
  error?: string;
};

type ReviewCreateResponse = {
  data: ProductReviewRow;
  error?: string;
};

type DraftState = {
  rating: number;
  title: string;
  comment: string;
};

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

async function getAccessToken() {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function authorizedReviewFetch<T>(input: string, init?: RequestInit) {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error("Please login first.");
  }

  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });

  const body = (await response.json().catch(() => null)) as T | { error?: string } | null;

  if (!response.ok) {
    throw new Error((body as { error?: string } | null)?.error ?? "Unable to process the review request.");
  }

  return body as T;
}

function StarPicker({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: 5 }).map((_, index) => {
        const nextValue = index + 1;
        const isActive = nextValue <= value;

        return (
          <button
            key={nextValue}
            type="button"
            onClick={() => onChange(nextValue)}
            disabled={disabled}
            className={`transition ${isActive ? "text-amber-400" : "text-slate-300"} disabled:cursor-not-allowed`}
            aria-label={`Set rating to ${nextValue}`}
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5 fill-current">
              <path d="M10 1.8 12.5 7l5.7.8-4.1 4 1 5.6L10 14.7l-5.1 2.7 1-5.6-4.1-4 5.7-.8L10 1.8Z" />
            </svg>
          </button>
        );
      })}
      <span className="text-sm font-medium text-slate-500">{value}/5</span>
    </div>
  );
}

export default function OrderReviewSection({
  orderId,
  orderStatus,
}: {
  orderId: string;
  orderStatus: string | null | undefined;
}) {
  const [items, setItems] = useState<ReviewEligibilityItem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [submittingProductId, setSubmittingProductId] = useState("");
  const isDelivered = (orderStatus ?? "").trim() === "Delivered";

  useEffect(() => {
    let isMounted = true;

    const loadEligibility = async () => {
      setLoading(true);

      try {
        const result = await authorizedReviewFetch<ReviewEligibilityResponse>(`/api/reviews/eligibility?orderId=${encodeURIComponent(orderId)}`);

        if (!isMounted) {
          return;
        }

        setItems(result.data);
        setDrafts(
          Object.fromEntries(
            result.data.map((item) => [
              item.product_id,
              {
                rating: item.review?.rating ?? 5,
                title: item.review?.title ?? "",
                comment: "",
              },
            ]),
          ),
        );
        setErrorMessage("");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "Unable to load review options.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadEligibility();

    return () => {
      isMounted = false;
    };
  }, [orderId]);

  const handleSubmit = async (item: ReviewEligibilityItem) => {
    const draft = drafts[item.product_id];

    if (!draft) {
      return;
    }

    setSubmittingProductId(item.product_id);

    try {
      const result = await authorizedReviewFetch<ReviewCreateResponse>("/api/reviews", {
        method: "POST",
        body: JSON.stringify({
          productId: item.product_id,
          orderId: item.order_id,
          rating: draft.rating,
          title: draft.title,
          comment: draft.comment,
        }),
      });

      setItems((current) =>
        current.map((currentItem) =>
          currentItem.product_id === item.product_id
            ? {
                ...currentItem,
                review: result.data,
              }
            : currentItem,
        ),
      );
      setDrafts((current) => ({
        ...current,
        [item.product_id]: {
          rating: result.data.rating,
          title: result.data.title ?? "",
          comment: "",
        },
      }));
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to submit review.");
    } finally {
      setSubmittingProductId("");
    }
  };

  if (loading) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-900">Product Reviews</h2>
        <p className="mt-3 text-sm text-slate-500">Loading review options for this order...</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Product Reviews</h2>
          <p className="mt-1 text-sm text-slate-500">
            {isDelivered
              ? "Delivered products can now receive a customer review."
              : "Reviews unlock after this order reaches delivered status."}
          </p>
        </div>
      </div>

      {errorMessage ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {errorMessage}
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
          No reviewable products were found for this order.
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {items.map((item) => {
            const draft = drafts[item.product_id] ?? { rating: 5, title: "", comment: "" };
            const existingReview = item.review;
            const isSubmitting = submittingProductId === item.product_id;

            return (
              <article key={`${item.order_item_id}-${item.product_id}`} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-slate-900">{item.product_name}</h3>
                    <p className="text-sm text-slate-500">
                      {item.variant_name ? `${item.variant_name}: ` : ""}
                      {item.variant_value ?? "Standard"}
                    </p>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Qty {item.quantity}</p>
                  </div>

                  {existingReview ? (
                    <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      Reviewed
                    </span>
                  ) : (
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${item.can_review ? "bg-[#eef0ff] text-[#615FFF]" : "bg-amber-100 text-amber-700"}`}>
                      {item.can_review ? "Ready to review" : "Locked until delivered"}
                    </span>
                  )}
                </div>

                {existingReview ? (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{existingReview.title ?? "Your review"}</p>
                        <p className="mt-1 text-xs text-slate-500">Submitted {formatDateTime(existingReview.created_at)}</p>
                      </div>
                      <p className="text-sm font-medium text-amber-500">{existingReview.rating}/5</p>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{existingReview.comment}</p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    <StarPicker
                      value={draft.rating}
                      onChange={(nextRating) =>
                        setDrafts((current) => ({
                          ...current,
                          [item.product_id]: {
                            ...draft,
                            rating: nextRating,
                          },
                        }))
                      }
                      disabled={!item.can_review || isSubmitting}
                    />

                    <input
                      type="text"
                      value={draft.title}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [item.product_id]: {
                            ...draft,
                            title: event.target.value,
                          },
                        }))
                      }
                      placeholder="Short review title"
                      disabled={!item.can_review || isSubmitting}
                      className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                    />

                    <textarea
                      value={draft.comment}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [item.product_id]: {
                            ...draft,
                            comment: event.target.value,
                          },
                        }))
                      }
                      placeholder="Share product quality, packaging, communication, or overall sourcing experience."
                      disabled={!item.can_review || isSubmitting}
                      className="min-h-28 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                    />

                    <button
                      type="button"
                      onClick={() => void handleSubmit(item)}
                      disabled={!item.can_review || isSubmitting}
                      className="inline-flex items-center justify-center rounded-full bg-[#615FFF] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSubmitting ? "Submitting..." : "Submit Review"}
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
