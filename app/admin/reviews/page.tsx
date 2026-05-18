"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { getAdminAccessState } from "@/lib/admin-access";
import { getSupabaseClient } from "@/lib/supabase-client";

type AdminReviewRow = {
  id: string;
  product_id: string;
  product_name: string;
  product_slug: string;
  vendor_name: string | null;
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

async function authorizedAdminReviewFetch<T>(input: string, init?: RequestInit) {
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
    throw new Error((body as { error?: string } | null)?.error ?? "Unable to load product reviews.");
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

export default function AdminReviewsPage() {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [reviews, setReviews] = useState<AdminReviewRow[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingReviewId, setDeletingReviewId] = useState("");

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseClient();

    const loadReviews = async () => {
      const access = await getAdminAccessState(supabase);

      if (!isMounted) {
        return;
      }

      setUserEmail(access.userEmail);
      setHasAdminAccess(access.hasAdminAccess);

      if (!access.userEmail || !access.hasAdminAccess) {
        setLoading(false);
        return;
      }

      try {
        const result = await authorizedAdminReviewFetch<{ data: AdminReviewRow[] }>("/api/admin/reviews");

        if (!isMounted) {
          return;
        }

        setReviews(result.data);
        setErrorMessage("");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "Unable to load product reviews.");
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
      [review.product_name, review.vendor_name ?? "", review.user_email ?? "", review.title ?? "", review.comment]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [reviews, searchQuery]);

  const handleDelete = async (reviewId: string) => {
    const confirmed = window.confirm("Delete this review permanently?");

    if (!confirmed) {
      return;
    }

    setDeletingReviewId(reviewId);

    try {
      await authorizedAdminReviewFetch(`/api/admin/reviews/${reviewId}`, {
        method: "DELETE",
      });
      setReviews((current) => current.filter((review) => review.id !== reviewId));
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to delete the review.");
    } finally {
      setDeletingReviewId("");
    }
  };

  if (loading) {
    return <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading reviews...</section>;
  }

  if (!userEmail) {
    return (
      <section className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Product Reviews</h1>
        <p className="mt-3 text-sm text-slate-500">Please login as admin.</p>
      </section>
    );
  }

  if (!hasAdminAccess) {
    return (
      <section className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Product Reviews</h1>
        <p className="mt-3 text-sm text-slate-500">You do not have admin access.</p>
      </section>
    );
  }

  return (
    <section className="w-full space-y-6">
      <div className="rounded-[20px] border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-base font-medium text-gray-800">Product Reviews</h1>
              <p className="mt-1 text-sm text-gray-500">
                Moderate customer reviews, remove abusive feedback, and keep vendor quality visible.
              </p>
            </div>

            <div className="rounded-lg bg-[#615FFF]/8 px-3 py-2 text-sm font-medium text-[#615FFF]">
              {filteredReviews.length} review{filteredReviews.length === 1 ? "" : "s"}
            </div>
          </div>

          <div className="mt-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search product, vendor, customer, or feedback text"
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
                      <Link href={review.product_slug ? `/products/${review.product_slug}` : "/admin/products"} className="text-base font-semibold text-slate-900 hover:text-[#615FFF]">
                        {review.product_name}
                      </Link>
                      <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                        {review.rating}/5
                      </span>
                      {review.vendor_name ? (
                        <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                          {review.vendor_name}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-slate-500">
                      {review.user_email ?? "Unknown customer"} reviewed on {formatDate(review.created_at)}
                    </p>
                    <p className="text-sm font-semibold text-slate-900">{review.title ?? "Customer review"}</p>
                    <p className="text-sm leading-6 text-slate-600">{review.comment}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleDelete(review.id)}
                    disabled={deletingReviewId === review.id}
                    className="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingReviewId === review.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
