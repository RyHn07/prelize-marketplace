"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { ProductDbRow } from "@/types/product-db";

type ImportMode = "create" | "update";

export default function AdminImport1688ProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [products, setProducts] = useState<ProductDbRow[]>([]);
  const [sourceUrl, setSourceUrl] = useState("");
  const [importMode, setImportMode] = useState<ImportMode>("create");
  const [targetProductId, setTargetProductId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadPage = async () => {
      const response = await fetch("/api/admin/products", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        userEmail?: string | null;
        products?: ProductDbRow[];
      } | null;

      if (!isMounted) {
        return;
      }

      setUserEmail(payload?.userEmail ?? null);
      setHasAccess(response.ok);
      setProducts(payload?.products ?? []);
      setErrorMessage(response.ok ? "" : payload?.error ?? "Unable to load products.");
      setLoading(false);
    };

    void loadPage();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!sourceUrl.trim()) {
      setErrorMessage("Invalid 1688 product URL. Please enter a valid 1688 product link.");
      return;
    }

    if (importMode === "update" && !targetProductId) {
      setErrorMessage("Select a target product before importing update data.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/products/import-1688", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceUrl,
          importMode,
          targetProductId: importMode === "update" ? targetProductId : null,
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        data?: { id: string };
        error?: string;
      } | null;

      if (!response.ok || !payload?.data?.id) {
        setErrorMessage(payload?.error ?? "Product data could not be fetched. Please try again.");
        return;
      }

      setSuccessMessage("Product data fetched. Opening review page...");
      router.push(`/admin/products/import-1688/${payload.data.id}/review`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Product data could not be fetched. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        Loading...
      </div>
    );
  }

  if (!userEmail) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Import Product</h1>
        <p className="mt-3 text-sm text-slate-500">Please login as admin</p>
        <Link href="/login" className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#615FFF] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90">
          Go to Login
        </Link>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Import Product</h1>
        <p className="mt-3 text-sm text-slate-500">You do not have product management access</p>
      </div>
    );
  }

  return (
    <section className="w-full space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-5 sm:px-6">
          <h3 className="text-base font-medium text-gray-800">Import Product</h3>
          <p className="mt-1 text-sm text-gray-500">
            Fetch product data from a 1688 link, then review and edit everything before saving.
          </p>
        </div>

        {successMessage ? (
          <div className="border-b border-emerald-100 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700 sm:px-6">
            {successMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="border-b border-rose-100 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-600 sm:px-6">
            {errorMessage}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-6 p-5 sm:p-6">
          <div>
            <label htmlFor="source-url" className="mb-1.5 block text-sm font-medium text-gray-700">
              1688 Product URL
            </label>
            <input
              id="source-url"
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              placeholder="https://detail.1688.com/offer/123456789.html"
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 outline-none transition-colors focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10"
            />
          </div>

          <div>
            <label htmlFor="import-mode" className="mb-1.5 block text-sm font-medium text-gray-700">
              Import Mode
            </label>
            <select
              id="import-mode"
              value={importMode}
              onChange={(event) => setImportMode(event.target.value as ImportMode)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 shadow-sm outline-none transition-colors focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10"
            >
              <option value="create">Create New Product Draft</option>
              <option value="update">Update Existing Product</option>
            </select>
          </div>

          {importMode === "update" ? (
            <div>
              <label htmlFor="target-product" className="mb-1.5 block text-sm font-medium text-gray-700">
                Target Product
              </label>
              <select
                id="target-product"
                value={targetProductId}
                onChange={(event) => setTargetProductId(event.target.value)}
                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 shadow-sm outline-none transition-colors focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10"
              >
                <option value="">Select product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Link
              href="/admin/products"
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-lg bg-[#615FFF] px-5 py-3 text-sm font-medium text-white shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Fetching..." : "Fetch Product Data"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
