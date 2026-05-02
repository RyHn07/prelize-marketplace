"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { getCurrentVendorMembership, getVendorWorkspaceAccessState } from "@/lib/marketplace-access";
import { getProductsForVendors } from "@/lib/products/queries";
import { getSupabaseClient } from "@/lib/supabase-client";
import type { ProductDbRow, ProductStatus, ProductType } from "@/types/product-db";

function formatPrice(amount: number) {
  return `\u09F3${Number.isFinite(amount) ? amount.toLocaleString() : "0"}`;
}

function formatWeight(weight: ProductDbRow["weight"]) {
  return weight === null || weight === undefined || weight === "" ? "-" : String(weight);
}

function getProductStatus(product: ProductDbRow): ProductStatus {
  if (product.status === "active" || product.status === "disabled" || product.status === "draft") {
    return product.status;
  }

  return product.is_active ? "active" : "disabled";
}

function getProductType(product: ProductDbRow): ProductType {
  return product.product_type === "variable" ? "variable" : "single";
}

function StatusBadge({ status }: { status: ProductStatus }) {
  const classes =
    status === "active"
      ? "bg-emerald-100 text-emerald-700"
      : status === "draft"
        ? "bg-amber-100 text-amber-700"
        : "bg-slate-200 text-slate-600";

  const label = status === "disabled" ? "Disabled" : status === "draft" ? "Draft" : "Active";

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${classes}`}>{label}</span>;
}

function ProductTypeBadge({ type }: { type: ProductType }) {
  return (
    <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
      {type === "variable" ? "Variable Product" : "Single Product"}
    </span>
  );
}

export default function VendorProductsContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasVendorWorkspaceAccess, setHasVendorWorkspaceAccess] = useState(false);
  const [activeVendorId, setActiveVendorId] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductDbRow[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProductStatus>("all");

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseClient();

    const loadProducts = async () => {
      const access = await getVendorWorkspaceAccessState(supabase);
      const membership = await getCurrentVendorMembership(supabase);

      if (!isMounted) {
        return;
      }

      setUserEmail(access.userEmail);
      setHasVendorWorkspaceAccess(access.hasVendorWorkspaceAccess);
      setActiveVendorId(membership?.vendor_id ?? access.activeVendorId);

      if (!access.userEmail || !membership?.vendor_id) {
        setLoading(false);
        return;
      }

      const productResult = await getProductsForVendors([membership.vendor_id]);

      if (!isMounted) {
        return;
      }

      if (productResult.error) {
        setErrorMessage(productResult.error.message);
        setProducts([]);
        setLoading(false);
        return;
      }

      setProducts(productResult.data);
      setLoading(false);
    };

    void loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return products.filter((product) => {
      const status = getProductStatus(product);
      const type = getProductType(product);
      const matchesStatus = statusFilter === "all" || status === statusFilter;
      const matchesSearch =
        query.length === 0 ||
        product.name.toLowerCase().includes(query) ||
        product.slug.toLowerCase().includes(query) ||
        String(product.category_id ?? "").toLowerCase().includes(query) ||
        type.toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [products, searchQuery, statusFilter]);

  const successMessage = useMemo(() => {
    const status = searchParams.get("status");

    if (status === "created") {
      return "Product saved successfully.";
    }

    if (status === "updated") {
      return "Product updated successfully.";
    }

    return "";
  }, [searchParams]);

  const activeCount = useMemo(
    () => products.filter((product) => getProductStatus(product) === "active").length,
    [products],
  );
  const draftCount = useMemo(
    () => products.filter((product) => getProductStatus(product) === "draft").length,
    [products],
  );
  const disabledCount = useMemo(
    () => products.filter((product) => getProductStatus(product) === "disabled").length,
    [products],
  );

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        Loading vendor products...
      </div>
    );
  }

  if (!userEmail) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Vendor Products</h1>
        <p className="mt-3 text-sm text-slate-500">Please login to access your vendor products.</p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  if (!hasVendorWorkspaceAccess || !activeVendorId) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Vendor Products</h1>
        <p className="mt-3 text-sm text-slate-500">No vendor account found.</p>
        <p className="mt-2 text-xs text-slate-400">
          Ask an admin to create a vendor record and active vendor membership for your user account.
        </p>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600">Vendor Dashboard</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Products</h1>
          <p className="text-sm text-slate-500">Search, filter, and manage the products assigned to your vendor.</p>
        </div>

        <Link
          href="/vendor/products/new"
          className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90"
        >
          Add Product
        </Link>
      </div>

      <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex-1">
            <label htmlFor="vendor-product-search" className="sr-only">
              Search products
            </label>
            <input
              id="vendor-product-search"
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by product name, slug, category id, or product type"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-emerald-500"
            />
          </div>

          <div className="w-full lg:w-56">
            <label htmlFor="vendor-status-filter" className="sr-only">
              Filter by status
            </label>
            <select
              id="vendor-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "all" | ProductStatus)}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition-colors focus:border-emerald-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
            }}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:border-emerald-300 hover:text-slate-900"
          >
            Clear
          </button>
        </div>
      </div>

      {successMessage ? (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-600">
          {errorMessage}
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Total Products</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{products.length}</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-emerald-500">Active</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-700">{activeCount}</p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-amber-500">Draft</p>
            <p className="mt-2 text-2xl font-semibold text-amber-700">{draftCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Disabled</p>
            <p className="mt-2 text-2xl font-semibold text-slate-700">{disabledCount}</p>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
            <h2 className="text-xl font-semibold text-slate-900">No products found</h2>
            <p className="mt-2 text-sm text-slate-500">
              No vendor products are assigned yet. Add your first product to start building your catalog.
            </p>
            <p className="mt-2 break-all text-xs text-slate-400">Current vendor ID: {activeVendorId}</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
            <h2 className="text-xl font-semibold text-slate-900">No matching products found</h2>
            <p className="mt-2 text-sm text-slate-500">Try another search term or change the product status filter.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProducts.map((product) => {
              const status = getProductStatus(product);
              const type = getProductType(product);

              return (
                <article key={product.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex min-w-0 flex-1 gap-4">
                      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                        {product.image_url ? (
                          <div
                            role="img"
                            aria-label={product.name}
                            className="h-full w-full bg-cover bg-center"
                            style={{ backgroundImage: `url("${product.image_url}")` }}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs font-medium text-slate-400">
                            No Image
                          </div>
                        )}
                      </div>

                      <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
                        <div className="xl:col-span-2">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Name</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">{product.name}</p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Slug</p>
                          <p className="mt-1 break-all text-sm text-slate-600">{product.slug}</p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Price</p>
                          <p className="mt-1 text-sm font-semibold text-emerald-700">{formatPrice(product.price)}</p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">MOQ</p>
                          <p className="mt-1 text-sm font-medium text-slate-700">{product.moq}</p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Weight</p>
                          <p className="mt-1 text-sm font-medium text-slate-700">{formatWeight(product.weight)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 xl:w-56 xl:items-end">
                      <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                        <StatusBadge status={status} />
                        <ProductTypeBadge type={type} />
                      </div>

                      <Link
                        href={`/vendor/products/${product.id}/edit`}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-emerald-300 hover:text-slate-900"
                      >
                        Edit Product
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
