"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { getSupabaseClient } from "@/lib/supabase-client";

type VendorReviewRow = {
  id: string;
  product_name: string;
  product_slug: string;
  user_email: string | null;
  rating: number;
  title: string | null;
  comment: string;
  created_at: string;
};

async function getAccessToken() {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function authorizedVendorReviewFetch<T>(input: string, init?: RequestInit) {
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
    throw new Error((body as { error?: string } | null)?.error ?? "Unable to load vendor reviews.");
  }

  return body as T;
}

function formatDate(value: string) {
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

export default function VendorReviewsPage() {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<VendorReviewRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [isMarkingRead, setIsMarkingRead] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadReviews = async () => {
      try {
        const result = await authorizedVendorReviewFetch<{
          data: VendorReviewRow[];
          unreadCount: number;
          lastReadAt: string;
        }>("/api/vendor/reviews");

        if (!isMounted) {
          return;
        }

        setReviews(result.data);
        setUnreadCount(result.unreadCount);
        setErrorMessage("");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "Unable to load vendor reviews.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadReviews();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleMarkAllRead = async () => {
    setIsMarkingRead(true);

    try {
      await authorizedVendorReviewFetch("/api/vendor/reviews", {
        method: "POST",
        body: JSON.stringify({ action: "mark_all_read" }),
      });
      setUnreadCount(0);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update review notifications.");
    } finally {
      setIsMarkingRead(false);
    }
  };

  if (loading) {
    return <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">Loading vendor reviews...</section>;
  }

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#615FFF]">Vendor Reviews</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">Customer feedback on your products</h1>
            <p className="mt-2 text-sm text-slate-500">See delivered-order reviews for products that belong to your vendor catalog.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl bg-[#615FFF]/8 px-4 py-2 text-sm font-medium text-[#615FFF]">
              {unreadCount} unread
            </div>
            <button
              type="button"
              onClick={() => void handleMarkAllRead()}
              disabled={isMarkingRead || unreadCount === 0}
              className="inline-flex items-center justify-center rounded-2xl bg-[#615FFF] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isMarkingRead ? "Marking..." : "Mark all as read"}
            </button>
          </div>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-600">
          {errorMessage}
        </div>
      ) : null}

      {reviews.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">No reviews yet</h2>
          <p className="mt-2 text-sm text-slate-500">Delivered customer orders will start creating reviews here once buyers leave feedback.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <article key={review.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link href={review.product_slug ? `/products/${review.product_slug}` : "/vendor/products"} className="text-lg font-semibold text-slate-900 hover:text-[#615FFF]">
                      {review.product_name}
                    </Link>
                    <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                      {review.rating}/5
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">{review.user_email ?? "Unknown customer"} on {formatDate(review.created_at)}</p>
                  <p className="text-sm font-semibold text-slate-900">{review.title ?? "Customer review"}</p>
                  <p className="text-sm leading-6 text-slate-600">{review.comment}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
