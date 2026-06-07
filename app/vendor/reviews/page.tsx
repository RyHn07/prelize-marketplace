"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [searchQuery, setSearchQuery] = useState("");
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

  const filteredReviews = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return reviews;
    }

    return reviews.filter((review) =>
      [review.product_name, review.user_email ?? "", review.title ?? "", review.comment]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [reviews, searchQuery]);

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
    <section className="w-full space-y-6">
      <div className="rounded-[20px] border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-base font-medium text-gray-800">Product Reviews</h1>
              <p className="mt-1 text-sm text-gray-500">
                Review customer feedback for products that belong to your vendor catalog.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-lg bg-[#615FFF]/8 px-3 py-2 text-sm font-medium text-[#615FFF]">
                {filteredReviews.length} review{filteredReviews.length === 1 ? "" : "s"}
              </div>
              <div className="rounded-lg bg-amber-100 px-3 py-2 text-sm font-medium text-amber-700">
                {unreadCount} unread
              </div>
              <button
                type="button"
                onClick={() => void handleMarkAllRead()}
                disabled={isMarkingRead || unreadCount === 0}
                className="inline-flex items-center justify-center rounded-lg bg-[#615FFF] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isMarkingRead ? "Marking..." : "Mark all as read"}
              </button>
            </div>
          </div>

          <div className="mt-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search product, customer, or feedback text"
              className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 outline-none transition-colors focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10"
            />
          </div>
        </div>

        {errorMessage ? (
          <div className="border-b border-rose-100 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-600 sm:px-6">
            {errorMessage}
          </div>
        ) : null}

        {filteredReviews.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No reviews found yet.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredReviews.map((review) => (
              <article key={review.id} className="px-5 py-5 sm:px-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link href={review.product_slug ? `/products/${review.product_slug}` : "/vendor/products"} className="text-base font-semibold text-slate-900 hover:text-[#615FFF]">
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
      </div>
    </section>
  );
}
