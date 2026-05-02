"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { getProductManagementAccessState } from "@/lib/marketplace-access";
import { getProducts, getProductsForVendors, getProductVendorOptions } from "@/lib/products/queries";
import { getSupabaseClient } from "@/lib/supabase-client";
import type { ProductDbRow, ProductStatus, ProductType, ProductVendorOption } from "@/types/product-db";

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

  const label = status === "disabled" ? "Archived" : status === "draft" ? "Draft" : "Published";

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${classes}`}>{label}</span>;
}

function ProductTypeBadge({ type }: { type: ProductType }) {
  return (
    <span className="inline-flex rounded-full bg-[#615FFF]/10 px-3 py-1 text-xs font-semibold text-[#615FFF]">
      {type === "variable" ? "Variable Product" : "Single Product"}
    </span>
  );
}

export default function ProductsContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasProductManagementAccess, setHasProductManagementAccess] = useState(false);
  const [canAssignPlatformProducts, setCanAssignPlatformProducts] = useState(true);
  const [products, setProducts] = useState<ProductDbRow[]>([]);
  const [vendorOptions, setVendorOptions] = useState<ProductVendorOption[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProductStatus>("all");

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseClient();

    const loadProducts = async () => {
      const access = await getProductManagementAccessState(supabase);

      if (!isMounted) {
        return;
      }

      setUserEmail(access.userEmail);
      setHasProductManagementAccess(access.hasProductManagementAccess);
      setCanAssignPlatformProducts(access.hasPlatformAdminAccess);

      if (!access.userEmail) {
        setLoading(false);
        return;
      }

      if (!access.hasProductManagementAccess) {
        setLoading(false);
        return;
      }

      const [productResult, vendorResult] = await Promise.all([
        access.hasPlatformAdminAccess ? getProducts() : getProductsForVendors(access.manageableVendorIds),
        getProductVendorOptions(),
      ]);

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
      setVendorOptions(vendorResult.data);
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
  const vendorNameById = useMemo(
    () => new Map(vendorOptions.map((vendor) => [vendor.id, vendor.name])),
    [vendorOptions],
  );

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
        <h1 className="text-2xl font-semibold text-slate-900">Admin Products</h1>
        <p className="mt-3 text-sm text-slate-500">Please login as admin</p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#615FFF] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  if (!hasProductManagementAccess) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Admin Products</h1>
        <p className="mt-3 text-sm text-slate-500">You do not have product management access</p>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#615FFF]">Admin Dashboard</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            {canAssignPlatformProducts ? "All Products" : "Your Vendor Products"}
          </h1>
          <p className="text-sm text-slate-500">Search, filter, and manage product records from one place.</p>
        </div>

        <Link
          href="/admin/products/new"
          className="inline-flex items-center justify-center rounded-xl bg-[#615FFF] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Add Product
        </Link>
      </div>

      <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex-1">
            <label htmlFor="product-search" className="sr-only">
              Search products
            </label>
            <input
              id="product-search"
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by product name, slug, category id, or product type"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
            />
          </div>

          <div className="w-full lg:w-56">
            <label htmlFor="status-filter" className="sr-only">
              Filter by status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "all" | ProductStatus)}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
            >
              <option value="all">All Status</option>
              <option value="active">Published</option>
              <option value="disabled">Archived</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
            }}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
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
            <p className="text-xs uppercase tracking-[0.16em] text-emerald-500">Published</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-700">{activeCount}</p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-amber-500">Draft</p>
            <p className="mt-2 text-2xl font-semibold text-amber-700">{draftCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Archived</p>
            <p className="mt-2 text-2xl font-semibold text-slate-700">{disabledCount}</p>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
            <h2 className="text-xl font-semibold text-slate-900">No products found</h2>
            <p className="mt-2 text-sm text-slate-500">
              No product records are being returned yet. Add your first product to start building the admin catalog.
            </p>
            <p className="mt-2 text-xs text-slate-400">
              If you just saved a product and it still is not showing here, the product may not have been written to the
              database or your current read policy may be blocking the list query.
            </p>
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

                      <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-8">
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
                          <p className="mt-1 text-sm font-semibold text-[#615FFF]">{formatPrice(product.price)}</p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">MOQ</p>
                          <p className="mt-1 text-sm font-medium text-slate-700">{product.moq}</p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Vendor</p>
                          <p className="mt-1 text-sm font-medium text-slate-700">
                            {product.vendor_id ? vendorNameById.get(product.vendor_id) ?? "Assigned Vendor" : "Platform"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Vendor ID</p>
                          <p className="mt-1 break-all text-sm font-medium text-slate-700">
                            {product.vendor_id ?? "Platform"}
                          </p>
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
                        href={`/admin/products/${product.id}/edit`}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
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
