"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import AdminEmptyState from "@/components/admin/admin-empty-state";
import AdminPageHeader from "@/components/admin/admin-page-header";
import AdminStatCard from "@/components/admin/admin-stat-card";
import { getProductManagementAccessState } from "@/lib/marketplace-access";
import { getProductCategoryOptions, getProducts, getProductsForVendors, getProductVendorOptions } from "@/lib/products/queries";
import { getSupabaseClient } from "@/lib/supabase-client";
import type { ProductCategoryOption, ProductDbRow, ProductStatus, ProductType, ProductVendorOption } from "@/types/product-db";

function formatPrice(amount: number) {
  return `\u09F3${Number.isFinite(amount) ? amount.toLocaleString() : "0"}`;
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
  const [categoryOptions, setCategoryOptions] = useState<ProductCategoryOption[]>([]);
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

      const [productResult, vendorResult, categoryResult] = await Promise.all([
        access.hasPlatformAdminAccess ? getProducts() : getProductsForVendors(access.manageableVendorIds),
        getProductVendorOptions(),
        getProductCategoryOptions(),
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
      setCategoryOptions(categoryResult.data);
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
  const categoryNameById = useMemo(
    () => new Map(categoryOptions.map((category) => [category.id, category.name])),
    [categoryOptions],
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
    <section className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        title={canAssignPlatformProducts ? "All Products" : "Your Vendor Products"}
        description="Search, filter, and manage product records from one clean catalog workspace."
        actions={
          <Link
            href="/admin/products/new"
            className="inline-flex items-center justify-center rounded-2xl bg-[#615FFF] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Add Product
          </Link>
        }
      />

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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Total Products" value={products.length} />
        <AdminStatCard label="Published" value={activeCount} tone="success" />
        <AdminStatCard label="Draft" value={draftCount} tone="warning" />
        <AdminStatCard label="Archived" value={disabledCount} />
      </div>

      {products.length === 0 ? (
        <AdminEmptyState
          title="No products found"
          description="Add your first product to start building the admin catalog. If you just saved one and it is still missing, the product may not have been written to the database or your read policy may be blocking the query."
          action={
            <Link
              href="/admin/products/new"
              className="inline-flex items-center justify-center rounded-2xl bg-[#615FFF] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Add Product
            </Link>
          }
        />
      ) : filteredProducts.length === 0 ? (
        <AdminEmptyState
          title="No matching products found"
          description="Try another search term or change the product status filter."
        />
        ) : (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    <th className="px-5 py-4">Product</th>
                    <th className="px-5 py-4">Category</th>
                    <th className="px-5 py-4">Price</th>
                    <th className="px-5 py-4">MOQ</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Vendor</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredProducts.map((product) => {
                    const status = getProductStatus(product);
                    const type = getProductType(product);

                    return (
                      <tr key={product.id} className="align-top">
                        <td className="px-5 py-4">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                              {product.image_url ? (
                                <div
                                  role="img"
                                  aria-label={product.name}
                                  className="h-full w-full bg-cover bg-center"
                                  style={{ backgroundImage: `url("${product.image_url}")` }}
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-[10px] font-medium text-slate-400">No Image</div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-900">{product.name}</p>
                              <p className="mt-1 truncate text-xs text-slate-500">{product.slug}</p>
                              <div className="mt-2">
                                <ProductTypeBadge type={type} />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-600">{categoryNameById.get(product.category_id ?? "") ?? "Uncategorized"}</td>
                        <td className="px-5 py-4 font-semibold text-[#615FFF]">{formatPrice(product.price)}</td>
                        <td className="px-5 py-4 text-slate-700">{product.moq}</td>
                        <td className="px-5 py-4">
                          <StatusBadge status={status} />
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {product.vendor_id ? vendorNameById.get(product.vendor_id) ?? "Assigned Vendor" : "Platform"}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end">
                            <Link
                              href={`/admin/products/${product.id}/edit`}
                              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
                            >
                              Edit Product
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
    </section>
  );
}
